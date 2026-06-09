import Alert from "./alert.model.js";
import Monitor from "../monitor/monitor.model.js";

const getAuthenticatedUserId = (req) =>
  req.user?._id?.toString?.() || req.user?.userId || null;

const getUserMonitorIds = async (userId) => {
  const monitors = await Monitor.find({ userId }).select("_id").lean();
  return monitors.map((m) => m._id);
};

export const getAllAlerts = async (req, res) => {
  try {
    const monitorIds = await getUserMonitorIds(getAuthenticatedUserId(req));

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [alerts, total] = await Promise.all([
      Alert.find({ monitorId: { $in: monitorIds } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("monitorId", "url method")
        .populate("incidentId", "status failCount"),
      Alert.countDocuments({ monitorId: { $in: monitorIds } }),
    ]);

    res.json({
      success: true,
      count: alerts.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      data: alerts,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getAlertsByMonitor = async (req, res) => {
  try {
    const { monitorId } = req.params;
    const userId = getAuthenticatedUserId(req);

    const monitor = await Monitor.findOne({ _id: monitorId, userId });
    if (!monitor) {
      return res.status(404).json({ error: "Monitor not found" });
    }

    const alerts = await Alert.find({ monitorId })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("incidentId", "status failCount");

    res.json({ success: true, count: alerts.length, data: alerts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getAlertStats = async (req, res) => {
  try {
    const monitorIds = await getUserMonitorIds(getAuthenticatedUserId(req));

    const [total, sent, failed] = await Promise.all([
      Alert.countDocuments({ monitorId: { $in: monitorIds } }),
      Alert.countDocuments({ monitorId: { $in: monitorIds }, status: "SENT" }),
      Alert.countDocuments({ monitorId: { $in: monitorIds }, status: "FAILED" }),
    ]);

    res.json({
      success: true,
      data: { total, sent, failed },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
