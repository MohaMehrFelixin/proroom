'use client';

import { useEffect, useState } from 'react';
import { useCallStore } from '@/stores/call';

interface CallHeaderProps {
  roomName: string;
  participantCount: number;
  isAdmin: boolean;
  onBack: () => void;
  onEndForAll: () => void;
}

const formatDuration = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export const CallHeader = ({ roomName, participantCount, isAdmin, onBack, onEndForAll }: CallHeaderProps) => {
  const status = useCallStore((s) => s.status);
  const callDuration = useCallStore((s) => s.callDuration);
  const setCallDuration = useCallStore((s) => s.setCallDuration);

  const [startTime] = useState(() => (status === 'active' ? Date.now() : 0));

  useEffect(() => {
    if (status !== 'active') return;
    const interval = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [status, startTime, setCallDuration]);

  return (
    <div className="flex items-center gap-3 bg-tg-bg-secondary/80 px-4 py-2.5 backdrop-blur-sm">
      <button
        onClick={onBack}
        className="rounded-lg p-1.5 text-tg-text-secondary hover:bg-tg-bg-input"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-tg-text">{roomName}</div>
        <div className="text-xs text-tg-text-secondary">
          {status === 'active'
            ? `${participantCount} participant${participantCount !== 1 ? 's' : ''} \u00B7 ${formatDuration(callDuration)}`
            : status === 'connecting'
              ? 'Connecting...'
              : 'Ringing...'}
        </div>
      </div>
      {isAdmin && (
        <button
          onClick={onEndForAll}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10"
          title="End call for everyone"
        >
          End All
        </button>
      )}
    </div>
  );
};
