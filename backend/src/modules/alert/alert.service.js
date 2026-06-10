import Alert from "./alert.model.js";
import Incident from "../incident/incident.model.js";
import { sendEmailAlert } from "./email.service.js";
import AIInsight from "../ai/ai.model.js";
import { alertQueue } from "../../queues/alert.queue.js";
import Monitor from "../monitor/monitor.model.js";

const AI_WAIT_ATTEMPTS = 5;
const AI_WAIT_DELAY_MS = 2000;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const findLatestAIInsight = (incidentId) =>
  AIInsight.findOne({ incidentId }).sort({ createdAt: -1 });

const waitForAIInsight = async (incidentId) => {
  for (let attempt = 1; attempt <= AI_WAIT_ATTEMPTS; attempt += 1) {
    const insight = await findLatestAIInsight(incidentId);
    if (insight) return insight;

    if (attempt < AI_WAIT_ATTEMPTS) {
      await delay(AI_WAIT_DELAY_MS);
    }
  }

  return null;
};

/**
 * Enqueue an alert job to BullMQ (called from incident processor).
 * This makes alerting async — the actual processing happens in the alert worker.
 */
export const enqueueAlert = async ({ monitorId, incident }) => {
  await alertQueue.add(
    "send-alert",
    {
      monitorId: monitorId.toString(),
      incidentId: incident._id.toString(),
    },
    {
      attempts: 3,
      backoff: { type: "exponential", delay: 3000 },
      removeOnComplete: true,
      removeOnFail: false,
    }
  );
  console.log("📬 Alert job enqueued");
};

/**
 * Process an alert job (called from alert worker).
 * Fetches AI insight, sends email, and saves alert record.
 */
export const processAlertJob = async ({ monitorId, incidentId }) => {
  try {
    const incident = await Incident.findById(incidentId);
    if (!incident) {
      console.warn(`⚠️ Incident ${incidentId} not found, skipping alert`);
      return;
    }

    const monitor = await Monitor.findById(monitorId).populate("userId", "email fullName").lean();
    if (!monitor) {
      throw new Error(`Monitor ${monitorId} not found for alert`);
    }

    const ownerEmail = monitor.userId?.email;
    const recipient = process.env.ALERT_OVERRIDE_EMAIL || ownerEmail;
    if (!recipient) {
      throw new Error(`Monitor ${monitorId} owner email not found for alert`);
    }

    const ai = await waitForAIInsight(incident._id);

    // 🔥 SAFE SUGGESTION HANDLING
    const suggestions = Array.isArray(ai?.suggestion)
      ? ai.suggestion
      : ai?.suggestion
        ? [ai.suggestion]
        : [];

    const formattedSuggestions = suggestions.length
      ? suggestions.map((s, i) => `${i + 1}. ${s}`).join("\n")
      : "No suggestions available";

    // 🎯 SUBJECT
    const subject = ai
      ? `🚨 Website Down (${ai.status?.toUpperCase() || "UNKNOWN"})`
      : "🚨 Website Down";

    // 📩 EMAIL BODY
    const message = `
🚨 WEBSITE ALERT

🔗 Monitor: ${monitor.url}
🆔 Monitor ID: ${incident.monitorId}
❌ Failures: ${incident.failCount}

${
  ai
    ? `
🧠 AI ANALYSIS
Status: ${ai.status}

Reason:
${ai.reason}

Suggestions:
${formattedSuggestions}
`
    : "⚠️ AI analysis not available"
}
`;

    // 📤 SEND EMAIL
    await sendEmailAlert({
      to: recipient,
      subject,
      text: message,
    });

    // 💾 SAVE ALERT
    await Alert.create({
      monitorId,
      incidentId: incident._id,
      recipientEmail: recipient,
      status: "SENT",
      message,
      ai: ai
        ? {
            status: ai.status,
            reason: ai.reason,
            suggestion: suggestions
          }
        : null
    });

    console.log("🚨 Smart Alert sent");

  } catch (err) {
    console.error("❌ Alert failed:", err.message);

    await Alert.create({
      monitorId,
      incidentId,
      recipientEmail: null,
      status: "FAILED",
      message: err.message,
    });
  }
};

/**
 * Legacy sync trigger — kept for backward compat.
 * Prefer enqueueAlert for async processing.
 */
export const triggerAlert = async ({ monitorId, incident }) => {
  return enqueueAlert({ monitorId, incident });
};
