// src/modules/log/log.service.js
import mongoose from "mongoose";
import Log from "./log.model.js";

export const getMonitorAnalytics = async (monitorId, range = "24h") => {
  // ⏱ time window
  const now = new Date();
  let from = new Date(now - 24 * 60 * 60 * 1000); // default 24h
  if (range === "1h") from = new Date(now - 60 * 60 * 1000);

  const result = await Log.aggregate([
    {
      $match: {
        monitorId: new mongoose.Types.ObjectId(monitorId),           // dev me string match
        // createdAt: { $gte: from }       // time filter
      }
    },

    {
      $facet: {
        // 1) SUMMARY
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

        // 2) TIME-SERIES (5 min buckets)
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

        // 3) LATEST STATUS
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

  // 🧮 uptime %
  const uptime =
    summary.totalChecks === 0
      ? 0
      : ((summary.success / summary.totalChecks) * 100).toFixed(2);

  // 📡 latest status
  const latestStatus =
    data.latest[0]?.success === false ? "DOWN" : "UP";

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