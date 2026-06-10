// src/modules/log/log.service.js
import mongoose from "mongoose";
import Log from "./log.model.js";

export const getMonitorAnalytics = async (monitorId, range = "24h") => {
  const now = new Date();
  let from = new Date(now - 24 * 60 * 60 * 1000);
  if (range === "1h") from = new Date(now - 60 * 60 * 1000);
  if (range === "7d") from = new Date(now - 7 * 24 * 60 * 60 * 1000);
  if (range === "30d") from = new Date(now - 30 * 24 * 60 * 60 * 1000);

  const result = await Log.aggregate([
    {
      $match: {
        monitorId: new mongoose.Types.ObjectId(monitorId),
        createdAt: { $gte: from },
      }
    },

    {
      $facet: {
        summary: [
          {
            $group: {
              _id: "$monitorId",
              totalChecks: { $sum: 1 },
              avgLatency: { $avg: "$responseTime" },
              success: {
                $sum: { $cond: [{ $eq: ["$success", true] }, 1, 0] }
              },
              failures: {
                $sum: { $cond: [{ $eq: ["$success", false] }, 1, 0] }
              }
            }
          }
        ],

        timeseries: [
          {
            $group: {
              _id: {
                $dateToString: {
                  format: "%H:%M",
                  date: "$createdAt"
                }
              },
              avgLatency: { $avg: "$responseTime" }
            }
          },
          { $sort: { _id: 1 } }
        ],

        latest: [
          { $sort: { createdAt: -1 } },
          { $limit: 1 }
        ]
      }
    }
  ]);

  const data = result[0];

  const summary = data.summary[0] || {
    totalChecks: 0,
    avgLatency: 0,
    success: 0,
    failures: 0
  };

  const uptime =
    summary.totalChecks === 0
      ? 0
      : ((summary.success / summary.totalChecks) * 100).toFixed(2);

  const latestStatus =
    !data.latest[0] ? "PENDING" : data.latest[0].success === false ? "DOWN" : "UP";

  return {
    uptime,
    avgLatency: Math.round(summary.avgLatency || 0),
    totalChecks: summary.totalChecks,
    success: summary.success,
    failures: summary.failures,
    status: latestStatus,
    trend: data.timeseries.map((t) => ({
      time: t._id,
      latency: Math.round(t.avgLatency)
    }))
  };
};

export const getMonitorLogs = async (monitorId, { page = 1, limit = 25 } = {}) => {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 25));
  const skip = (safePage - 1) * safeLimit;

  const filter = { monitorId };
  const [logs, total] = await Promise.all([
    Log.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),
    Log.countDocuments(filter),
  ]);

  return {
    data: logs,
    page: safePage,
    total,
    totalPages: Math.ceil(total / safeLimit),
  };
};
