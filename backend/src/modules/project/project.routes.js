import express from "express";
import mongoose from "mongoose";
import Project from "./project.model.js";
import Monitor from "../monitor/monitor.model.js";
import { protect } from "../auth/auth.middleware.js";

const router = express.Router();

const getUserId = (req) => req.user?._id || req.user?.userId;
const toObjectId = (id) => new mongoose.Types.ObjectId(id);

router.use(protect);

router.get("/", async (req, res) => {
  try {
    const projects = await Project.find({ userId: getUserId(req) }).sort({ createdAt: -1 }).lean();
    const monitorCounts = await Monitor.aggregate([
      { $match: { userId: toObjectId(getUserId(req)), projectId: { $ne: null } } },
      { $group: { _id: "$projectId", count: { $sum: 1 } } },
    ]);
    const countByProjectId = new Map(monitorCounts.map((item) => [item._id.toString(), item.count]));

    res.json({
      success: true,
      data: projects.map((project) => ({
        ...project,
        monitorCount: countByProjectId.get(project._id.toString()) || 0,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    if (!name) return res.status(400).json({ error: "Project name is required" });

    const project = await Project.create({
      userId: getUserId(req),
      name,
      description: String(req.body.description || "").trim(),
      publicStatusEnabled: req.body.publicStatusEnabled !== false,
    });

    res.status(201).json({ success: true, data: project });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const updates = {};
    if (req.body.name !== undefined) updates.name = String(req.body.name || "").trim();
    if (req.body.description !== undefined) updates.description = String(req.body.description || "").trim();
    if (req.body.publicStatusEnabled !== undefined) updates.publicStatusEnabled = req.body.publicStatusEnabled !== false;

    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, userId: getUserId(req) },
      updates,
      { new: true, runValidators: true }
    );
    if (!project) return res.status(404).json({ error: "Project not found" });

    res.json({ success: true, data: project });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const project = await Project.findOneAndDelete({ _id: req.params.id, userId: getUserId(req) });
    if (!project) return res.status(404).json({ error: "Project not found" });

    await Monitor.updateMany({ projectId: project._id, userId: getUserId(req) }, { projectId: null });
    res.json({ success: true, message: "Project deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
