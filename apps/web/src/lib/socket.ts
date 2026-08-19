import { io, Socket } from 'socket.io-client';
import { API_URL, getToken } from './api';

let socket: Socket | null = null;

export function getChatSocket(): Socket {
  if (!socket) {
    socket = io(`${API_URL}/chat`, {
      autoConnect: false,
      auth: (cb) => {
        cb({ token: getToken() });
      },
    });
  }
  return socket;
}

export function disconnectChatSocket() {
  socket?.disconnect();
  socket = null;
  void import('./chat-unread-socket')
    .then((mod) => mod.resetChatUnreadSocketBridge())
    .catch(() => {});
}
