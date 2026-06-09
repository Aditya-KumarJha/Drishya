import { Worker } from "bullmq";
import axios from "axios";
import { connection } from "../config/redis.js";
import Log from "../modules/logs/log.model.js";
import { handleFailure, handleSuccess } from "../modules/incident/incident.processor.js";
import { emitMonitorStatus } from "../sockets/socket.js";

export const startBullWorker = () => {
  const worker = new Worker(
    "monitor-queue",
    async (job) => {
      const { monitorId, url, method } = job.data;

      let success = false;
      let latency = 0;

      try {
        const start = Date.now();

        const res = await axios({
          url,
          method,
          timeout: 5000
        });

        latency = Date.now() - start;
        success = true;

        await Log.create({
          monitorId,
          status: res.status,
          responseTime: latency,
          success: true
        });

        console.log(`✅ ${url} (${latency}ms)`);

        // 📡 Real-time status push
        emitMonitorStatus(monitorId, {
          success: true,
          status: res.status,
          latency,
          url,
        });

         await handleSuccess(monitorId);

      } catch (err) {
        latency = 0;
        success = false;

        const errorStatus = err.response?.status || 500;

        await Log.create({
          monitorId,
          status: errorStatus,
          responseTime: latency,
          success: false
        });

        console.log(`❌ Failed: ${url} - ${err.message}`);

        // 📡 Real-time status push
        emitMonitorStatus(monitorId, {
          success: false,
          status: errorStatus,
          latency,
          url,
          error: err.message,
        });

          // 🔥 FAILURE → INCIDENT COUNT
        await handleFailure(monitorId);
      }
    },
    {
      connection,
      concurrency: 5
    }
  );

  console.log("🟢 BullMQ Worker started...");
};