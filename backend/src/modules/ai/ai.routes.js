// src/modules/ai/ai.routes.js

import express from "express";
import { getAIInsights } from "./ai.controller.js";
import { protect } from "../auth/auth.middleware.js";

const router = express.Router();

router.get("/insights/:monitorId", protect, getAIInsights);

export default router;