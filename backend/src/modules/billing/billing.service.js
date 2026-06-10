import crypto from "crypto";
import Razorpay from "razorpay";
import User from "../auth/models/user.model.js";
import Monitor from "../monitor/monitor.model.js";
import CreditTransaction from "./billing.model.js";
import { CHECK_CREDIT_COST, CREDIT_PLANS } from "./pricing.js";
import { publishNotificationEvent, QUEUES } from "../notification/events.js";

export const getPlanById = (planId) => CREDIT_PLANS.find((plan) => plan.id === planId);

const getRazorpayClient = () => {
  if (!process.env.RZP_KEY_ID || !process.env.RZP_KEY_SECRET) {
    throw new Error("RZP_KEY_ID and RZP_KEY_SECRET must be configured");
  }

  return new Razorpay({
    key_id: process.env.RZP_KEY_ID,
    key_secret: process.env.RZP_KEY_SECRET,
  });
};

export const getBillingSummary = async (userId) => {
  const [user, transactions] = await Promise.all([
    User.findById(userId).select("credits creditsUsed email fullName").lean(),
    CreditTransaction.find({ userId }).sort({ createdAt: -1 }).limit(20).lean(),
  ]);

  return {
    credits: user?.credits || 0,
    creditsUsed: user?.creditsUsed || 0,
    razorpayKeyId: process.env.RZP_KEY_ID || "",
    plans: CREDIT_PLANS,
    transactions,
  };
};

export const createCreditOrder = async ({ userId, planId }) => {
  const plan = getPlanById(planId);
  if (!plan) throw new Error("Invalid credit plan");

  const user = await User.findById(userId).select("email fullName").lean();
  if (!user) throw new Error("User not found");

  const razorpay = getRazorpayClient();
  const order = await razorpay.orders.create({
    amount: plan.priceInr * 100,
    currency: "INR",
    receipt: `drishya_${plan.id}_${Date.now()}`,
    notes: {
      userId: userId.toString(),
      planId: plan.id,
      credits: String(plan.credits),
    },
  });

  await CreditTransaction.create({
    userId,
    type: "PURCHASE_PENDING",
    status: "PENDING",
    credits: plan.credits,
    balanceAfter: 0,
    amountInr: plan.priceInr,
    planId: plan.id,
    razorpayOrderId: order.id,
    description: `${plan.name} credits purchase pending`,
  });

  return {
    keyId: process.env.RZP_KEY_ID,
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    plan,
    prefill: {
      name: user.fullName || "",
      email: user.email || "",
    },
  };
};

export const verifyCreditPayment = async ({
  userId,
  planId,
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
}) => {
  const plan = getPlanById(planId);
  if (!plan) throw new Error("Invalid credit plan");
  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    throw new Error("Missing Razorpay verification payload");
  }

  if (!process.env.RZP_KEY_SECRET) {
    throw new Error("RZP_KEY_SECRET must be configured");
  }

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RZP_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  if (expectedSignature !== razorpaySignature) {
    await CreditTransaction.findOneAndUpdate(
      { userId, razorpayOrderId, status: "PENDING" },
      { status: "FAILED", description: `${plan.name} credits purchase signature failed` }
    );
    throw new Error("Payment verification failed");
  }

  const pending = await CreditTransaction.findOneAndUpdate(
    { userId, razorpayOrderId, status: "PENDING" },
    {
      type: "PURCHASE",
      status: "SUCCESS",
      razorpayPaymentId,
      razorpaySignature,
      description: `${plan.name} credits purchase`,
    },
    { new: true }
  );

  if (!pending) {
    throw new Error("Payment order already processed or not found");
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { $inc: { credits: plan.credits } },
    { new: true }
  );
  if (!user) throw new Error("User not found");

  pending.balanceAfter = user.credits;
  await pending.save();

  await publishNotificationEvent(QUEUES.CREDITS_PURCHASED, {
    email: user.email,
    fullName: user.fullName,
    planName: plan.name,
    credits: plan.credits,
    amountInr: plan.priceInr,
    balanceAfter: user.credits,
  });

  return getBillingSummary(userId);
};

export const chargeMonitorCheck = async ({ monitor }) => {
  const lastChargedAt = monitor.lastChargedAt ? new Date(monitor.lastChargedAt).getTime() : 0;
  if (lastChargedAt && Date.now() - lastChargedAt < 60 * 60 * 1000) {
    const user = await User.findById(monitor.userId).select("credits").lean();
    if (!user || user.credits <= 0) {
      await Monitor.updateMany({ userId: monitor.userId, active: true }, { active: false });
      return { charged: false, balance: 0 };
    }
    return { charged: true, balance: user.credits, skippedHourlyCharge: true };
  }

  const user = await User.findOneAndUpdate(
    { _id: monitor.userId, credits: { $gte: CHECK_CREDIT_COST } },
    { $inc: { credits: -CHECK_CREDIT_COST, creditsUsed: CHECK_CREDIT_COST } },
    { new: true }
  );

  if (!user) {
    await Monitor.updateMany({ userId: monitor.userId, active: true }, { active: false });
    const exhaustedUser = await User.findById(monitor.userId).lean();
    if (exhaustedUser?.email) {
      await publishNotificationEvent(QUEUES.CREDITS_EXHAUSTED, {
        email: exhaustedUser.email,
        fullName: exhaustedUser.fullName,
        monitorUrl: monitor.url,
      });
    }
    return { charged: false, balance: 0 };
  }

  await CreditTransaction.create({
    userId: monitor.userId,
    type: "USAGE",
    credits: -CHECK_CREDIT_COST,
    balanceAfter: user.credits,
    monitorId: monitor._id,
    description: `Hourly active monitor charge: ${monitor.url}`,
  });

  await Monitor.findByIdAndUpdate(monitor._id, { lastChargedAt: new Date() });

  return { charged: true, balance: user.credits };
};
