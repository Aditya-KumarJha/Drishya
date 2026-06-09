import { Queue } from "bullmq";
import { connection } from "../../config/redis.js";
import { buildMonitorInsight } from "../ai/ai.service.js";

const aiQueue = new Queue("ai-queue", { connection });

/**
 * Enqueue AI processing for an incident.
 * Falls back to inline processing if queue fails.
 */
export const processIncident = async (incident) => {
  try {
    console.log("🧠 AI job enqueued for incident...");

    await aiQueue.add(
      "analyze-incident",
      {
        monitorId: incident.monitorId.toString(),
        incidentId: incident._id.toString(),
        source: "INCIDENT",
      },
      {
        attempts: 2,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      }
    );
  } catch (err) {
    // Fallback: run inline if queue fails
    console.warn("⚠️ AI queue failed, running inline:", err.message);
    try {
      await buildMonitorInsight({
        monitorId: incident.monitorId,
        incidentId: incident._id,
        source: "INCIDENT",
        forceRefresh: true,
      });
      console.log("✅ AI Insight saved (inline fallback)");
    } catch (innerErr) {
      console.error("❌ AI Processing Failed:", innerErr.message);
    }
  }
};
