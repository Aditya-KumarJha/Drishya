import Monitor from "../monitor/monitor.model.js";
import Incident from "../incident/incident.model.js";
import Log from "../logs/log.model.js";
import User from "../auth/models/user.model.js";
import mongoose from "mongoose";

// ───────────────────────── SYSTEM OVERVIEW ─────────────────────────

export const getAdminSummary = async () => {
  const totalMonitors = await Monitor.countDocuments();
  const activeMonitors = await Monitor.countDocuments({ active: true });
  const activeIncidents = await Incident.countDocuments({ status: "OPEN" });
  const totalLogs = await Log.countDocuments();
  const successLogs = await Log.countDocuments({ success: true });
  const totalUsers = await User.countDocuments();
  const activeUsers = await User.countDocuments({ isActive: true });

  return {
    totalMonitors,
    activeMonitors,
    pausedMonitors: Math.max(totalMonitors - activeMonitors, 0),
    activeIncidents,
    uptime: totalLogs ? Number(((successLogs / totalLogs) * 100).toFixed(2)) : 0,
    totalUsers,
    activeUsers,
    inactiveUsers: Math.max(totalUsers - activeUsers, 0),
  };
};

export const getAdminMonitors = async () => {
  return Monitor.find().sort({ createdAt: -1 }).populate("userId", "email username fullName").lean();
};

// ───────────────────────── USER MANAGEMENT ─────────────────────────

export const getAllUsers = async ({ page = 1, limit = 20, search = "" } = {}) => {
  const filter = {};
  if (search) {
    filter.$or = [
      { email: { $regex: search, $options: "i" } },
      { username: { $regex: search, $options: "i" } },
      { "fullName.firstName": { $regex: search, $options: "i" } },
      { "fullName.lastName": { $regex: search, $options: "i" } },
    ];
  }

  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    User.find(filter)
      .select("-passwordHash")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  return {
    users,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

export const toggleUserStatus = async (userId) => {
  const user = await User.findById(userId);
  if (!user) return null;

  user.isActive = !user.isActive;
  await user.save();
  return { id: user._id, email: user.email, isActive: user.isActive };
};

export const updateUserRole = async (userId, newRole) => {
  const validRoles = ["user", "admin"];
  if (!validRoles.includes(newRole)) {
    throw new Error(`Invalid role: ${newRole}. Must be one of: ${validRoles.join(", ")}`);
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { role: newRole },
    { new: true }
  ).select("-passwordHash");

  return user;
};

// ───────────────────────── INCIDENT MANAGEMENT ─────────────────────

export const getAllIncidentsAdmin = async ({ page = 1, limit = 20, status = "" } = {}) => {
  const filter = {};
  if (status === "OPEN" || status === "RESOLVED") {
    filter.status = status;
  }

  const skip = (page - 1) * limit;

  const [incidents, total] = await Promise.all([
    Incident.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("monitorId", "url method userId")
      .lean(),
    Incident.countDocuments(filter),
  ]);

  return {
    incidents,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

export const resolveIncidentAdmin = async (incidentId) => {
  const incident = await Incident.findOneAndUpdate(
    { _id: incidentId, status: "OPEN" },
    { status: "RESOLVED", resolvedAt: new Date() },
    { new: true }
  );
  return incident;
};

// ───────────────────────── SYSTEM ANALYTICS ─────────────────────────

export const getSystemAnalytics = async () => {
  const now = new Date();
  const last24h = new Date(now - 24 * 60 * 60 * 1000);
  const last7d = new Date(now - 7 * 24 * 60 * 60 * 1000);

  // Overall stats
  const [totalLogs24h, successLogs24h, totalLogs7d, successLogs7d] = await Promise.all([
    Log.countDocuments({ createdAt: { $gte: last24h } }),
    Log.countDocuments({ createdAt: { $gte: last24h }, success: true }),
    Log.countDocuments({ createdAt: { $gte: last7d } }),
    Log.countDocuments({ createdAt: { $gte: last7d }, success: true }),
  ]);

  // Average latency
  const [latencyResult] = await Log.aggregate([
    { $match: { createdAt: { $gte: last24h }, success: true } },
    { $group: { _id: null, avg: { $avg: "$responseTime" }, p95: { $percentile: { input: "$responseTime", p: [0.95], method: "approximate" } } } },
  ]).catch(() => [null]);

  // Top 5 failing monitors
  const topFailing = await Log.aggregate([
    { $match: { createdAt: { $gte: last7d }, success: false } },
    { $group: { _id: "$monitorId", failCount: { $sum: 1 } } },
    { $sort: { failCount: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: "monitors",
        localField: "_id",
        foreignField: "_id",
        as: "monitor",
      },
    },
    { $unwind: { path: "$monitor", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        monitorId: "$_id",
        url: "$monitor.url",
        method: "$monitor.method",
        failCount: 1,
      },
    },
  ]);

  // Incident stats
  const [openIncidents, resolvedLast7d] = await Promise.all([
    Incident.countDocuments({ status: "OPEN" }),
    Incident.countDocuments({ status: "RESOLVED", resolvedAt: { $gte: last7d } }),
  ]);

  return {
    last24h: {
      totalChecks: totalLogs24h,
      successRate: totalLogs24h ? Number(((successLogs24h / totalLogs24h) * 100).toFixed(2)) : 0,
      failureRate: totalLogs24h ? Number((((totalLogs24h - successLogs24h) / totalLogs24h) * 100).toFixed(2)) : 0,
      avgLatency: Math.round(latencyResult?.avg || 0),
    },
    last7d: {
      totalChecks: totalLogs7d,
      successRate: totalLogs7d ? Number(((successLogs7d / totalLogs7d) * 100).toFixed(2)) : 0,
    },
    topFailingMonitors: topFailing,
    incidents: {
      open: openIncidents,
      resolvedLast7d,
    },
  };
};
