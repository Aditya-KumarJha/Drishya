import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import logRoutes from "./modules/logs/log.routes.js";
import monitorRoutes from "./modules/monitor/monitor.routes.js";
import aiRoutes from "./modules/ai/ai.routes.js";
import dashboardRoutes from "./modules/dashboard/dashboard.routes.js";
import authRoutes from "./modules/auth/auth.routes.js";
import adminRoutes from "./modules/admin/admin.routes.js";
import alertRoutes from "./modules/alert/alert.routes.js";
import incidentRoutes from "./modules/incident/incident.routes.js";

const app = express();

// CORS Configuration
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173/")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }

    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Reject all other origins
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// Middleware
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());

// Routes
app.use("/auth", authRoutes);
app.use("/logs", logRoutes);
app.use("/ai", aiRoutes);
app.use("/monitors", monitorRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/admin", adminRoutes);
app.use("/alerts", alertRoutes);
app.use("/incidents", incidentRoutes);

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Smart Monitoring API is running",
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || "Internal server error" });
});

export default app;
