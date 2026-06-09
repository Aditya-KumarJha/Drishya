import express from "express";
import {
  getDashboardSummary,
  getAllMonitorsDashboard,
  getIncidentTimeline,
  getAIInsights,
  getMonitorAnalytics
} from "./dashboard.controller.js";
import { protect } from "../auth/auth.middleware.js";

const router = express.Router();

router.use(protect);

router.get("/summary", getDashboardSummary);
router.get("/monitors", getAllMonitorsDashboard);
router.get("/incidents/:monitorId", getIncidentTimeline);
router.get("/ai/:monitorId", getAIInsights);
router.get("/analytics/:monitorId", getMonitorAnalytics);

export default router;
