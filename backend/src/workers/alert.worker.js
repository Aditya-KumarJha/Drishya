import { Worker } from "bullmq";
import { connection } from "../config/redis.js";
import { processAlertJob } from "../modules/alert/alert.service.js";

export const startAlertWorker = () => {
  const worker = new Worker(
    "alert-queue",
    async (job) => {
      const { monitorId, incidentId } = job.data;
      console.log(`🔔 Processing alert for monitor ${monitorId}`);
      await processAlertJob({ monitorId, incidentId });
    },
    {
      connection,
      concurrency: 3,
    }
  );

  worker.on("completed", (job) => {
    console.log(`✅ Alert job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`❌ Alert job ${job?.id} failed: ${err.message}`);
  });

  console.log("🟢 Alert Worker started...");
};
