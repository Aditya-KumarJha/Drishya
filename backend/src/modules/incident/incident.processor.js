import { getOpenIncident, createIncident, resolveIncident } from "./incident.service.js";
import { triggerAlert } from "../alert/alert.service.js";
import { processIncident } from "./incident.processor.ai.js";
import { emitIncidentCreated, emitIncidentResolved } from "../../sockets/socket.js";

const FAILURE_THRESHOLD = 3;

// in-memory tracker (simple version)
const failureMap = new Map();

export const handleFailure = async (monitorId) => {
  const count = (failureMap.get(monitorId) || 0) + 1;
  failureMap.set(monitorId, count);

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
  const hadFailure = failureMap.get(monitorId);

  if (hadFailure && hadFailure >= FAILURE_THRESHOLD) {
    console.log("✅ Incident Resolved");
    const resolved = await resolveIncident(monitorId);

    // 📡 Real-time resolution notification
    if (resolved) {
      emitIncidentResolved(monitorId, resolved);
    }
  }

  // reset counter
  failureMap.set(monitorId, 0);
};