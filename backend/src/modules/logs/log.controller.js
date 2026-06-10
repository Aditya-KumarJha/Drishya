import Monitor from "../monitor/monitor.model.js";
import { getMonitorAnalytics, getMonitorLogs } from "./log.service.js";

const getAuthenticatedUserId = (req) => req.user?._id?.toString?.() || req.user?.userId || null;

const getOwnedMonitor = async (req, monitorId) =>
  Monitor.findOne({ _id: monitorId, userId: getAuthenticatedUserId(req) });

export const getMonitorAnalyticsController = async (req, res) => {
  try {
    const { monitorId } = req.params;
    const { range } = req.query; // ?range=1h or 24h
    const monitor = await getOwnedMonitor(req, monitorId);
    if (!monitor) {
      return res.status(404).json({ error: "Monitor not found" });
    }

    const data = await getMonitorAnalytics(monitorId, range);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getMonitorLogsController = async (req, res) => {
  try {
    const { monitorId } = req.params;
    const monitor = await getOwnedMonitor(req, monitorId);
    if (!monitor) {
      return res.status(404).json({ error: "Monitor not found" });
    }

    const logs = await getMonitorLogs(monitorId, req.query);
    res.json({ success: true, ...logs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
