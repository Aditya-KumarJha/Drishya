// src/modules/log/log.routes.js
import express from "express";
import { getMonitorAnalyticsController, getMonitorLogsController } from "./log.controller.js";
import { protect } from "../auth/auth.middleware.js";

const router = express.Router();

router.get("/analytics/:monitorId", protect, getMonitorAnalyticsController);
router.get("/:monitorId", protect, getMonitorLogsController);

export default router;
