import { get, set } from 'idb-keyval';
import type { DecryptedMessage } from '@proroom/types';

const CACHE_PREFIX = 'proroom:messages:';

interface MessageCache {
  [roomId: string]: DecryptedMessage[];
}

let cache: MessageCache | null = null;
let currentUserId: string | null = null;

const getCacheKey = (userId: string): string => `${CACHE_PREFIX}${userId}`;

const loadCache = async (userId: string): Promise<MessageCache> => {
  if (cache && currentUserId === userId) return cache;
  currentUserId = userId;
  const stored = await get<string>(getCacheKey(userId));
  cache = stored ? JSON.parse(stored) : {};
  return cache!;
};

const persistCache = async (): Promise<void> => {
  if (cache && currentUserId) {
    await set(getCacheKey(currentUserId), JSON.stringify(cache));
  }
};

export const getCachedMessages = async (userId: string, roomId: string): Promise<DecryptedMessage[] | null> => {
  const c = await loadCache(userId);
  return c[roomId] ?? null;
};

export const setCachedMessages = async (userId: string, roomId: string, messages: DecryptedMessage[]): Promise<void> => {
  const c = await loadCache(userId);
  c[roomId] = messages;
  await persistCache();
};

export const appendCachedMessage = async (userId: string, roomId: string, message: DecryptedMessage): Promise<void> => {
  const c = await loadCache(userId);
  if (!c[roomId]) c[roomId] = [];
  c[roomId].push(message);
  await persistCache();
};

export const updateCachedMessage = async (
  userId: string,
  roomId: string,
  messageId: string,
  update: Partial<DecryptedMessage>,
): Promise<void> => {
  const c = await loadCache(userId);
  const messages = c[roomId];
  if (!messages) return;
  const idx = messages.findIndex((m) => m.id === messageId);
  if (idx !== -1) {
    messages[idx] = { ...messages[idx], ...update };
    await persistCache();
  }
};
