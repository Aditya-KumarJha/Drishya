import axiosInstance from './axiosInstance';

export const getAdminSummary = async () => {
  const { data } = await axiosInstance.get('/admin/summary');
  return data;
};

export const getAdminMonitors = async () => {
  const { data } = await axiosInstance.get('/admin/monitors');
  return data;
};

export const getAdminUsers = async () => {
  const { data } = await axiosInstance.get('/admin/users');
  return data;
};

export const toggleUserStatus = async (id) => {
  const { data } = await axiosInstance.put(`/admin/users/${id}/toggle`);
  return data;
};

export const updateUserRole = async (id, role) => {
  const { data } = await axiosInstance.put(`/admin/users/${id}/role`, { role });
  return data;
};

export const getAdminIncidents = async () => {
  const { data } = await axiosInstance.get('/admin/incidents');
  return data;
};

export const resolveAdminIncident = async (id) => {
  const { data } = await axiosInstance.put(`/admin/incidents/${id}/resolve`);
  return data;
};

export const getSystemAnalytics = async () => {
  const { data } = await axiosInstance.get('/admin/analytics');
  return data;
};

