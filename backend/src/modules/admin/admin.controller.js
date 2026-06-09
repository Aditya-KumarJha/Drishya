import {
  getAdminSummary,
  getAdminMonitors,
  getAllUsers,
  toggleUserStatus,
  updateUserRole,
  getAllIncidentsAdmin,
  resolveIncidentAdmin,
  getSystemAnalytics,
} from "./admin.service.js";

// ───────────────────────── SYSTEM OVERVIEW ─────────────────────────

export const getAdminSummaryController = async (req, res) => {
  try {
    const summary = await getAdminSummary();
    res.json({ success: true, data: summary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getAdminMonitorsController = async (req, res) => {
  try {
    const monitors = await getAdminMonitors();
    res.json({
      success: true,
      count: monitors.length,
      data: monitors,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ───────────────────────── USER MANAGEMENT ─────────────────────────

export const getAllUsersController = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const search = req.query.search || "";

    const result = await getAllUsers({ page, limit, search });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const toggleUserStatusController = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent admin from disabling themselves
    const currentUserId = req.user?._id?.toString?.() || req.user?.userId;
    if (id === currentUserId) {
      return res.status(400).json({ error: "Cannot disable your own account" });
    }

    const result = await toggleUserStatus(id);
    if (!result) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      success: true,
      message: `User ${result.isActive ? "enabled" : "disabled"}`,
      data: result,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateUserRoleController = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ error: "Role is required" });
    }

    const user = await updateUserRole(id, role);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ success: true, message: `Role updated to ${role}`, data: user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// ───────────────────────── INCIDENT MANAGEMENT ─────────────────────

export const getAllIncidentsAdminController = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const status = req.query.status || "";

    const result = await getAllIncidentsAdmin({ page, limit, status });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const resolveIncidentAdminController = async (req, res) => {
  try {
    const { id } = req.params;
    const incident = await resolveIncidentAdmin(id);

    if (!incident) {
      return res.status(404).json({ error: "Open incident not found" });
    }

    res.json({ success: true, message: "Incident resolved", data: incident });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ───────────────────────── SYSTEM ANALYTICS ─────────────────────────

export const getSystemAnalyticsController = async (req, res) => {
  try {
    const analytics = await getSystemAnalytics();
    res.json({ success: true, data: analytics });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
