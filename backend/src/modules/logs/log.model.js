import mongoose from "mongoose";

const logSchema = new mongoose.Schema({
  monitorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Monitor"
},
  status: Number,
  responseTime: Number,
  success: Boolean
}, { timestamps: true });


// 🔥 COMPOUND INDEX (aggregation ke liye)
logSchema.index({ monitorId: 1, createdAt: -1 });

// 🔥 TTL (auto cleanup)  
logSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 7 }
);

export default mongoose.model("Log", logSchema);