'use client';

import { cn } from '@/lib/cn';

interface CallControlsProps {
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onLeave: () => void;
}

export const CallControls = ({
  isAudioEnabled,
  isVideoEnabled,
  isScreenSharing,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onLeave,
}: CallControlsProps) => (
  <div className="flex items-center justify-center gap-2 bg-tg-bg-secondary/80 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-sm sm:gap-3 sm:pb-3">
    {/* Mic */}
    <button
      onClick={onToggleAudio}
      className={cn(
        'flex h-10 w-10 items-center justify-center rounded-full transition-colors sm:h-12 sm:w-12',
        isAudioEnabled
          ? 'bg-tg-bg-input text-tg-text hover:bg-tg-border'
          : 'bg-red-500 text-white hover:bg-red-600',
      )}
      title={isAudioEnabled ? 'Mute' : 'Unmute'}
    >
      {isAudioEnabled ? (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
        </svg>
      ) : (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
        </svg>
      )}
    </button>

    {/* Camera */}
    <button
      onClick={onToggleVideo}
      className={cn(
        'flex h-10 w-10 items-center justify-center rounded-full transition-colors sm:h-12 sm:w-12',
        isVideoEnabled
          ? 'bg-tg-bg-input text-tg-text hover:bg-tg-border'
          : 'bg-red-500 text-white hover:bg-red-600',
      )}
      title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
    >
      {isVideoEnabled ? (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9.75a2.25 2.25 0 002.25-2.25V7.5a2.25 2.25 0 00-2.25-2.25H4.5A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
        </svg>
      ) : (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9.75a2.25 2.25 0 002.25-2.25V7.5a2.25 2.25 0 00-2.25-2.25H4.5A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
        </svg>
      )}
    </button>

    {/* Screen Share */}
    <button
      onClick={onToggleScreenShare}
      className={cn(
        'flex h-10 w-10 items-center justify-center rounded-full transition-colors sm:h-12 sm:w-12',
        isScreenSharing
          ? 'bg-tg-accent text-white hover:bg-tg-accent/80'
          : 'bg-tg-bg-input text-tg-text hover:bg-tg-border',
      )}
      title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
    >
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25A2.25 2.25 0 015.25 3h13.5A2.25 2.25 0 0121 5.25z" />
      </svg>
    </button>

    {/* Leave */}
    <button
      onClick={onLeave}
      className="flex h-10 w-12 items-center justify-center rounded-full bg-red-500 text-white transition-colors hover:bg-red-600 sm:h-12 sm:w-14"
      title="Leave call"
    >
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
      </svg>
    </button>

  </div>
);
