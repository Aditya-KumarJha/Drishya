import Monitor from "./monitor.model.js";
import { monitorQueue } from "./monitor.queue.js";

export const createMonitor = async (payload) => {
  const monitor = await Monitor.create(payload);
  if (monitor.active !== false) {
    await monitorQueue.add(
      "check-url",
      { monitorId: monitor._id.toString() },
      {
        jobId: `initial-check-${monitor._id}-${Date.now()}`,
        attempts: 2,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: true,
        removeOnFail: false,
      }
    );
  }
  return monitor;
};

export const getActiveMonitors = async () => {
  return await Monitor.find({ active: true });
};

// 🔥 GET ALL
export const getAllMonitors = async (userId) => {
  return await Monitor.find({ userId }).sort({ createdAt: -1 });
};

// ✅ ADMIN GET ALL
export const getAllMonitorsAdmin = async () => {
  return await Monitor.find().sort({ createdAt: -1 });
};

// 🔥 UPDATE
export const updateMonitorById = async (id, userId, data) => {
  return await Monitor.findOneAndUpdate(
    { _id: id, userId },
    data,
    { new: true, runValidators: true }
  );
};

// 🔥 DELETE
export const deleteMonitorById = async (id, userId) => {
  return await Monitor.findOneAndDelete({ _id: id, userId });
};
