'use client';

import { useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getChatSocket } from '@/lib/socket';
import { Avatar } from '@/components/ui/Avatar';

interface IncomingCall {
  roomId: string;
  callerId: string;
  callerName: string;
  type: 'audio' | 'video';
}

export const IncomingCallDialog = () => {
  const router = useRouter();
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);

  useEffect(() => {
    let socket: ReturnType<typeof getChatSocket>;
    try {
      socket = getChatSocket();
    } catch {
      return;
    }

    const handleIncoming = (data: IncomingCall) => {
      setIncomingCall(data);
    };

    socket.on('call:incoming', handleIncoming);
    return () => {
      socket.off('call:incoming', handleIncoming);
    };
  }, []);

  const handleAccept = useCallback(() => {
    if (!incomingCall) return;
    setIncomingCall(null);
    router.push(`/calls/${incomingCall.roomId}`);
  }, [incomingCall, router]);

  const handleReject = useCallback(() => {
    if (incomingCall) {
      try {
        const socket = getChatSocket();
        socket.emit('call:reject', { roomId: incomingCall.roomId });
      } catch {
        // Socket not ready
      }
    }
    setIncomingCall(null);
  }, [incomingCall]);

  if (!incomingCall) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-80 rounded-2xl bg-tg-bg-secondary p-6 shadow-2xl">
        <div className="mb-5 flex flex-col items-center text-center">
          {/* Pulsing ring animation */}
          <div className="relative mb-4">
            <div className="absolute inset-0 animate-ping rounded-full bg-tg-accent/30" />
            <div className="absolute inset-0 animate-pulse rounded-full bg-tg-accent/20" />
            <div className="relative">
              <Avatar name={incomingCall.callerName} id={incomingCall.callerId} size="lg" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-tg-text">
            {incomingCall.type === 'video' ? 'Video' : 'Voice'} Call
          </h3>
          <p className="mt-1 text-sm text-tg-text-secondary">
            {incomingCall.callerName}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleReject}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 py-3 font-medium text-white transition-colors hover:bg-red-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
            Decline
          </button>
          <button
            onClick={handleAccept}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-tg-green py-3 font-medium text-white transition-colors hover:bg-tg-green/80"
          >
            {incomingCall.type === 'video' ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9.75a2.25 2.25 0 002.25-2.25V7.5a2.25 2.25 0 00-2.25-2.25H4.5A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
              </svg>
            )}
            Accept
          </button>
        </div>
      </div>
    </div>
  );
};
