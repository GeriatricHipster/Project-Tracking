import { io } from 'socket.io-client';

const apiBase = import.meta.env.VITE_API_URL || '/api';
const defaultSocketUrl = apiBase.startsWith('http')
  ? apiBase.replace(/\/api\/?$/, '')
  : window.location.origin;
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || defaultSocketUrl;

export function createProjectSocket({ token, projectId, onChange, onError }) {
  const socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling']
  });

  socket.on('connect', () => {
    socket.emit('joinProject', projectId, (reply) => {
      if (!reply || !reply.ok) {
        onError?.(reply?.error || 'Could not join the project update room.');
      }
    });
  });

  socket.on('connect_error', (error) => {
    onError?.(error.message || 'Realtime connection failed.');
  });

  socket.on('project:changed', (payload) => {
    onChange?.(payload);
  });

  return socket;
}
