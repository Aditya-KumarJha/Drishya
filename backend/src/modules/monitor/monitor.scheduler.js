import { monitorQueue } from '../monitor/monitor.queue.js';
import { getActiveMonitors } from "./monitor.service.js";
import redis from "../../config/redis.js";

const buildScheduleLockKey = (monitorId) => `monitor:${monitorId}:schedule-lock`;

export const startScheduler = () => {
  console.log('🟢 Scheduler started...');

  let lastRunMap = new Map();

  setInterval(async () => {
    try {
      const monitors = await getActiveMonitors();

      for (const monitor of monitors) {
        const now = Date.now();
        const id = monitor._id.toString();

        const lastRun = lastRunMap.get(id) || 0;

        if (now - lastRun >= monitor.interval) {
          const lockSeconds = Math.max(10, Math.ceil((monitor.interval || 60000) / 1000) - 1);
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
              jobId: `check-${id}-${Math.floor(now / Math.max(monitor.interval || 60000, 30000))}`,
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
};

export const getQueue = () => monitorQueue;
