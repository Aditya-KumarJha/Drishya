import Log from "./log.model.js";

export const createLog = async (data) => {
  return Log.create(data);
};

export const getLogsByMonitorId = async (monitorId, { limit = 50, lean = true } = {}) => {
  const query = Log.find({ monitorId }).sort({ createdAt: -1 }).limit(limit);
  return lean ? query.lean() : query;
};

export const getRecentLogs = async (monitorId, count = 30) => {
  return Log.find({ monitorId }).sort({ createdAt: -1 }).limit(count).lean();
};

export const countLogs = async (filter = {}) => {
  return Log.countDocuments(filter);
};

export const countSuccessLogs = async (filter = {}) => {
  return Log.countDocuments({ ...filter, success: true });
};
