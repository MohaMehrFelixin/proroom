import { create } from 'zustand';
import type { Room, DecryptedMessage } from '@proroom/types';

interface LastMessage {
  content: string;
  senderId: string;
  createdAt: string;
}

interface ChatState {
  rooms: Room[];
  activeRoomId: string | null;
  messages: Record<string, DecryptedMessage[]>;
  onlineUsers: Set<string>;
  typingUsers: Record<string, Set<string>>;
  lastMessages: Record<string, LastMessage>;
  unreadCounts: Record<string, number>;

  setRooms: (rooms: Room[]) => void;
  setActiveRoom: (roomId: string | null) => void;
  addMessage: (roomId: string, message: DecryptedMessage) => void;
  setMessages: (roomId: string, messages: DecryptedMessage[]) => void;
  editMessage: (roomId: string, messageId: string, content: string) => void;
  deleteMessage: (roomId: string, messageId: string) => void;
  setUserOnline: (userId: string) => void;
  setUserOffline: (userId: string) => void;
  setUserTyping: (roomId: string, userId: string) => void;
  clearUserTyping: (roomId: string, userId: string) => void;
  setLastMessage: (roomId: string, message: LastMessage) => void;
  incrementUnread: (roomId: string) => void;
  clearUnread: (roomId: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  rooms: [],
  activeRoomId: null,
  messages: {},
  onlineUsers: new Set(),
  typingUsers: {},
  lastMessages: {},
  unreadCounts: {},

  setRooms: (rooms) => set({ rooms }),

  setActiveRoom: (roomId) => set({ activeRoomId: roomId }),

  addMessage: (roomId, message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [roomId]: [...(state.messages[roomId] ?? []), message],
      },
      lastMessages: {
        ...state.lastMessages,
        [roomId]: {
          content: message.content,
          senderId: message.senderId,
          createdAt: message.createdAt,
        },
      },
    })),

  setMessages: (roomId, messages) =>
    set((state) => {
      const last = messages[messages.length - 1];
      const lastMessages = last
        ? {
            ...state.lastMessages,
            [roomId]: {
              content: last.content,
              senderId: last.senderId,
              createdAt: last.createdAt,
            },
          }
        : state.lastMessages;
      return {
        messages: { ...state.messages, [roomId]: messages },
        lastMessages,
      };
    }),

  editMessage: (roomId, messageId, content) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [roomId]: (state.messages[roomId] ?? []).map((m) =>
          m.id === messageId ? { ...m, content, isEdited: true } : m,
        ),
      },
    })),

  deleteMessage: (roomId, messageId) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [roomId]: (state.messages[roomId] ?? []).map((m) =>
          m.id === messageId
            ? { ...m, content: 'This message was deleted', isDeleted: true }
            : m,
        ),
      },
    })),

  setUserOnline: (userId) =>
    set((state) => {
      const updated = new Set(state.onlineUsers);
      updated.add(userId);
      return { onlineUsers: updated };
    }),

  setUserOffline: (userId) =>
    set((state) => {
      const updated = new Set(state.onlineUsers);
      updated.delete(userId);
      return { onlineUsers: updated };
    }),

  setUserTyping: (roomId, userId) =>
    set((state) => {
      const current = state.typingUsers[roomId] ?? new Set();
      const updated = new Set(current);
      updated.add(userId);
      return { typingUsers: { ...state.typingUsers, [roomId]: updated } };
    }),

  clearUserTyping: (roomId, userId) =>
    set((state) => {
      const current = state.typingUsers[roomId];
      if (!current) return state;
      const updated = new Set(current);
      updated.delete(userId);
      return { typingUsers: { ...state.typingUsers, [roomId]: updated } };
    }),

  setLastMessage: (roomId, message) =>
    set((state) => ({
      lastMessages: { ...state.lastMessages, [roomId]: message },
    })),

  incrementUnread: (roomId) =>
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [roomId]: (state.unreadCounts[roomId] ?? 0) + 1,
      },
    })),

  clearUnread: (roomId) =>
    set((state) => ({
      unreadCounts: { ...state.unreadCounts, [roomId]: 0 },
    })),
}));
