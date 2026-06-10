import axiosInstance from './axiosInstance';

/**
 * Transform backend monitor object to frontend format
 * Converts MongoDB _id to id and extracts hostname from URL
 */
export const mapMonitor = (monitor) => {
  if (!monitor) return null;

  const id = monitor._id || monitor.id;
  const active = monitor.active !== false;
  const status = active ? 'active' : 'paused';

  const hostname = (() => {
    try {
      return new URL(monitor.url).hostname;
    } catch {
      return monitor.url;
    }
  })();

  return {
    id,
    name: hostname,
    projectId: monitor.projectId || '',
    groupName: monitor.groupName || 'Default',
    url: monitor.url,
    method: monitor.method || 'GET',
    interval: monitor.interval || 60000,
    timeoutMs: monitor.timeoutMs || 10000,
    expectedStatusCodes: Array.isArray(monitor.expectedStatusCodes) ? monitor.expectedStatusCodes : [],
    headers: monitor.headers || {},
    body: monitor.body || '',
    responseKeyword: monitor.responseKeyword || '',
    notificationEmails: Array.isArray(monitor.notificationEmails) ? monitor.notificationEmails : [],
    checkTypes: Array.isArray(monitor.checkTypes) && monitor.checkTypes.length ? monitor.checkTypes : ['HTTP'],
    regions: Array.isArray(monitor.regions) && monitor.regions.length ? monitor.regions : ['primary'],
    cronExpression: monitor.cronExpression || '',
    sslDaysRemaining: monitor.sslDaysRemaining,
    sslExpiresAt: monitor.sslExpiresAt,
    dnsResolvedAddresses: Array.isArray(monitor.dnsResolvedAddresses) ? monitor.dnsResolvedAddresses : [],
    publicSlug: monitor.publicSlug || '',
    publicStatusEnabled: monitor.publicStatusEnabled !== false,
    lastStatus: monitor.lastStatus || 'PENDING',
    lastCheckedAt: monitor.lastCheckedAt,
    lastResponseTime: monitor.lastResponseTime || 0,
    failureCount: monitor.failureCount || 0,
    active,
    status,
    createdAt: monitor.createdAt,
    updatedAt: monitor.updatedAt,
  };
};


export const getMonitors = async () => {
  try {
  
    const { data } = await axiosInstance.get('/monitors');
 
    const monitors = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];

    return monitors.map(mapMonitor).filter(Boolean);
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to fetch monitors', { cause: error });
  }
};

/**
 * Create a new monitor
 * POST /monitors
 */
const buildMonitorPayload = (data) => ({
  projectId: data.projectId || null,
  groupName: data.groupName || 'Default',
  url: data.url,
  method: data.method,
  interval: Number(data.interval),
  timeoutMs: Number(data.timeoutMs || 10000),
  expectedStatusCodes: Array.isArray(data.expectedStatusCodes)
    ? data.expectedStatusCodes
    : String(data.expectedStatusCodes || '')
      .split(',')
      .map((item) => Number(item.trim()))
      .filter(Number.isFinite),
  headers: data.headers || {},
  body: data.body || '',
  responseKeyword: data.responseKeyword || '',
  checkTypes: Array.isArray(data.checkTypes)
    ? data.checkTypes
    : String(data.checkTypes || 'HTTP').split(',').map((item) => item.trim()).filter(Boolean),
  regions: Array.isArray(data.regions)
    ? data.regions
    : String(data.regions || 'primary').split(',').map((item) => item.trim()).filter(Boolean),
  cronExpression: data.cronExpression || '',
  notificationEmails: Array.isArray(data.notificationEmails)
    ? data.notificationEmails
    : String(data.notificationEmails || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  publicStatusEnabled: data.publicStatusEnabled !== false,
  active: data.active !== false,
});

export const createMonitor = async (monitorData) => {
  try {
    const { data: created } = await axiosInstance.post('/monitors', buildMonitorPayload(monitorData));

    const createdMonitor = created?.data || created;
    return mapMonitor(createdMonitor);
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to create monitor', { cause: error });
  }
};

/**
 * Update an existing monitor
 * PUT /monitors/:id
 */
export const updateMonitor = async (id, data) => {
  try {
    const { data: payload } = await axiosInstance.put(`/monitors/${id}`, buildMonitorPayload(data));

    return mapMonitor(payload?.data || payload);
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to update monitor', { cause: error });
  }
};

/**
 * Delete a monitor
 * DELETE /monitors/:id
 */
export const deleteMonitor = async (id) => {
  try {
    await axiosInstance.delete(`/monitors/${id}`);
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to delete monitor', { cause: error });
  }
};
