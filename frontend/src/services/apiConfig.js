
const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://smart-monitoring-web-platform-1.onrender.com/';

if (!rawApiBaseUrl) {
  throw new Error('Missing VITE_API_BASE_URL');
}


export const API_BASE_URL = rawApiBaseUrl.replace(/\/$/, '');
