import Groq from "groq-sdk";
import { Pinecone } from "@pinecone-database/pinecone";
import Monitor from "../monitor/monitor.model.js";
import Log from "../logs/log.model.js";
import Incident from "../incident/incident.model.js";
import AIInsight from "./ai.model.js";
import { aiInsightJsonSchema, aiInsightSchema } from "./ai.schema.js";

const DEFAULT_GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";
const DEFAULT_PINECONE_INDEX = process.env.PINECONE_INDEX_NAME || "drishya";
const DEFAULT_PINECONE_NAMESPACE_PREFIX =
  process.env.PINECONE_NAMESPACE_PREFIX || "monitor-user";
const DEFAULT_PINECONE_TEXT_FIELD = process.env.PINECONE_TEXT_FIELD || "chunk_text";
const INSIGHT_REFRESH_WINDOW_MS = 30 * 60 * 1000;

const groqClient = process.env.GROQ_API_KEY
  ? new Groq({
      apiKey: process.env.GROQ_API_KEY,
      timeout: 20_000,
      maxRetries: 2,
    })
  : null;

const pineconeClient = process.env.PINECONE_API_KEY
  ? new Pinecone({ apiKey: process.env.PINECONE_API_KEY })
  : null;

const average = (values) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

const percentile = (values, ratio) => {
  if (!values.length) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1));
  return sorted[index];
};

const detectLatencyTrend = (latencies) => {
  if (latencies.length < 4) return "not_enough_data";

  const midpoint = Math.floor(latencies.length / 2);
  const firstHalf = latencies.slice(0, midpoint);
  const secondHalf = latencies.slice(midpoint);
  const firstAvg = average(firstHalf);
  const secondAvg = average(secondHalf);

  if (!firstAvg && !secondAvg) return "flat";

  const delta = secondAvg - firstAvg;
  const threshold = Math.max(firstAvg * 0.15, 75);

  if (delta > threshold) return "rising";
  if (delta < -threshold) return "improving";
  return "flat";
};

const formatTimestamp = (value) => {
  if (!value) return "n/a";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "n/a";

  return date.toISOString();
};

const normalizeInsightForStorage = (insight, fallback = {}) => {
  const parsed = aiInsightSchema.parse(insight);

  return {
    confidence: parsed.confidence,
    explanation: parsed.explanation,
    headline: parsed.headline,
    predictedIssues: parsed.predictions,
    reason: parsed.reason,
    resolutionSteps: parsed.resolutionSteps,
    severity: parsed.severity,
    signals: parsed.signals,
    solutionSummary: parsed.solutionSummary,
    source: fallback.source || "ON_DEMAND",
    status: parsed.status,
    suggestion: parsed.suggestion,
  };
};

const getNamespace = (monitor) => {
  const userId = monitor?.userId?.toString?.() || "anonymous";
  return `${DEFAULT_PINECONE_NAMESPACE_PREFIX}-${userId}`;
};

const getPineconeIndex = (monitor) => {
  if (!pineconeClient || !monitor) return null;

  return pineconeClient.index({
    name: DEFAULT_PINECONE_INDEX,
    namespace: getNamespace(monitor),
  });
};

const buildPineconeDocument = ({ insight, analytics, incident, monitor }) => {
  const suggestions = insight.suggestion.join("; ");
  const predictions = insight.predictions
    .map((item) => `${item.issue} (${item.timeframe}, probability ${Math.round(item.probability * 100)}%)`)
    .join("; ");

  return [
    `Monitor: ${monitor.url}`,
    `Status: ${insight.status}`,
    `Severity: ${insight.severity}`,
    `Headline: ${insight.headline}`,
    `Explanation: ${insight.explanation}`,
    `Root cause: ${insight.reason}`,
    `Fix summary: ${insight.solutionSummary}`,
    `Next actions: ${suggestions || "none"}`,
    `Predictions: ${predictions || "none"}`,
    `Metrics: uptime ${analytics.uptimePercentage}%, avg latency ${analytics.avgLatency}ms, p95 latency ${analytics.p95Latency}ms, failure rate ${analytics.failureRatePercentage}%`,
    `Incident: ${incident ? `${incident.status} with ${incident.failCount} consecutive failures` : "none"}`,
  ].join("\n");
};

