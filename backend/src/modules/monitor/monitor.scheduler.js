import Monitor from './monitor.model.js';
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

        // ✅ INTERVAL CONTROL
        if (now - lastRun >= monitor.interval) {
          const job = {
            monitorId: monitor._id,
            url: monitor.url,
            method: monitor.method,
            createdAt: new Date(),
          };

          await monitorQueue.add(
            'check-url',
            {
              monitorId: monitor._id.toString(),
              url: monitor.url,
              method: monitor.method,
            },
            {
              attempts: 3, // 🔥 retry built-in
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
  }, 5000); // every 5 sec (testing ke liye fast rakha hai)
};

// 🔥 queue export karenge worker ke liye
export const getQueue = () => monitorQueue;
