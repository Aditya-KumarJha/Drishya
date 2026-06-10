import { publishToQueue } from "./broker/rabbitmq.broker.js";

const QUEUE_PREFIX = process.env.QUEUE_PREFIX || "DRISHYA";

export const QUEUES = {
  AUTH_OTP: `${QUEUE_PREFIX}.AUTH.OTP`,
  AUTH_USER_CREATED: `${QUEUE_PREFIX}.AUTH.USER_CREATED`,
  AUTH_USER_LOGGED_IN: `${QUEUE_PREFIX}.AUTH.USER_LOGGED_IN`,
  MONITOR_DOWN: `${QUEUE_PREFIX}.MONITOR.DOWN`,
  MONITOR_RECOVERED: `${QUEUE_PREFIX}.MONITOR.RECOVERED`,
  INCIDENT_CREATED: `${QUEUE_PREFIX}.INCIDENT.CREATED`,
  CREDITS_PURCHASED: `${QUEUE_PREFIX}.CREDITS.PURCHASED`,
  CREDITS_EXHAUSTED: `${QUEUE_PREFIX}.CREDITS.EXHAUSTED`,
};

export const publishNotificationEvent = async (queueName, payload) => {
  try {
    await publishToQueue(queueName, payload);
  } catch (error) {
    console.warn(`Notification event skipped for ${queueName}:`, error.message);
  }
};