const fetchRelevantMemory = async (monitor, analytics) => {
  const index = getPineconeIndex(monitor);

  if (!index) return [];

  const queryText = [
    `Monitor ${monitor.url}`,
    `status ${analytics.currentState}`,
    `latency trend ${analytics.latencyTrend}`,
    `failure rate ${analytics.failureRatePercentage}%`,
    analytics.hasRecentFailure ? "recent failure" : "healthy checks",
  ].join(" ");

  try {
    const response = await index.searchRecords({
      query: {
        inputs: { text: queryText },
        topK: 3,
      },
      fields: [DEFAULT_PINECONE_TEXT_FIELD, "headline", "severity", "status"],
    });

    return (response?.result?.hits || [])
      .map((hit) => hit?.fields?.[DEFAULT_PINECONE_TEXT_FIELD] || "")
      .filter(Boolean);
  } catch (error) {
    console.warn("Pinecone search skipped:", error.message);
    return [];
  }
};

const saveInsightMemory = async ({ insight, analytics, incident, monitor, savedInsight }) => {
  const index = getPineconeIndex(monitor);

  if (!index) return;

  const record = {
    id: savedInsight._id.toString(),
    monitorId: monitor._id.toString(),
    incidentId: incident?._id?.toString?.() || "",
    status: insight.status,
    severity: insight.severity,
    headline: insight.headline,
    source: savedInsight.source,
    [DEFAULT_PINECONE_TEXT_FIELD]: buildPineconeDocument({
      insight,
      analytics,
      incident,
      monitor,
    }),
  };

  try {
    await index.upsertRecords({
      records: [record],
    });
  } catch (error) {
    console.warn("Pinecone upsert skipped:", error.message);
  }
};

const buildAnalytics = (logs) => {
  const orderedLogs = [...logs].sort(
    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
  );
  const totalChecks = orderedLogs.length;
  const successes = orderedLogs.filter((log) => log.success).length;
  const failures = totalChecks - successes;
  const latencies = orderedLogs
    .map((log) => Number(log.responseTime) || 0)
    .filter((value) => value > 0);
  const recentWindow = orderedLogs.slice(-8);
  const recentFailures = recentWindow.filter((log) => !log.success).length;
  const recentSuccesses = recentWindow.length - recentFailures;
  const latestLog = orderedLogs.at(-1) || null;

  return {
    avgLatency: Math.round(average(latencies)),
    currentState: latestLog?.success === false ? "DOWN" : totalChecks ? "UP" : "NO_LOGS",
    failureRatePercentage: totalChecks ? Number(((failures / totalChecks) * 100).toFixed(2)) : 0,
    hasRecentFailure: recentFailures > 0,
    latencyTrend: detectLatencyTrend(latencies),
    latestLog,
    p95Latency: Math.round(percentile(latencies, 0.95)),
    recentFailures,
    recentSuccesses,
    totalChecks,
    uptimePercentage: totalChecks ? Number(((successes / totalChecks) * 100).toFixed(2)) : 0,
  };
};

const buildPromptContext = ({ incident, logs, memory, monitor, analytics }) => {
  const logLines = logs.map((log) => {
    const state = log.success ? "success" : "failure";
    return `${formatTimestamp(log.createdAt)} | ${state} | status ${log.status} | latency ${log.responseTime}ms`;
  });

  return [
    "You analyze uptime monitoring data for end users.",
    "Write plain-language explanations first, then actionable engineering guidance.",
    "Use the schema exactly.",
    "",
    "Monitor",
    `- URL: ${monitor.url}`,
    `- Method: ${monitor.method}`,
    `- Interval ms: ${monitor.interval}`,
    "",
    "Calculated metrics",
    `- Current state: ${analytics.currentState}`,
    `- Total checks: ${analytics.totalChecks}`,
    `- Uptime percentage: ${analytics.uptimePercentage}`,
    `- Failure rate percentage: ${analytics.failureRatePercentage}`,
    `- Average latency ms: ${analytics.avgLatency}`,
    `- P95 latency ms: ${analytics.p95Latency}`,
    `- Recent successes (last 8): ${analytics.recentSuccesses}`,
    `- Recent failures (last 8): ${analytics.recentFailures}`,
    `- Latency trend: ${analytics.latencyTrend}`,
    "",
    "Active incident",
    incident
      ? `- ${incident.status} | failCount ${incident.failCount} | ${incident.message || "No incident message"}`
      : "- none",
    "",
    "Recent logs",
    ...(logLines.length ? logLines : ["- no recent logs available"]),
    "",
    "Historical memory from Pinecone",
    ...(memory.length ? memory.map((item) => `- ${item}`) : ["- no related memory found"]),
    "",
    "Output rules",
    "- explanation must be understandable by a non-technical user.",
    "- reason should explain the most likely root cause grounded in the data.",
    "- suggestion should be short actionable bullets.",
    "- resolutionSteps should be step-by-step and practical.",
    "- predictions should focus on likely next issues inferred from latency/failure patterns.",
    "- If the system looks healthy, still mention what should be watched next.",
  ].join("\n");
};

