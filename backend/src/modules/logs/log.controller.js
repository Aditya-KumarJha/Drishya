import { getMonitorAnalytics } from "./log.service.js";

export const getMonitorAnalyticsController = async (req, res) => {
  try {
    const { monitorId } = req.params;
    const { range } = req.query; // ?range=1h or 24h

    const data = await getMonitorAnalytics(monitorId, range);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}