import { Worker } from "bullmq";
import { connection } from "../config/redis.js";
import { buildMonitorInsight } from "../modules/ai/ai.service.js";

export const startAIWorker = () => {
  const worker = new Worker(
    "ai-queue",
    async (job) => {
      const { monitorId, incidentId, source } = job.data;
      console.log(`🧠 Processing AI insight for monitor ${monitorId}`);

      await buildMonitorInsight({
        monitorId,
        incidentId: incidentId || null,
        source: source || "INCIDENT",
        forceRefresh: true,
      });
    },
    {
      connection,
      concurrency: 2,
    }
  );

  worker.on("completed", (job) => {
    console.log(`✅ AI job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`❌ AI job ${job?.id} failed: ${err.message}`);
  });

  console.log("🟢 AI Worker started...");
};
