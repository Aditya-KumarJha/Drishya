import Groq from "groq-sdk";
import { Pinecone } from "@pinecone-database/pinecone";
import ChatConversation from "./chat.model.js";
import Monitor from "../monitor/monitor.model.js";
import Log from "../logs/log.model.js";
import Incident from "../incident/incident.model.js";
import AIInsight from "../ai/ai.model.js";

const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";
const PINECONE_INDEX = process.env.PINECONE_INDEX_NAME || "drishya";
const PINECONE_TEXT_FIELD = process.env.PINECONE_TEXT_FIELD || "chunk_text";
const PINECONE_NAMESPACE_PREFIX = process.env.PINECONE_NAMESPACE_PREFIX || "monitor-user";

const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY, timeout: 25_000, maxRetries: 2 })
  : null;

const pinecone = process.env.PINECONE_API_KEY
  ? new Pinecone({ apiKey: process.env.PINECONE_API_KEY })
  : null;

const getNamespace = (userId) => `${PINECONE_NAMESPACE_PREFIX}-chat-${userId}`;

const getIndex = (userId) => {
  if (!pinecone) return null;
  return pinecone.index({ name: PINECONE_INDEX, namespace: getNamespace(userId) });
};

const summarizeMonitor = async (monitor) => {
  const [logs, openIncident, latestInsight] = await Promise.all([
    Log.find({ monitorId: monitor._id }).sort({ createdAt: -1 }).limit(12).lean(),
    Incident.findOne({ monitorId: monitor._id, status: "OPEN" }).sort({ createdAt: -1 }).lean(),
    AIInsight.findOne({ monitorId: monitor._id }).sort({ createdAt: -1 }).lean(),
  ]);

  const failures = logs.filter((log) => !log.success).length;
  const latestLog = logs[0];
  return [
    `Monitor ${monitor._id}: ${monitor.method || "GET"} ${monitor.url}`,
    `Group: ${monitor.groupName || "Default"} | Status: ${monitor.lastStatus || "PENDING"} | Last latency: ${monitor.lastResponseTime || 0}ms`,
    `Checks: ${(monitor.checkTypes || ["HTTP"]).join(", ")} | Expected status: ${(monitor.expectedStatusCodes || []).join(", ") || "2xx/3xx"}`,
    `SSL days remaining: ${monitor.sslDaysRemaining ?? "not checked"} | DNS: ${(monitor.dnsResolvedAddresses || []).join(", ") || "not checked"}`,
    `Recent logs: ${logs.length}, failures in sample: ${failures}, latest: ${latestLog ? `${latestLog.checkType || "HTTP"} ${latestLog.status} ${latestLog.success ? "UP" : "DOWN"} ${latestLog.error || ""}` : "none"}`,
    `Open incident: ${openIncident ? `${openIncident.failCount} failures since ${openIncident.startedAt}` : "none"}`,
    `Latest AI: ${latestInsight ? latestInsight.reason || latestInsight.headline || latestInsight.status : "none"}`,
  ].join("\n");
};

const fetchMemory = async ({ userId, question }) => {
  const index = getIndex(userId);
  if (!index || !question) return [];

  try {
    const response = await index.searchRecords({
      query: { inputs: { text: question }, topK: 5 },
      fields: [PINECONE_TEXT_FIELD, "conversationTitle", "monitorIds"],
    });

    return (response?.result?.hits || [])
      .map((hit) => hit?.fields?.[PINECONE_TEXT_FIELD])
      .filter(Boolean);
  } catch (error) {
    console.warn("Chat memory search skipped:", error.message);
    return [];
  }
};

const saveMemory = async ({ conversation, userId, userMessage, assistantMessage, monitorIds }) => {
  const index = getIndex(userId);
  if (!index) return false;

  const text = [
    `Conversation: ${conversation.title}`,
    `Question: ${userMessage}`,
    `Answer: ${assistantMessage}`,
    `Monitor IDs: ${monitorIds.join(", ") || "none"}`,
  ].join("\n");

  try {
    await index.upsertRecords({
      records: [{
        id: `${conversation._id}-${Date.now()}`,
        conversationId: conversation._id.toString(),
        conversationTitle: conversation.title,
        monitorIds: monitorIds.join(","),
        [PINECONE_TEXT_FIELD]: text,
      }],
    });
    return true;
  } catch (error) {
    console.warn("Chat memory upsert skipped:", error.message);
    return false;
  }
};

const buildFallbackAnswer = ({ question, monitorContexts, memory }) => [
  "I could not reach the configured AI model, but I can still reason from the saved monitoring data.",
  "",
  monitorContexts.length
    ? `I found ${monitorContexts.length} monitor context block(s). Check the latest status, recent failures, SSL/DNS fields, and open incident line for the most likely cause.`
    : "I do not see monitor context for this question yet. Select one or more monitors for a more specific answer.",
  memory.length ? "I also found previous conversation memory that may be relevant." : "No previous saved memory was found.",
  "",
  `Your question: ${question}`,
].join("\n");

