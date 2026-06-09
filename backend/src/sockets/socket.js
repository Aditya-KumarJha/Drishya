import { Server } from "socket.io";

let io = null;

/**
 * Initialize Socket.IO with the HTTP server.
 * Call this once from server.js after creating the HTTP server.
 */
export const initSocket = (httpServer) => {
  const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Join a user-specific room for targeted events
    socket.on("join:user", (userId) => {
      if (userId) {
        socket.join(`user:${userId}`);
        console.log(`👤 Socket ${socket.id} joined room user:${userId}`);
      }
    });

    // Join a monitor-specific room for live status
    socket.on("join:monitor", (monitorId) => {
      if (monitorId) {
        socket.join(`monitor:${monitorId}`);
        console.log(`📡 Socket ${socket.id} joined room monitor:${monitorId}`);
      }
    });

    socket.on("leave:monitor", (monitorId) => {
      if (monitorId) {
        socket.leave(`monitor:${monitorId}`);
      }
    });

    socket.on("disconnect", () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });

  console.log("🟢 Socket.IO initialized");
  return io;
};

/**
 * Get the Socket.IO instance (for emitting events from anywhere).
 */
export const getIO = () => {
  if (!io) {
    console.warn("⚠️ Socket.IO not initialized yet");
  }
  return io;
};

// ─── Event Emitters (used by workers & services) ───

/**
 * Emit a monitor check result to all subscribers of that monitor.
 */
export const emitMonitorStatus = (monitorId, data) => {
  if (!io) return;
  io.to(`monitor:${monitorId}`).emit("monitor:status", {
    monitorId,
    ...data,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Emit when a new incident is created.
 */
export const emitIncidentCreated = (monitorId, incident) => {
  if (!io) return;
  io.to(`monitor:${monitorId}`).emit("incident:created", {
    monitorId,
    incident,
    timestamp: new Date().toISOString(),
  });
  // Also broadcast to all connected clients
  io.emit("incident:new", { monitorId, incidentId: incident._id });
};

/**
 * Emit when an incident is resolved.
 */
export const emitIncidentResolved = (monitorId, incident) => {
  if (!io) return;
  io.to(`monitor:${monitorId}`).emit("incident:resolved", {
    monitorId,
    incident,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Emit when an alert is sent.
 */
export const emitAlertSent = (monitorId, alert) => {
  if (!io) return;
  io.to(`monitor:${monitorId}`).emit("alert:sent", {
    monitorId,
    alert,
    timestamp: new Date().toISOString(),
  });
};
