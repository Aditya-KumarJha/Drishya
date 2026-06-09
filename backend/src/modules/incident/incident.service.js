import Incident from "./incident.model.js";

export const createIncident = async ({ monitorId, failCount }) => {
  return await Incident.create({
    monitorId,
    failCount,
    message: `Monitor failed ${failCount} times`,
  });
};

export const resolveIncident = async (monitorId) => {
  return await Incident.findOneAndUpdate(
    { monitorId, status: "OPEN" },
    {
      status: "RESOLVED",
      resolvedAt: new Date(),
    },
    { new: true }
  );
};

export const getOpenIncident = async (monitorId) => {
  return await Incident.findOne({
    monitorId,
    status: "OPEN",
  });
};