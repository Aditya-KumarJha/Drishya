import { createMonitor, getAllMonitors, updateMonitorById, deleteMonitorById } from "./monitor.service.js";
import { normalizeMonitorInput } from "./monitor.validation.js";

export const createMonitorController = async (req, res) => {
  try {
    const monitorInput = await normalizeMonitorInput(req.body);
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
