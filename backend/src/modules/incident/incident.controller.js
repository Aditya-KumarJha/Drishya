import Incident from './incident.model.js';
import Monitor from '../monitor/monitor.model.js';

const getAuthenticatedUserId = req =>
  req.user?._id?.toString?.() || req.user?.userId || null;

const getUserMonitorIds = async userId => {
  const monitors = await Monitor.find({ userId }).select('_id').lean();
  return monitors.map(m => m._id);
};

export const getAllIncidents = async (req, res) => {
  try {
    const monitorIds = await getUserMonitorIds(getAuthenticatedUserId(req));
    const { status } = req.query;

    const filter = { monitorId: { $in: monitorIds } };
    if (status === 'OPEN' || status === 'RESOLVED') {
      filter.status = status;
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [incidents, total] = await Promise.all([
      Incident.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('monitorId', 'url method'),
      Incident.countDocuments(filter),
    ]);

    res.json({
      success: true,
      count: incidents.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      data: incidents,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getIncidentsByMonitor = async (req, res) => {
  try {
    const { monitorId } = req.params;
    const userId = getAuthenticatedUserId(req);

    const monitor = await Monitor.findOne({ _id: monitorId, userId });
    if (!monitor) {
      return res.status(404).json({ error: 'Monitor not found' });
    }

    const incidents = await Incident.find({ monitorId })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, count: incidents.length, data: incidents });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getIncidentById = async (req, res) => {
  try {
    const { id } = req.params;
    const monitorIds = await getUserMonitorIds(getAuthenticatedUserId(req));

    const incident = await Incident.findOne({
      _id: id,
      monitorId: { $in: monitorIds },
    }).populate('monitorId', 'url method');

    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    res.json({ success: true, data: incident });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const resolveIncidentManually = async (req, res) => {
  try {
    const { id } = req.params;
    const monitorIds = await getUserMonitorIds(getAuthenticatedUserId(req));

    const incident = await Incident.findOne({
      _id: id,
      monitorId: { $in: monitorIds },
      status: 'OPEN',
    });

    if (!incident) {
      return res.status(404).json({ error: 'Open incident not found' });
    }

    incident.status = 'RESOLVED';
    incident.resolvedAt = new Date();
    incident.message = `${incident.message || ''} (manually resolved)`.trim();
    await incident.save();

    console.log(`✅ Incident ${id} manually resolved`);

    res.json({ success: true, message: 'Incident resolved', data: incident });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getIncidentStats = async (req, res) => {
  try {
    const monitorIds = await getUserMonitorIds(getAuthenticatedUserId(req));
    const filter = { monitorId: { $in: monitorIds } };

    const [total, open, resolved] = await Promise.all([
      Incident.countDocuments(filter),
      Incident.countDocuments({ ...filter, status: 'OPEN' }),
      Incident.countDocuments({ ...filter, status: 'RESOLVED' }),
    ]);

    res.json({
      success: true,
      data: { total, open, resolved },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
