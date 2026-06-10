import express from "express";
import Monitor from "../monitor/monitor.model.js";
import Log from "../logs/log.model.js";
import Incident from "../incident/incident.model.js";
import Alert from "../alert/alert.model.js";
import AIInsight from "../ai/ai.model.js";
import { getMonitorAnalytics } from "../logs/log.service.js";
import { protect } from "../auth/auth.middleware.js";
import { sendEmail } from "../notification/email.resend.js";

const router = express.Router();

const getUserId = (req) => req.user?._id?.toString?.() || req.user?.userId || null;
const allowedRanges = new Set(["24h", "7d", "30d"]);

const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

const buildSimplePdf = (title, lines) => {
  const text = [title, "", ...lines].join("\n").replace(/[()\\]/g, "\\$&");
  const stream = `BT /F1 11 Tf 48 780 Td 14 TL (${text}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let body = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(body.length);
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    body += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  body += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(body);
};

const getOwnedIncidentBundle = async (req, incidentId) => {
  const monitorIds = await Monitor.find({ userId: getUserId(req) }).select("_id").lean();
  const incident = await Incident.findOne({
    _id: incidentId,
    monitorId: { $in: monitorIds.map((monitor) => monitor._id) },
  }).populate("monitorId", "url method groupName").lean();

  if (!incident) return null;

  const [alerts, aiInsights, logs] = await Promise.all([
    Alert.find({ incidentId: incident._id }).sort({ createdAt: 1 }).lean(),
    AIInsight.find({ incidentId: incident._id }).sort({ createdAt: 1 }).lean(),
    Log.find({ monitorId: incident.monitorId._id, createdAt: { $gte: incident.startedAt } }).sort({ createdAt: 1 }).limit(100).lean(),
  ]);

  return { incident, alerts, aiInsights, logs };
};

const buildIncidentTimeline = ({ incident, alerts, aiInsights, logs }) => {
  const events = [
    {
      type: "INCIDENT_CREATED",
      label: "Incident created",
      at: incident.startedAt || incident.createdAt,
      detail: `${incident.failCount || 0} consecutive failures detected`,
    },
    ...alerts.map((alert) => ({
      type: alert.status === "SENT" ? "ALERT_SENT" : "ALERT_FAILED",
      label: alert.status === "SENT" ? "Alert sent" : "Alert failed",
      at: alert.createdAt,
      detail: alert.recipientEmail || alert.message,
    })),
    ...aiInsights.map((insight) => ({
      type: "AI_GENERATED",
      label: "AI generated",
      at: insight.createdAt,
      detail: insight.headline || insight.reason || insight.status,
    })),
    ...logs.filter((log) => !log.success).slice(0, 10).map((log) => ({
      type: "CHECK_FAILED",
      label: `${log.checkType || "HTTP"} check failed`,
      at: log.checkedAt || log.createdAt,
      detail: log.error || `Status ${log.status}`,
    })),
  ];

  if (incident.status === "RESOLVED") {
    events.push({
      type: "INCIDENT_RESOLVED",
      label: "Incident resolved",
      at: incident.resolvedAt || incident.updatedAt,
      detail: incident.message || "Monitor recovered",
    });
  }

  return events.sort((a, b) => new Date(a.at) - new Date(b.at));
};

const buildPostmortem = ({ incident, aiInsights, alerts, logs }) => {
  const latestAi = aiInsights.at(-1);
  const failedLogs = logs.filter((log) => !log.success);
  return {
    title: `Postmortem for ${incident.monitorId?.url || incident.monitorId}`,
    status: incident.status,
    startedAt: incident.startedAt,
    resolvedAt: incident.resolvedAt,
    summary: latestAi?.headline || latestAi?.reason || "Incident was detected from monitor failure telemetry.",
    impact: `${failedLogs.length} failed checks recorded during the captured incident window.`,
    rootCause: latestAi?.reason || latestAi?.explanation || "Root cause requires operator confirmation.",
    resolution: latestAi?.solutionSummary || incident.message || "Resolution details not recorded yet.",
    alertCount: alerts.length,
    recommendedActions: latestAi?.suggestion || [],
  };
};

router.use(protect);

router.get("/uptime", async (req, res) => {
  try {
    const range = allowedRanges.has(req.query.range) ? req.query.range : "24h";
    const filter = { userId: getUserId(req) };
    if (req.query.projectId) filter.projectId = req.query.projectId;

    const monitors = await Monitor.find(filter).sort({ createdAt: -1 }).lean();
    const rows = await Promise.all(monitors.map(async (monitor) => ({
      monitor,
      analytics: await getMonitorAnalytics(monitor._id.toString(), range),
    })));
    const totalChecks = rows.reduce((sum, row) => sum + row.analytics.totalChecks, 0);
    const success = rows.reduce((sum, row) => sum + row.analytics.success, 0);

    res.json({
      success: true,
      data: {
        range,
        uptime: totalChecks ? Number(((success / totalChecks) * 100).toFixed(2)) : 0,
        totalChecks,
        monitors: rows,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/incidents/:id/timeline", async (req, res) => {
  const bundle = await getOwnedIncidentBundle(req, req.params.id);
  if (!bundle) return res.status(404).json({ error: "Incident not found" });
  res.json({ success: true, data: buildIncidentTimeline(bundle) });
});

router.get("/incidents/:id/postmortem", async (req, res) => {
  const bundle = await getOwnedIncidentBundle(req, req.params.id);
  if (!bundle) return res.status(404).json({ error: "Incident not found" });
  res.json({ success: true, data: buildPostmortem(bundle) });
});

router.get("/incidents/:id/export.csv", async (req, res) => {
  const bundle = await getOwnedIncidentBundle(req, req.params.id);
  if (!bundle) return res.status(404).json({ error: "Incident not found" });

  const rows = [
    ["type", "time", "detail"],
    ...buildIncidentTimeline(bundle).map((event) => [event.type, event.at, event.detail]),
  ];
  const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="incident-${req.params.id}.csv"`);
  res.send(csv);
});