export const listConversations = (userId) =>
  ChatConversation.find({ userId, isSaved: true })
    .select("title monitorIds lastMessageAt createdAt updatedAt")
    .sort({ updatedAt: -1 })
    .lean();

export const getConversation = (userId, conversationId) =>
  ChatConversation.findOne({ _id: conversationId, userId }).lean();

export const updateConversation = async ({ userId, conversationId, title, monitorIds }) => {
  const update = {};
  if (title !== undefined) {
    const normalizedTitle = String(title || "").trim();
    if (!normalizedTitle) throw new Error("Conversation name is required");
    update.title = normalizedTitle.slice(0, 120);
  }
  if (Array.isArray(monitorIds)) update.monitorIds = monitorIds;

  const conversation = await ChatConversation.findOneAndUpdate(
    { _id: conversationId, userId },
    update,
    { new: true, runValidators: true }
  ).lean();

  if (!conversation) throw new Error("Conversation not found");
  return conversation;
};

export const deleteConversation = async ({ userId, conversationId }) => {
  const deleted = await ChatConversation.findOneAndDelete({ _id: conversationId, userId });
  if (!deleted) throw new Error("Conversation not found");
  return { id: conversationId };
};

export const createConversation = async ({ userId, title, monitorIds = [] }) =>
  ChatConversation.create({
    userId,
    title: String(title || "Monitoring chat").trim() || "Monitoring chat",
    monitorIds,
    isSaved: true,
    lastMessageAt: new Date(),
  });

export const askChat = async ({ userId, conversationId, title, question, monitorIds = [], saveToMemory = true }) => {
  const normalizedQuestion = String(question || "").trim();
  if (!normalizedQuestion) throw new Error("Question is required");
  const derivedTitle = normalizedQuestion
    .replace(/\s+/g, " ")
    .replace(/[^\w\s./:-]/g, "")
    .trim()
    .slice(0, 58);

  let conversation = conversationId
    ? await ChatConversation.findOne({ _id: conversationId, userId })
    : null;

  if (!conversation) {
    conversation = await createConversation({
      userId,
      title: title && title !== "Production investigation" ? title : derivedTitle || "Monitoring chat",
      monitorIds,
    });
  }

  const ownedMonitors = await Monitor.find({
    userId,
    ...(monitorIds.length ? { _id: { $in: monitorIds } } : {}),
  }).limit(8);
  const monitorContexts = await Promise.all(ownedMonitors.map(summarizeMonitor));
  const memory = await fetchMemory({ userId, question: normalizedQuestion });

  const history = conversation.messages.slice(-10).map((message) => ({
    role: message.role,
    content: message.content,
  }));

  const systemPrompt = [
    "You are Drishya AI Chat, an expert SRE assistant for this monitoring platform.",
    "Answer questions about uptime, API failures, DNS, SSL, alerts, incidents, latency, and fixes.",
    "Use the monitor context, logs, incidents, AI insights, and saved memory. If evidence is missing, say what to check next.",
    "Be practical: likely cause, why, exact fix steps, and what to monitor next.",
  ].join("\n");

  const context = [
    "Selected monitor context:",
    ...(monitorContexts.length ? monitorContexts : ["No specific monitor selected."]),
    "",
    "Saved conversation memory:",
    ...(memory.length ? memory.map((item) => `- ${item}`) : ["No saved memory found."]),
  ].join("\n");

  let answer;
  if (groq) {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0.25,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: context },
        ...history,
        { role: "user", content: normalizedQuestion },
      ],
    });
    answer = completion.choices?.[0]?.message?.content || "";
  }

  if (!answer) {
    answer = buildFallbackAnswer({ question: normalizedQuestion, monitorContexts, memory });
  }

  const selectedMonitorIds = ownedMonitors.map((monitor) => monitor._id);
  conversation.messages.push({
    role: "user",
    content: normalizedQuestion,
    monitorIds: selectedMonitorIds,
  });
  conversation.messages.push({
    role: "assistant",
    content: answer,
    monitorIds: selectedMonitorIds,
  });
  conversation.monitorIds = [...new Set([...conversation.monitorIds.map(String), ...selectedMonitorIds.map(String)])];
  conversation.lastMessageAt = new Date();

  const saved = saveToMemory
    ? await saveMemory({
        conversation,
        userId,
        userMessage: normalizedQuestion,
        assistantMessage: answer,
        monitorIds: selectedMonitorIds.map(String),
      })
    : false;

  const lastMessage = conversation.messages.at(-1);
  if (lastMessage) lastMessage.memorySaved = saved;
  await conversation.save();

  return conversation.toObject();
};
