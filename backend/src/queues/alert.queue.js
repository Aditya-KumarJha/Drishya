import { Queue } from "bullmq";
import { connection } from "./queue.connection.js";
import { withBullmqOptions } from "../config/bullmq.js";

export const alertQueue = new Queue("alert-queue", withBullmqOptions({ connection }));
