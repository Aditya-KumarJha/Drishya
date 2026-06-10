import express from "express";
import Monitor from "../monitor/monitor.model.js";
import Log from "../logs/log.model.js";
import Incident from "../incident/incident.model.js";
import { getMonitorAnalytics } from "../logs/log.service.js";

const router = express.Router();

router.get("/:slug", async (req, res) => {
  try {
    const monitor = await Monitor.findOne({
      publicSlug: req.params.slug,
      publicStatusEnabled: true,
    }).select("url method interval lastStatus lastCheckedAt lastResponseTime publicSlug createdAt");

    if (!monitor) {
      return res.status(404).json({ error: "Status page not found" });
    }

    const [analytics, recentLogs, openIncident] = await Promise.all([
      getMonitorAnalytics(monitor._id.toString(), "24h"),
      Log.find({ monitorId: monitor._id }).sort({ createdAt: -1 }).limit(20).lean(),
      Incident.findOne({ monitorId: monitor._id, status: "OPEN" }).sort({ createdAt: -1 }).lean(),
    ]);

    res.json({
      success: true,
      data: {
        monitor,
        analytics,
        recentLogs,
        openIncident,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
