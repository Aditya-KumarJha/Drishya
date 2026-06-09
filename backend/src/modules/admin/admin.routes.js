import express from "express";
import { protect, isAdmin } from "../auth/auth.middleware.js";
import {
  getAdminSummaryController,
  getAdminMonitorsController,
  getAllUsersController,
  toggleUserStatusController,
  updateUserRoleController,
  getAllIncidentsAdminController,
  resolveIncidentAdminController,
  getSystemAnalyticsController,
} from "./admin.controller.js";

const router = express.Router();

router.use(protect, isAdmin);

// System Overview
router.get("/summary", getAdminSummaryController);
router.get("/monitors", getAdminMonitorsController);
router.get("/analytics", getSystemAnalyticsController);

// User Management
router.get("/users", getAllUsersController);
router.put("/users/:id/toggle", toggleUserStatusController);
router.put("/users/:id/role", updateUserRoleController);

// Incident Management
router.get("/incidents", getAllIncidentsAdminController);
router.put("/incidents/:id/resolve", resolveIncidentAdminController);

export default router;
