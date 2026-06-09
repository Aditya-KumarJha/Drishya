import { io } from 'socket.io-client';
import { API_BASE_URL } from './apiConfig';
import { getCurrentUser } from './authApi';

let socket = null;

export const getSocket = () => socket;

export const connectSocket = () => {
  if (socket) return socket;

  socket = io(API_BASE_URL, {
    withCredentials: true,
    transports: ['websocket', 'polling'],
    autoConnect: true,
  });

  socket.on('connect_error', (err) => {
    console.warn('Socket connect_error:', err?.message || err);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (!socket) return;
  socket.disconnect();
  socket = null;
};

export const joinUserRoom = () => {
  const user = getCurrentUser();
  if (!socket || !user?.id) return;
  socket.emit('join:user', user.id);
};

export const joinMonitorRoom = (monitorId) => {
  if (!socket || !monitorId) return;
  socket.emit('join:monitor', monitorId);
};

export const leaveMonitorRoom = (monitorId) => {
  if (!socket || !monitorId) return;
  socket.emit('leave:monitor', monitorId);
};

