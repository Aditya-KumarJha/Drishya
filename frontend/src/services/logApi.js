import axiosInstance from './axiosInstance';

/**
 * Fetch monitor analytics (response times, uptime, etc.)
 * GET /logs/analytics/:monitorId?range=24h
 * 
 * Returns chart-safe structure even if API fails
 */
export const getMonitorAnalytics = async (monitorId, range = '24h') => {
  try {
    const { data } = await axiosInstance.get(`/logs/analytics/${monitorId}`, {
      params: { range },
    });

    const analytics = data?.data || data || {};

    return {
      avgLatency: Number(analytics.avgLatency || 0),
      failures: Number(analytics.failures || 0),
      status: analytics.status || 'NO_LOGS',
      success: Number(analytics.success || 0),
      totalChecks: Number(analytics.totalChecks || 0),
      trend: Array.isArray(analytics.trend) ? analytics.trend : [],
      uptime: Number(analytics.uptime || 0),
    };
  } catch (error) {
    console.warn(`Failed to fetch analytics for monitor ${monitorId}:`, error.message);

    return {
      avgLatency: 0,
      failures: 0,
      status: 'NO_LOGS',
      success: 0,
      totalChecks: 0,
      trend: [],
      uptime: 0,
    };
  }
};