const generateAIInsight = async ({ incident, logs, memory, monitor, analytics }) => {
  if (!groqClient) {
    throw new Error("GROQ_API_KEY is not configured");
  }

  const completion = await groqClient.chat.completions.create({
    model: DEFAULT_GROQ_MODEL,
    temperature: 0.2,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "monitor_insight",
        strict: true,
        schema: aiInsightJsonSchema,
      },
    },
    messages: [
      {
        role: "system",
        content:
          "You are Drishya AI, an SRE-style monitoring assistant. Always explain clearly, avoid jargon where possible, and stay grounded in the supplied metrics.",
      },
      {
        role: "user",
        content: buildPromptContext({ incident, logs, memory, monitor, analytics }),
      },
    ],
  });

  const content = completion.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Groq returned an empty insight");
  }

  return aiInsightSchema.parse(JSON.parse(content));
};

const buildFallbackInsight = ({ incident, monitor, analytics }) => {
  const degraded = analytics.currentState === "DOWN" || analytics.hasRecentFailure;
  const headline = degraded
    ? `Problems detected for ${monitor.url}`
    : `${monitor.url} is currently stable`;

  const explanation = degraded
    ? "Recent checks show failures or unhealthy latency, so this monitor needs attention."
    : "Recent checks look healthy, and the monitor is currently responding normally.";

  const reason = degraded
    ? analytics.p95Latency > 0
      ? `The service is showing failed checks and elevated latency around ${analytics.p95Latency}ms at the slow end, which often points to backend load, dependency slowness, or intermittent availability issues.`
      : "The service is showing failed checks, which usually means the endpoint is unavailable, timing out, or returning errors."
    : analytics.latencyTrend === "rising"
      ? "The endpoint is still up, but latency is trending upward, so it may become slower or unstable if the pattern continues."
      : "The endpoint looks stable based on recent checks.";

  const suggestion = degraded
    ? [
        "Check whether the endpoint is reachable from your server.",
        "Review recent deployment, DNS, SSL, and infrastructure changes.",
        "Inspect upstream APIs or database latency if the app depends on them.",
      ]
    : [
        "Keep watching latency and failure rate for changes.",
        "Set a tighter alert if this endpoint is business critical.",
      ];

  const predictions =
    analytics.latencyTrend === "rising"
      ? [
          {
            issue: "Latency may keep increasing",
            why: "Recent latency is rising across the latest checks.",
            timeframe: "next few monitoring intervals",
            probability: 0.68,
            prevention: "Review backend load, slow queries, and upstream dependencies before failures begin.",
          },
        ]
      : [];

  return aiInsightSchema.parse({
    status: incident?.status === "OPEN" ? "INCIDENT" : degraded ? "DEGRADED" : "STABLE",
    severity: incident?.status === "OPEN" ? "high" : degraded ? "medium" : "low",
    headline,
    explanation,
    reason,
    solutionSummary: degraded
      ? "Start with reachability and recent changes, then check dependencies causing slow or failed responses."
      : "No active incident is visible right now, but continue watching response-time changes.",
    suggestion,
    resolutionSteps: degraded
      ? [
          {
            step: "Confirm the failure",
            detail: "Open the target URL manually or from the server environment and verify the status code, timeout, or DNS/SSL behavior.",
          },
          {
            step: "Inspect recent changes",
            detail: "Check deployments, config updates, DNS records, certificates, firewall rules, and hosting incidents from the same time window.",
          },
          {
            step: "Check dependencies",
            detail: "If the endpoint is reachable but slow, inspect database load, third-party APIs, queues, and CPU or memory pressure.",
          },
        ]
      : [
          {
            step: "Track the trend",
            detail: "Watch upcoming latency points and compare them with the current average and p95 values.",
          },
          {
            step: "Review thresholds",
            detail: "Make sure alert thresholds match the importance of this endpoint so you catch degradation early.",
          },
        ],
    predictions,
    signals: [
      {
        label: "Uptime",
        value: `${analytics.uptimePercentage}%`,
        impact: degraded ? "Below ideal and should be investigated." : "Healthy based on recent checks.",
      },
      {
        label: "Average latency",
        value: `${analytics.avgLatency}ms`,
        impact: analytics.latencyTrend === "rising" ? "Latency is trending upward." : "Latency trend looks controlled.",
      },
      {
        label: "Recent failures",
        value: String(analytics.recentFailures),
        impact: analytics.recentFailures > 0 ? "Failures appeared in the latest checks." : "No recent failures detected.",
      },
    ],
    confidence: degraded ? 0.72 : 0.66,
  });
};

