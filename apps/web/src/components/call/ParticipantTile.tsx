'use client';

import { useCallback } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/cn';

interface ParticipantTileProps {
  stream: MediaStream | null;
  name: string;
  userId: string;
  isMuted?: boolean;
  isVideoOff?: boolean;
  isLocal?: boolean;
  isScreen?: boolean;
  isPinned?: boolean;
  onClick?: () => void;
  className?: string;
}

export const ParticipantTile = ({
  stream,
  name,
  userId,
  isMuted,
  isVideoOff,
  isLocal,
  isScreen,
  isPinned,
  onClick,
  className,
}: ParticipantTileProps) => {
  // Use ref callback so srcObject is set whenever the video element mounts
  const videoRefCallback = useCallback(
    (el: HTMLVideoElement | null) => {
      if (el && stream) {
        el.srcObject = stream;
      }
    },
    [stream],
  );

  const showVideo = stream && !isVideoOff;

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative flex items-center justify-center overflow-hidden rounded-xl bg-tg-bg-input',
        onClick && 'cursor-pointer',
        isPinned && 'ring-2 ring-tg-accent',
        className,
      )}
    >
      {showVideo ? (
        <video
          ref={videoRefCallback}
          autoPlay
          playsInline
          muted={isLocal}
          className={cn(
            'h-full w-full',
            isScreen ? 'object-contain' : 'object-cover',
            isLocal && !isScreen && '-scale-x-100',
          )}
        />
      ) : (
        <Avatar name={name} id={userId} size="lg" />
      )}

      {/* Name label */}
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-0.5">
        {isMuted && (
          <svg className="h-3 w-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
          </svg>
        )}
        <span className="text-xs text-white">
          {isLocal ? 'You' : name}
          {isScreen && ' (screen)'}
        </span>
      </div>
    </div>
  );
};
