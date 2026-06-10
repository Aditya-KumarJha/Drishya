import { Queue } from "bullmq";
import { connection } from "../../config/redis.js";
import { withBullmqOptions } from "../../config/bullmq.js";

export const monitorQueue = new Queue("monitor-queue", withBullmqOptions({
  connection,
}));
