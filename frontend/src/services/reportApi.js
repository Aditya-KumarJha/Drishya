import axiosInstance from './axiosInstance';
import { API_BASE_URL } from './apiConfig';

export const getUptimeReport = async ({ range = '24h', projectId = '' } = {}) => {
  const { data } = await axiosInstance.get('/reports/uptime', {
    params: { range, ...(projectId ? { projectId } : {}) },
  });
  return data?.data || data;
};

export const getIncidentTimeline = async (incidentId) => {
  const { data } = await axiosInstance.get(`/reports/incidents/${incidentId}/timeline`);
  return data?.data || [];
};

export const getIncidentPostmortem = async (incidentId) => {
  const { data } = await axiosInstance.get(`/reports/incidents/${incidentId}/postmortem`);
  return data?.data || data;
};

export const getIncidentExportUrl = (incidentId, format) =>
  `${API_BASE_URL}/reports/incidents/${incidentId}/export.${format}`;

export const emailIncidentReport = async (incidentId) => {
  const { data } = await axiosInstance.post(`/reports/incidents/${incidentId}/email`);
  return data?.data || data;
};
