import express from "express";
import {
  getAllIncidents,
  getIncidentsByMonitor,
  getIncidentById,
  resolveIncidentManually,
  getIncidentStats,
} from "./incident.controller.js";
import { protect } from "../auth/auth.middleware.js";

const router = express.Router();

router.use(protect);

router.get("/", getAllIncidents);
router.get("/stats", getIncidentStats);
router.get("/monitor/:monitorId", getIncidentsByMonitor);
router.get("/:id", getIncidentById);
router.put("/:id/resolve", resolveIncidentManually);

export default router;
