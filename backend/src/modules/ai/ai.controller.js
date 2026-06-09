import Monitor from "../monitor/monitor.model.js";
import { buildMonitorInsight, listMonitorInsights } from "./ai.service.js";

const getAuthenticatedUserId = (req) => req.user?._id?.toString?.() || req.user?.userId || null;

export const getAIInsights = async (req, res) => {
  try {
    const { monitorId } = req.params;
    const monitor = await Monitor.findOne({
      _id: monitorId,
      userId: getAuthenticatedUserId(req),
    });

    if (!monitor) {
      return res.status(404).json({ message: "Monitor not found" });
    }

    await buildMonitorInsight({ monitorId, source: "ON_DEMAND" });
    const insights = await listMonitorInsights(monitorId);

    return res.json({
      data: insights,
      monitorId,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "AI failed" });
  }
};

//unused code for future use - to fetch AI timeline for a monitor
// export const getAITimeline = async (req, res) => {
//   try {
//     const { monitorId } = req.params;

//     const insights = await AIInsight.findById({ monitorId })
//       .sort({ createdAt: -1 });

//     res.json(insights);

//   } catch (err) {
//     res.status(500).json({ message: "Failed to fetch timeline" });
//   }
// };
