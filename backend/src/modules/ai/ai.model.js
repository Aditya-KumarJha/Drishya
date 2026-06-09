import mongoose from "mongoose";

const metricsSnapshotSchema = new mongoose.Schema(
  {
    avgLatency: Number,
    currentState: String,
    failureRatePercentage: Number,
    p95Latency: Number,
    recentFailures: Number,
    recentSuccesses: Number,
    totalChecks: Number,
    uptimePercentage: Number,
  },
  { _id: false }
);

const resolutionStepSchema = new mongoose.Schema(
  {
    detail: String,
    step: String,
  },
  { _id: false }
);

const predictedIssueSchema = new mongoose.Schema(
  {
    issue: String,
    prevention: String,
    probability: Number,
    timeframe: String,
    why: String,
  },
  { _id: false }
);

const signalSchema = new mongoose.Schema(
  {
    impact: String,
    label: String,
    value: String,
  },
  { _id: false }
);

const aiSchema = new mongoose.Schema({
  monitorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Monitor"
  },
  incidentId: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: "Incident"
  },
  status: String,
  source: {
    type: String,
    enum: ["INCIDENT", "ON_DEMAND"],
    default: "ON_DEMAND",
  },
  severity: String,
  headline: String,
  explanation: String,
  reason: String,
  solutionSummary: String,
  suggestion: [String],
  resolutionSteps: [resolutionStepSchema],
  predictedIssues: [predictedIssueSchema],
  signals: [signalSchema],
  confidence: Number,
  metricsSnapshot: metricsSnapshotSchema,
  pineconeContext: [String],
}, { timestamps: true });

export default mongoose.model("AIInsight", aiSchema);
