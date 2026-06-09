export const formatAdminStats = (summary) => ({
  totalMonitors: summary.totalMonitors || 0,
  activeMonitors: summary.activeMonitors || 0,
  pausedMonitors: summary.pausedMonitors || 0,
  activeIncidents: summary.activeIncidents || 0,
  uptime: summary.uptime || 0,
});
