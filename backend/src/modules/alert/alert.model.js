import mongoose from "mongoose";

const alertSchema = new mongoose.Schema({
  monitorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Monitor",
  },
  incidentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Incident",
  },
  type: {
    type: String,
    enum: ["EMAIL", "WEBHOOK"],
    default: "EMAIL",
  },
  status: {
    type: String,
    enum: ["SENT", "FAILED"],
  },
  message: String,

   ai: {
    status: String,
    reason: String,
    suggestion: [String],
  }
}, { timestamps: true });

export default mongoose.model("Alert", alertSchema);