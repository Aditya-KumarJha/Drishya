import mongoose from "mongoose";

const creditTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["GRANT", "PURCHASE_PENDING", "PURCHASE", "USAGE", "ADJUSTMENT"],
      required: true,
    },
    credits: {
      type: Number,
      required: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
    amountInr: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["PENDING", "SUCCESS", "FAILED"],
      default: "SUCCESS",
      index: true,
    },
    planId: String,
    razorpayOrderId: {
      type: String,
      index: true,
    },
    razorpayPaymentId: String,
    razorpaySignature: String,
    monitorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Monitor",
      default: null,
    },
    description: String,
  },
  { timestamps: true }
);

creditTransactionSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("CreditTransaction", creditTransactionSchema);
