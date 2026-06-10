import { getOpenIncident, createIncident, resolveIncident } from "./incident.service.js";
import { triggerAlert } from "../alert/alert.service.js";
import { processIncident } from "./incident.processor.ai.js";
import { emitIncidentCreated, emitIncidentResolved } from "../../sockets/socket.js";
import redis from "../../config/redis.js";
import Monitor from "../monitor/monitor.model.js";

const FAILURE_THRESHOLD = 3;
const getFailureKey = (monitorId) => `monitor:${monitorId}:failure-count`;

export const handleFailure = async (monitorId) => {
  const count = Number(await redis.incr(getFailureKey(monitorId)));
  await redis.expire(getFailureKey(monitorId), 60 * 60 * 24 * 7);
  await Monitor.findByIdAndUpdate(monitorId, {
    failureCount: count,
    lastStatus: "DOWN",
  });

  console.log(`⚠️ Failure count: ${count}`);

  if (count >= FAILURE_THRESHOLD) {
    const existing = await getOpenIncident(monitorId);

    if (!existing) {
      console.log("🚨 Incident Created");
      const newIncident = await createIncident({ monitorId, failCount: count });

      // 📡 Real-time incident notification
      emitIncidentCreated(monitorId, newIncident);

      // 🧠 AI TRIGGER (NEW)
      await processIncident(newIncident);

      await triggerAlert({
        monitorId,
        incident: newIncident,
      });
    }
  }
};

export const handleSuccess = async (monitorId) => {
  const hadFailure = Number(await redis.get(getFailureKey(monitorId)) || 0);
  await redis.del(getFailureKey(monitorId));
  await Monitor.findByIdAndUpdate(monitorId, {
    failureCount: 0,
    lastStatus: "UP",
  });

  if (hadFailure && hadFailure >= FAILURE_THRESHOLD) {
    console.log("✅ Incident Resolved");
    const resolved = await resolveIncident(monitorId);

    // 📡 Real-time resolution notification
    if (resolved) {
      emitIncidentResolved(monitorId, resolved);
    }
  }
};
