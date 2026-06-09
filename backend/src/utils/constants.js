export const FAILURE_THRESHOLD = 3;
export const SCHEDULER_POLL_MS = 5000;
export const LOG_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export const INCIDENT_STATUS = {
  OPEN: "OPEN",
  RESOLVED: "RESOLVED",
};

export const ALERT_TYPE = {
  EMAIL: "EMAIL",
  WEBHOOK: "WEBHOOK",
};

export const ALERT_STATUS = {
  PENDING: "PENDING",
  SENT: "SENT",
  FAILED: "FAILED",
};

export const MONITOR_STATE = {
  UP: "UP",
  DOWN: "DOWN",
};

export const AI_SOURCE = {
  INCIDENT: "INCIDENT",
  ON_DEMAND: "ON_DEMAND",
};

export const QUEUE_NAMES = {
  MONITOR: "monitor-queue",
  ALERT: "alert-queue",
  AI: "ai-queue",
};
