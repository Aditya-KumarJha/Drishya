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
import { validateEnv } from "./src/config/validateEnv.js";
import dns from "dns";

const port = Number(process.env.PORT || 4000);

dns.setServers(["1.1.1.1", "8.8.8.8"]);

const startServer = async () => {
  validateEnv();
  await connectDB();

  const server = http.createServer(app);
  initSocket(server);

  startScheduler();
  startBullWorker();
  startAlertWorker();
  startAIWorker();
  startNotificationListeners().catch((error) => {
    console.error("Notification listeners failed to start:", error.message);
  });

  server.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });

  const shutdown = () => {
    console.log("Shutting down server");
    server.close(() => {
      process.exit(0);
    });
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
};

startServer().catch((error) => {
  console.error("Server failed to start:", error);
  process.exit(1);
});
