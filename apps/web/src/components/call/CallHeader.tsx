'use client';

import { useEffect, useState } from 'react';
import { useCallStore } from '@/stores/call';

interface CallHeaderProps {
  roomName: string;
  participantCount: number;
  isAdmin: boolean;
  onBack: () => void;
  onEndForAll: () => void;
  onAddPeople?: () => void;
}

const formatDuration = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export const CallHeader = ({ roomName, participantCount, isAdmin, onBack, onEndForAll, onAddPeople }: CallHeaderProps) => {
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
      {isAdmin && onAddPeople && (
        <button
          onClick={onAddPeople}
          className="rounded-lg p-1.5 text-tg-text-secondary transition-colors hover:bg-tg-bg-input hover:text-tg-text"
          title="Add people"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
          </svg>
        </button>
      )}
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
