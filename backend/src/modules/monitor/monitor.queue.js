import { Queue } from "bullmq";
import { connection } from "../../config/redis.js";

export const monitorQueue = new Queue("monitor-queue", {
  connection,
});