import { cn } from '@/lib/cn';

interface ScrollToBottomProps {
  visible: boolean;
  onClick: () => void;
  unreadCount?: number;
}

export const ScrollToBottom = ({ visible, onClick, unreadCount }: ScrollToBottomProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        'absolute bottom-20 right-6 z-10 rounded-full bg-tg-bg-secondary p-2.5 shadow-lg transition-all',
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0',
      )}
    >
      {unreadCount && unreadCount > 0 ? (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-tg-accent px-1 text-[10px] font-bold text-white">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      ) : null}
      <svg className="h-5 w-5 text-tg-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
    </button>
  );
};
