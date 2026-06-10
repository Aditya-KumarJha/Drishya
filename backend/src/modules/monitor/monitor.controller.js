import { createMonitor, getAllMonitors, updateMonitorById, deleteMonitorById } from "./monitor.service.js";
import { normalizeMonitorInput } from "./monitor.validation.js";
import Project from "../project/project.model.js";
import User from "../auth/models/user.model.js";

const ensureProjectOwnership = async (projectId, userId) => {
  if (!projectId) return;
  const project = await Project.findOne({ _id: projectId, userId });
  if (!project) {
    throw new Error("Project not found or unauthorized");
  }
};

export const createMonitorController = async (req, res) => {
  try {
    const monitorInput = await normalizeMonitorInput(req.body);
    await ensureProjectOwnership(monitorInput.projectId, req.user._id);
    if (monitorInput.active !== false) {
      const user = await User.findById(req.user._id).select("credits");
      if (!user || user.credits <= 0) {
        return res.status(402).json({ error: "Credits exhausted. Purchase credits to create active monitors." });
      }
    }
    const monitor = await createMonitor({ ...monitorInput, userId: req.user._id });
    
    res.status(201).json(monitor);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const getAllMonitorsController = async (req, res) => {
  try {
    const monitors = await getAllMonitors(req.user._id);

    res.json({
      success: true,
      count: monitors.length,
      data: monitors,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateMonitorController = async (req, res) => {
  try {
    const { id } = req.params;
    const monitorInput = await normalizeMonitorInput(req.body, { partial: true });
    await ensureProjectOwnership(monitorInput.projectId, req.user._id);
    if (monitorInput.active === true) {
      const user = await User.findById(req.user._id).select("credits");
      if (!user || user.credits <= 0) {
        return res.status(402).json({ error: "Credits exhausted. Purchase credits to activate monitors." });
      }
    }
    const updated = await updateMonitorById(id, req.user._id, monitorInput);

    if (!updated) {
      return res.status(404).json({ error: "Monitor not found or unauthorized" });
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const deleteMonitorController = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteMonitorById(id, req.user._id);

    if (!deleted) {
      return res.status(404).json({ error: "Monitor not found or unauthorized" });
    }

    res.json({ success: true, message: "Monitor deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
