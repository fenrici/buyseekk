import { io, Socket } from 'socket.io-client';
import { API_URL, getToken } from './api';

let socket: Socket | null = null;

export function getNotificationsSocket(): Socket {
  if (!socket) {
    socket = io(`${API_URL}/notifications`, { autoConnect: false });
  }
  return socket;
}

export function connectNotificationsSocket() {
  const s = getNotificationsSocket();
  const token = getToken();
  if (!token) return s;
  s.auth = { token };
  if (!s.connected) s.connect();
  return s;
}

export function disconnectNotificationsSocket() {
  socket?.disconnect();
  socket = null;
}
