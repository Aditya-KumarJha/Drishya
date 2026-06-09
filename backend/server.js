// src/server.js
import "dotenv/config";
import http from "http";
import app from "./src/app.js";
import { connectDB } from "./src/config/db.js";
import { startScheduler } from "./src/modules/monitor/monitor.scheduler.js";
import { startBullWorker } from "./src/workers/monitor.worker.js";
import { startAlertWorker } from "./src/workers/alert.worker.js";
import { startAIWorker } from "./src/workers/ai.worker.js";
import { startNotificationListeners } from "./src/modules/notification/broker/listener.js";
import { initSocket } from "./src/sockets/socket.js";
import dns from "dns";



dns.setServers(["1.1.1.1", "8.8.8.8"])

connectDB();

// Create HTTP server and attach Socket.IO
const server = http.createServer(app);
initSocket(server);

startScheduler();
startBullWorker();
startAlertWorker();
startAIWorker();
startNotificationListeners().catch((error) => {
  console.error("Notification listeners failed to start:", error.message);
});

const port = Number(process.env.PORT || 4000);

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});