router.get("/incidents/:id/export.pdf", async (req, res) => {
  const bundle = await getOwnedIncidentBundle(req, req.params.id);
  if (!bundle) return res.status(404).json({ error: "Incident not found" });

  const postmortem = buildPostmortem(bundle);
  const timeline = buildIncidentTimeline(bundle);
  const pdf = buildSimplePdf(postmortem.title, [
    `Status: ${postmortem.status}`,
    `Summary: ${postmortem.summary}`,
    `Root cause: ${postmortem.rootCause}`,
    `Resolution: ${postmortem.resolution}`,
    "",
    "Timeline:",
    ...timeline.map((event) => `${new Date(event.at).toISOString()} - ${event.label}: ${event.detail}`),
  ]);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="incident-${req.params.id}.pdf"`);
  res.send(pdf);
});

router.post("/incidents/:id/email", async (req, res) => {
  const bundle = await getOwnedIncidentBundle(req, req.params.id);
  if (!bundle) return res.status(404).json({ error: "Incident not found" });

  const recipient = req.user?.email;
  if (!recipient) return res.status(400).json({ error: "Logged-in user email not found" });

  const postmortem = buildPostmortem(bundle);
  const timeline = buildIncidentTimeline(bundle);
  const html = `
    <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.6">
      <h1 style="margin:0 0 8px">Drishya incident report</h1>
      <p><strong>${postmortem.title}</strong></p>
      <p><strong>Status:</strong> ${postmortem.status}</p>
      <p><strong>Summary:</strong> ${postmortem.summary}</p>
      <p><strong>Root cause:</strong> ${postmortem.rootCause}</p>
      <p><strong>Resolution:</strong> ${postmortem.resolution}</p>
      <h2>Timeline</h2>
      <ul>
        ${timeline.map((event) => `<li><strong>${new Date(event.at).toLocaleString()}</strong> - ${event.label}: ${event.detail}</li>`).join("")}
      </ul>
    </div>
  `;

  const response = await sendEmail(
    recipient,
    `Drishya incident report - ${postmortem.status}`,
    `${postmortem.title}\n\n${postmortem.summary}\n\n${timeline.map((event) => `${event.at} - ${event.label}: ${event.detail}`).join("\n")}`,
    html
  );

  if (!response) return res.status(500).json({ error: "Unable to send report email" });
  res.json({ success: true, message: "Incident report emailed" });
});

export default router;
