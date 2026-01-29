'use client';

import { useRef, useCallback } from 'react';
import { getChatSocket } from '@/lib/socket';

export const useTypingIndicator = (roomId: string) => {
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const startTyping = useCallback(() => {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      try {
        const socket = getChatSocket();
        socket.emit('typing:start', roomId);
      } catch {
        // Socket not ready
      }
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      try {
        const socket = getChatSocket();
        socket.emit('typing:stop', roomId);
      } catch {
        // Socket not ready
      }
    }, 2000);
  }, [roomId]);

  const stopTyping = useCallback(() => {
    if (isTypingRef.current) {
      isTypingRef.current = false;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      try {
        const socket = getChatSocket();
        socket.emit('typing:stop', roomId);
      } catch {
        // Socket not ready
      }
    }
  }, [roomId]);

  return { startTyping, stopTyping };
};
