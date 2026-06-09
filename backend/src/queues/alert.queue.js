import { Queue } from "bullmq";
import { connection } from "./queue.connection.js";

export const alertQueue = new Queue("alert-queue", { connection });
