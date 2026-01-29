import { io, Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '@proroom/types';
import { useAuthStore } from '@/stores/auth';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:4000';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let chatSocket: TypedSocket | null = null;
let mediaSocket: Socket | null = null;

export const getChatSocket = (): TypedSocket => {
  if (chatSocket?.connected) return chatSocket;

  const token = useAuthStore.getState().accessToken;
  if (!token) throw new Error('Not authenticated');

  chatSocket = io(WS_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
  }) as TypedSocket;

  return chatSocket;
};

export const getMediaSocket = (): Socket => {
  if (mediaSocket?.connected) return mediaSocket;

  const token = useAuthStore.getState().accessToken;
  if (!token) throw new Error('Not authenticated');

  mediaSocket = io(`${WS_URL}/media`, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });

  return mediaSocket;
};

export const disconnectAll = () => {
  chatSocket?.disconnect();
  mediaSocket?.disconnect();
  chatSocket = null;
  mediaSocket = null;
};
