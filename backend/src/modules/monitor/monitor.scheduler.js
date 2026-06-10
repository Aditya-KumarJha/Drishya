import { monitorQueue } from '../monitor/monitor.queue.js';
import { getActiveMonitors } from "./monitor.service.js";
import redis from "../../config/redis.js";

const buildScheduleLockKey = (monitorId) => `monitor:${monitorId}:schedule-lock`;

const matchesCronPart = (part, value) => {
  if (part === "*") return true;
  if (part.startsWith("*/")) {
    const step = Number(part.slice(2));
    return Number.isFinite(step) && step > 0 && value % step === 0;
  }
  return part.split(",").some((piece) => {
    if (piece.includes("-")) {
      const [start, end] = piece.split("-").map(Number);
      return value >= start && value <= end;
    }
    return Number(piece) === value;
  });
};

const isCronDue = (expression, date = new Date()) => {
  if (!expression) return false;
  const [minute, hour, dayOfMonth, month, dayOfWeek] = expression.trim().split(/\s+/);
  if (!dayOfWeek) return false;

  return (
    matchesCronPart(minute, date.getMinutes()) &&
    matchesCronPart(hour, date.getHours()) &&
    matchesCronPart(dayOfMonth, date.getDate()) &&
    matchesCronPart(month, date.getMonth() + 1) &&
    matchesCronPart(dayOfWeek, date.getDay())
  );
};

export const startScheduler = () => {
  console.log('🟢 Scheduler started...');

  let lastRunMap = new Map();

  const timer = setInterval(async () => {
    try {
      const monitors = await getActiveMonitors();

      for (const monitor of monitors) {
        const now = Date.now();
        const id = monitor._id.toString();

        const lastRun = lastRunMap.get(id) || 0;

        const cronDue = monitor.cronExpression && isCronDue(monitor.cronExpression);
        const intervalDue = !monitor.cronExpression && now - lastRun >= monitor.interval;

        if (cronDue || intervalDue) {
          const lockSeconds = monitor.cronExpression
            ? 59
            : Math.max(10, Math.ceil((monitor.interval || 60000) / 1000) - 1);
          const lock = await redis.set(buildScheduleLockKey(id), String(now), 'EX', lockSeconds, 'NX');
          if (lock !== 'OK') {
            continue;
          }

          await monitorQueue.add(
            'check-url',
            {
              monitorId: monitor._id.toString(),
            },
            {
              jobId: monitor.cronExpression
                ? `check-${id}-${new Date(now).toISOString().slice(0, 16)}`
                : `check-${id}-${Math.floor(now / Math.max(monitor.interval || 60000, 30000))}`,
              attempts: 3,
              backoff: {
                type: 'exponential',
                delay: 2000,
              },
              removeOnComplete: true,
              removeOnFail: false,
            }
          );

           lastRunMap.set(id, now);

          console.log('📦 Job queued (BullMQ):', monitor.url);
        }
      }
    } catch (error) {
      console.error('❌ Scheduler error:', error.message);
    }
  }, 5000);

  return {
    close() {
      clearInterval(timer);
      lastRunMap.clear();
    },
  };
};

export const getQueue = () => monitorQueue;
