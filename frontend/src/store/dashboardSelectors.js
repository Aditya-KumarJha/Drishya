import { createSelector } from '@reduxjs/toolkit';

export const selectDashboard = (state) => state.dashboard;

export const selectMonitors = (state) => state.dashboard.monitors;

export const selectAnalyticsByMonitorId = (state) => state.dashboard.analyticsByMonitorId;

export const selectIncidentsByMonitorId = (state) => state.dashboard.incidentsByMonitorId;

export const selectAIInsightsByMonitorId = (state) => state.dashboard.aiInsightsByMonitorId;

export const selectAlerts = (state) => state.dashboard.alerts;

export const selectDashboardSummary = (state) => state.dashboard.dashboardSummary;

export const selectDashboardCounts = createSelector([selectMonitors], (monitors) => {
  const activeCount = monitors.filter((monitor) => monitor.active).length;
  const pausedCount = monitors.length - activeCount;
  const averageInterval = activeCount
    ? Math.round(
      monitors
        .filter((monitor) => monitor.active)
        .reduce((total, monitor) => total + Number(monitor.interval || 0), 0) / activeCount / 1000,
    )
    : 0;

  return {
    activeCount,
    averageInterval,
    pausedCount,
    totalCount: monitors.length,
  };
});

export const selectFilteredMonitors = createSelector(
  [
    selectMonitors,
    (_, query) => query,
    (_, __, statusFilter) => statusFilter,
  ],
  (monitors, query, statusFilter) => monitors.filter((monitor) => {
    const matchesQuery = `${monitor.name} ${monitor.url} ${monitor.method}`
      .toLowerCase()
      .includes(query.toLowerCase());
    const matchesStatus = statusFilter === 'all' || monitor.status === statusFilter;

    return matchesQuery && matchesStatus;
  }),
);
