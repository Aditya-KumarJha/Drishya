import axios from 'axios';
import { API_BASE_URL } from './apiConfig';

export const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const authAxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_AUTH_API_URL || "http://localhost:4000/",
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Yahan un routes ki list dein jo Guest-friendly hain aur unhe Sign-in ki zaroorat nahi hai
const publicRoutes = ['/', '/home',"/signup"]; // Apne hisaab se routes adjust karein

const setupAxiosInterceptor = (instance) => {
  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      const currentPath = window.location.pathname;

      // 1. Agar request refresh-token ki hai to intercept na karein
      if (originalRequest.url?.includes('/auth/refresh-token')) {
        return Promise.reject(error);
      }

      // 2. Public Routes ka check
      const isPublicRoute = publicRoutes.some((route) => 
        currentPath === route || currentPath.startsWith(route + '/') // Agar dynamic nested routes hain
      );

      // Agar user ek public route par hai, to hum use 401 hone par redirect nahi karenge
      if (isPublicRoute) {
        return Promise.reject(error);
      }

      // 3. Protected Routes ka check (Agar private page par ho tabhi redirect karein)
      if (error.response?.status === 401 && !originalRequest._retry) {
        
        if (currentPath === '/signin') {
          return Promise.reject(error);
        }

        originalRequest._retry = true;

        try {
          await authAxiosInstance.post('/auth/refresh-token', {}, { withCredentials: true });
          return instance(originalRequest);
        } catch (refreshError) {
          localStorage.removeItem('user');
          window.location.href = '/signin';
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    }
  );
};

setupAxiosInterceptor(axiosInstance);
setupAxiosInterceptor(authAxiosInstance);

export default axiosInstance;