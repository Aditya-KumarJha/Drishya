import express from "express";
import { getAllAlerts, getAlertsByMonitor, getAlertStats } from "./alert.controller.js";
import { protect } from "../auth/auth.middleware.js";

const router = express.Router();

router.use(protect);

router.get("/", getAllAlerts);
router.get("/stats", getAlertStats);
router.get("/:monitorId", getAlertsByMonitor);

export default router;