const shouldRefreshInsight = async ({ existingInsight, incident }) => {
  if (!existingInsight) return true;

  const age = Date.now() - new Date(existingInsight.createdAt).getTime();
  if (age > INSIGHT_REFRESH_WINDOW_MS) return true;

  if (incident?.status === "OPEN" && existingInsight.incidentId?.toString?.() !== incident._id.toString()) {
    return true;
  }
  
  return false;
};

export const buildMonitorInsight = async ({
  monitorId,
  incidentId = null,
  source = "ON_DEMAND",
  forceRefresh = false,
}) => {
  const monitor = await Monitor.findById(monitorId);
  if (!monitor) {
    throw new Error("Monitor not found");
  }

  const incident = incidentId
    ? await Incident.findById(incidentId)
    : await Incident.findOne({ monitorId, status: "OPEN" }).sort({ createdAt: -1 });

  const existingInsight = await AIInsight.findOne({
    monitorId,
    ...(incident?._id ? { incidentId: incident._id } : {}),
  }).sort({ createdAt: -1 });

  if (!forceRefresh) {
    const refreshNeeded = await shouldRefreshInsight({
      existingInsight,
      incident,
    });

    if (!refreshNeeded && existingInsight) {
      return existingInsight;
    }
  }

  const logs = await Log.find({ monitorId }).sort({ createdAt: -1 }).limit(30).lean();
  const orderedLogs = [...logs].reverse();
  const analytics = buildAnalytics(orderedLogs);
  const memory = await fetchRelevantMemory(monitor, analytics);

  let generated;

  try {
    generated = await generateAIInsight({
      incident,
      logs: orderedLogs,
      memory,
      monitor,
      analytics,
    });
  } catch (error) {
    console.warn("Groq insight generation failed, using fallback:", error.message);
    generated = buildFallbackInsight({
      incident,
      monitor,
      analytics,
    });
  }

  const normalized = normalizeInsightForStorage(generated, { source });

  const savedInsight = await AIInsight.create({
    monitorId: monitor._id,
    incidentId: incident?._id || null,
    metricsSnapshot: {
      avgLatency: analytics.avgLatency,
      currentState: analytics.currentState,
      failureRatePercentage: analytics.failureRatePercentage,
      p95Latency: analytics.p95Latency,
      recentFailures: analytics.recentFailures,
      recentSuccesses: analytics.recentSuccesses,
      totalChecks: analytics.totalChecks,
      uptimePercentage: analytics.uptimePercentage,
    },
    pineconeContext: memory,
    ...normalized,
  });

  await saveInsightMemory({
    insight: generated,
    analytics,
    incident,
    monitor,
    savedInsight,
  });

  return savedInsight;
};

export const listMonitorInsights = async (monitorId) =>
  AIInsight.find({ monitorId }).sort({ createdAt: -1 });
