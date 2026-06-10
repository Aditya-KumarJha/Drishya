import { monitorQueue } from '../monitor/monitor.queue.js';
import { getActiveMonitors } from "./monitor.service.js";

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
          await monitorQueue.add(
            'check-url',
            {
              monitorId: monitor._id.toString(),
              url: monitor.url,
              method: monitor.method,
            },
            {
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
