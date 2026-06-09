import { z } from "zod";

const stepSchema = z.object({
  step: z.string().min(1).max(120),
  detail: z.string().min(1).max(320),
});

const predictionSchema = z.object({
  issue: z.string().min(1).max(140),
  why: z.string().min(1).max(260),
  timeframe: z.string().min(1).max(120),
  probability: z.number().min(0).max(1),
  prevention: z.string().min(1).max(260),
});

const signalSchema = z.object({
  label: z.string().min(1).max(80),
  value: z.string().min(1).max(120),
  impact: z.string().min(1).max(220),
});

export const aiInsightSchema = z.object({
  status: z.enum(["STABLE", "OBSERVE", "DEGRADED", "DOWN", "INCIDENT"]),
  severity: z.enum(["low", "medium", "high", "critical"]),
  headline: z.string().min(1).max(160),
  explanation: z.string().min(1).max(600),
  reason: z.string().min(1).max(600),
  solutionSummary: z.string().min(1).max(500),
  suggestion: z.array(z.string().min(1).max(240)).min(1).max(6),
  resolutionSteps: z.array(stepSchema).min(2).max(6),
  predictions: z.array(predictionSchema).max(4),
  signals: z.array(signalSchema).min(1).max(6),
  confidence: z.number().min(0).max(1),
});

export const aiInsightJsonSchema = aiInsightSchema.toJSONSchema();
