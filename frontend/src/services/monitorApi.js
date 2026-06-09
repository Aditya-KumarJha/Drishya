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
    url: monitor.url,
    method: monitor.method || 'GET',
    interval: monitor.interval || 60000,
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
export const createMonitor = async ({ url, method, interval, active }) => {
  try {
    const { data: created } = await axiosInstance.post('/monitors', {
      url,
      method,
      interval: Number(interval),
    });

    const createdMonitor = created?.data || created;

    // If monitor should be paused, update it after creation
    if (active === false) {
      const id = createdMonitor._id || createdMonitor.id;
      const updated = await updateMonitor(id, { 
        url: createdMonitor.url,
        method: createdMonitor.method,
        interval: createdMonitor.interval,
        active: false 
      });
      return updated;
    }

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
    const { data: payload } = await axiosInstance.put(`/monitors/${id}`, {
      url: data.url,
      method: data.method,
      interval: Number(data.interval),
      active: data.active,
    });

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
