import Monitor from "./monitor.model.js";

export const createMonitor = async (payload) => {
  return await Monitor.create(payload);
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
    { new: true }
  );
};

// 🔥 DELETE
export const deleteMonitorById = async (id, userId) => {
  return await Monitor.findOneAndDelete({ _id: id, userId });
};