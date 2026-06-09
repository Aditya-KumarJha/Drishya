import axiosInstance from './axiosInstance';

export const getAlerts = async () => {
  const { data } = await axiosInstance.get('/alerts');
  return data;
};

export const getAlertStats = async () => {
  const { data } = await axiosInstance.get('/alerts/stats');
  return data;
};

export const getAlertsByMonitor = async (monitorId) => {
  const { data } = await axiosInstance.get(`/alerts/${monitorId}`);
  return data;
};

