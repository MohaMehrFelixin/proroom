'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { useChatStore } from '@/stores/chat';
import { getChatSocket } from '@/lib/socket';
import { Sidebar } from '@/components/layout/Sidebar';
import { IncomingCallDialog } from '@/components/call/IncomingCallDialog';

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const currentUser = useAuthStore((s) => s.user);
  const {
    setUserOnline,
    setUserOffline,
    setUserTyping,
    clearUserTyping,
  } = useChatStore();

  // This only runs on the client, after Zustand has rehydrated from localStorage.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.push('/login');
    }
  }, [hydrated, isAuthenticated, router]);

  // Wire up socket presence events
  useEffect(() => {
    if (!isAuthenticated) return;

    let socket: ReturnType<typeof getChatSocket>;
    try {
      socket = getChatSocket();
    } catch {
      return;
    }

    const handleUserOnline = (data: { userId: string }) => {
      setUserOnline(data.userId);
    };

    const handleUserOffline = (data: { userId: string }) => {
      setUserOffline(data.userId);
    };

    const handleTyping = (data: { roomId: string; userId: string }) => {
      if (data.userId !== currentUser?.id) {
        setUserTyping(data.roomId, data.userId);
      }
    };

    const handleStopTyping = (data: { roomId: string; userId: string }) => {
      if (data.userId !== currentUser?.id) {
        clearUserTyping(data.roomId, data.userId);
      }
    };

    socket.on('user:online', handleUserOnline);
    socket.on('user:offline', handleUserOffline);
    socket.on('user:typing', handleTyping);
    socket.on('user:stop-typing', handleStopTyping);

    return () => {
      socket.off('user:online', handleUserOnline);
      socket.off('user:offline', handleUserOffline);
      socket.off('user:typing', handleTyping);
      socket.off('user:stop-typing', handleStopTyping);
    };
  }, [isAuthenticated, currentUser?.id, setUserOnline, setUserOffline, setUserTyping, clearUserTyping]);

  if (!hydrated || !isAuthenticated) return null;

  return (
    <div className="flex h-screen bg-tg-bg-dark">
      <Sidebar />
      <main className="flex-1 overflow-hidden">{children}</main>
      <IncomingCallDialog />
    </div>
  );
};

export default MainLayout;
