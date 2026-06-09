import mongoose from "mongoose";

const incidentSchema = new mongoose.Schema({
  monitorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Monitor",
    required: true,
  },
  status: {
    type: String,
    enum: ["OPEN", "RESOLVED"],
    default: "OPEN",
  },
  message: String,
  failCount: {
    type: Number,
    default: 0,
  },
  startedAt: {
    type: Date,
    default: Date.now,
  },
  resolvedAt: Date,
}, { timestamps: true });

export default mongoose.model("Incident", incidentSchema);