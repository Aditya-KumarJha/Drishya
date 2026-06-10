import express from "express";
import Monitor from "../monitor/monitor.model.js";
import Log from "../logs/log.model.js";
import Incident from "../incident/incident.model.js";
import { getMonitorAnalytics } from "../logs/log.service.js";
import Project from "../project/project.model.js";

const router = express.Router();

router.get("/project/:slug", async (req, res) => {
  try {
    const project = await Project.findOne({
      publicSlug: req.params.slug,
      publicStatusEnabled: true,
    }).select("name description publicSlug createdAt").lean();

    if (!project) {
      return res.status(404).json({ error: "Status page not found" });
    }

    const monitors = await Monitor.find({
      projectId: project._id,
      publicStatusEnabled: true,
    }).select("url method interval lastStatus lastCheckedAt lastResponseTime publicSlug groupName sslDaysRemaining sslExpiresAt dnsResolvedAddresses").lean();

    const monitorStatuses = await Promise.all(monitors.map(async (monitor) => ({
      monitor,
      analytics: await getMonitorAnalytics(monitor._id.toString(), "24h"),
      openIncident: await Incident.findOne({ monitorId: monitor._id, status: "OPEN" }).sort({ createdAt: -1 }).lean(),
    })));

    const totalChecks = monitorStatuses.reduce((sum, item) => sum + item.analytics.totalChecks, 0);
    const successes = monitorStatuses.reduce((sum, item) => sum + item.analytics.success, 0);
    const uptime = totalChecks ? Number(((successes / totalChecks) * 100).toFixed(2)) : 0;

    res.json({
      success: true,
      data: {
        project,
        uptime,
        monitorCount: monitors.length,
        openIncidentCount: monitorStatuses.filter((item) => item.openIncident).length,
        monitors: monitorStatuses,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:slug", async (req, res) => {
  try {
    const monitor = await Monitor.findOne({
      publicSlug: req.params.slug,
      publicStatusEnabled: true,
    }).select("url method interval lastStatus lastCheckedAt lastResponseTime publicSlug createdAt sslDaysRemaining sslExpiresAt dnsResolvedAddresses groupName checkTypes regions");

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
