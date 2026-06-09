import Monitor from "../monitor/monitor.model.js";
import Log from "../logs/log.model.js";
import Incident from "../incident/incident.model.js";
import AIInsight from "../ai/ai.model.js";

const getAuthenticatedUserId = (req) => req.user?._id?.toString?.() || req.user?.userId || null;

const getOwnedMonitor = async (req, monitorId) => {
  const userId = getAuthenticatedUserId(req);
  return Monitor.findOne({ _id: monitorId, userId });
};

export const getDashboardSummary = async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);

    // 1. Get the IDs of monitors belonging to this user
    const userMonitors = await Monitor.find({ userId }).select("_id");
    const monitorIds = userMonitors.map(m => m._id);

    // 2. Calculate stats based on those IDs
    const totalMonitors = monitorIds.length;
    
    const activeIncidents = await Incident.countDocuments({
      monitorId: { $in: monitorIds },
      status: "OPEN"
    });

    const totalLogs = await Log.countDocuments({ 
      monitorId: { $in: monitorIds } 
    });

    const successLogs = await Log.countDocuments({
      monitorId: { $in: monitorIds },
      success: true
    });

    const uptime = totalLogs
      ? ((successLogs / totalLogs) * 100).toFixed(2)
      : 0;

    // 3. Send response
    res.json({
      totalMonitors,
      activeIncidents,
      uptime
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
export const getAllMonitorsDashboard = async (req, res) => {
  try {
    const monitors = await Monitor.find({
      userId: getAuthenticatedUserId(req)
    }).sort({ createdAt: -1 });

    res.json(monitors);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getIncidentTimeline = async (req, res) => {
  try {
    const { monitorId } = req.params;
    const monitor = await getOwnedMonitor(req, monitorId);

    if (!monitor) {
      return res.status(404).json({ error: "Monitor not found" });
    }

    const incidents = await Incident.find({ monitorId })
      .sort({ createdAt: -1 });

    res.json(incidents);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getAIInsights = async (req, res) => {
  try {
    const { monitorId } = req.params;
    const monitor = await getOwnedMonitor(req, monitorId);

    if (!monitor) {
      return res.status(404).json({ error: "Monitor not found" });
    }

    const insights = await AIInsight.find({ monitorId })
      .sort({ createdAt: -1 });

    res.json(insights);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getMonitorAnalytics = async (req, res) => {
  try {
    const { monitorId } = req.params;
    const monitor = await getOwnedMonitor(req, monitorId);

    if (!monitor) {
      return res.status(404).json({ error: "Monitor not found" });
    }

    const logs = await Log.find({ monitorId })
      .sort({ createdAt: -1 })
      .limit(50);

    const latency = logs.map(l => l.responseTime);
    const successRate = logs.filter(l => l.success).length;

    res.json({
      totalChecks: logs.length,
      successRate,
      latency
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
