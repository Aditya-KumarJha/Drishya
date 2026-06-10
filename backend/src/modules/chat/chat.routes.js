import express from "express";
import { protect } from "../auth/auth.middleware.js";
import {
  askChat,
  createConversation,
  deleteConversation,
  getConversation,
  listConversations,
  updateConversation,
} from "./chat.service.js";

const router = express.Router();
const getUserId = (req) => req.user?._id || req.user?.userId;

router.use(protect);

router.get("/conversations", async (req, res) => {
  try {
    const conversations = await listConversations(getUserId(req));
    res.json({ success: true, data: conversations });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/conversations", async (req, res) => {
  try {
    const conversation = await createConversation({
      userId: getUserId(req),
      title: req.body.title,
      monitorIds: Array.isArray(req.body.monitorIds) ? req.body.monitorIds : [],
    });
    res.status(201).json({ success: true, data: conversation });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/conversations/:id", async (req, res) => {
  try {
    const conversation = await getConversation(getUserId(req), req.params.id);
    if (!conversation) return res.status(404).json({ error: "Conversation not found" });
    res.json({ success: true, data: conversation });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/conversations/:id", async (req, res) => {
  try {
    const conversation = await updateConversation({
      userId: getUserId(req),
      conversationId: req.params.id,
      title: req.body.title,
      monitorIds: Array.isArray(req.body.monitorIds) ? req.body.monitorIds : undefined,
    });
    res.json({ success: true, data: conversation });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/conversations/:id", async (req, res) => {
  try {
    const result = await deleteConversation({
      userId: getUserId(req),
      conversationId: req.params.id,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

router.post("/ask", async (req, res) => {
  try {
    const conversation = await askChat({
      userId: getUserId(req),
      conversationId: req.body.conversationId,
      title: req.body.title,
      question: req.body.question,
      monitorIds: Array.isArray(req.body.monitorIds) ? req.body.monitorIds : [],
      saveToMemory: req.body.saveToMemory !== false,
    });

    res.json({ success: true, data: conversation });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
