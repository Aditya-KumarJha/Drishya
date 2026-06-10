import express from "express";
import { protect } from "../auth/auth.middleware.js";
import { createCreditOrder, getBillingSummary, verifyCreditPayment } from "./billing.service.js";

const router = express.Router();
const getUserId = (req) => req.user?._id || req.user?.userId;

router.use(protect);

router.get("/summary", async (req, res) => {
  try {
    res.json({ success: true, data: await getBillingSummary(getUserId(req)) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/orders", async (req, res) => {
  try {
    const data = await createCreditOrder({ userId: getUserId(req), planId: req.body.planId });
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/verify", async (req, res) => {
  try {
    const data = await verifyCreditPayment({ userId: getUserId(req), ...req.body });
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/purchase", (_req, res) => {
  res.status(410).json({ error: "Use /billing/orders and /billing/verify for Razorpay payments" });
});

export default router;
