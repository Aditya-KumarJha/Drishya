import mongoose from "mongoose";

const logSchema = new mongoose.Schema({
  monitorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Monitor"
  },
  checkType: {
    type: String,
    enum: ["HTTP", "SSL", "DNS"],
    default: "HTTP",
  },
  region: {
    type: String,
    default: "primary",
  },
  status: Number,
  responseTime: Number,
  success: Boolean,
  error: {
    type: String,
    default: '',
  },
  checkedAt: {
    type: Date,
    default: Date.now,
  },
  meta: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, { timestamps: true });


// 🔥 COMPOUND INDEX (aggregation ke liye)
logSchema.index({ monitorId: 1, createdAt: -1 });

// 🔥 TTL (auto cleanup)  
logSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 7 }
);

export default mongoose.model("Log", logSchema);
