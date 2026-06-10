// src/modules/log/log.routes.js
import express from "express";
import { getMonitorAnalyticsController } from "./log.controller.js";
import { protect } from "../auth/auth.middleware.js";

const router = express.Router();

router.get("/analytics/:monitorId", protect, getMonitorAnalyticsController);

export default router;