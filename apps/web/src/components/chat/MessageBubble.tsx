'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/cn';
import type { DecryptedMessage } from '@proroom/types';

interface MessageBubbleProps {
  message: DecryptedMessage;
  isOwn: boolean;
  showSenderName: boolean;
  senderName: string;
  onEdit: (msg: DecryptedMessage) => void;
  onDelete: (msgId: string) => void;
}

const formatTime = (dateStr: string): string => {
  return new Date(dateStr).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const MessageBubble = ({
  message,
  isOwn,
  showSenderName,
  senderName,
  onEdit,
  onDelete,
}: MessageBubbleProps) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setShowMenu(false);
  };

  return (
    <div
      className={cn(
        'group relative mb-1 flex px-4',
        isOwn ? 'justify-end' : 'justify-start',
      )}
    >
      <div className="relative max-w-[85%] sm:max-w-[75%] md:max-w-[65%]">
        {showSenderName && !isOwn && (
          <div className="mb-0.5 pl-3 text-xs font-semibold text-tg-accent">
            {senderName}
          </div>
        )}
        <div
          onContextMenu={(e) => {
            e.preventDefault();
            setShowMenu(true);
          }}
          className={cn(
            'relative rounded-xl px-3 py-1.5',
            message.isDeleted
              ? 'bg-tg-bg-input italic text-tg-text-secondary'
              : isOwn
                ? 'rounded-br-sm bg-tg-msg-out text-tg-text'
                : 'rounded-bl-sm bg-tg-msg-in text-tg-text',
          )}
        >
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
          <div
            className={cn(
              'mt-0.5 flex items-center justify-end gap-1',
              isOwn ? 'text-white/50' : 'text-tg-text-secondary',
            )}
          >
            {message.isEdited && !message.isDeleted && (
              <span className="text-[10px]">edited</span>
            )}
            <span className="text-[10px]">{formatTime(message.createdAt)}</span>
            {isOwn && !message.isDeleted && (
              <svg className="h-3.5 w-3.5 text-tg-accent" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z" />
              </svg>
            )}
          </div>
        </div>

        {/* Context menu */}
        {showMenu && (
          <div
            ref={menuRef}
            className={cn(
              'absolute z-50 min-w-[140px] rounded-lg bg-tg-bg-secondary py-1 shadow-xl',
              isOwn ? 'right-0 top-full' : 'left-0 top-full',
            )}
          >
            <button
              onClick={handleCopy}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-tg-text hover:bg-tg-bg-input"
            >
              Copy
            </button>
            {isOwn && !message.isDeleted && (
              <>
                <button
                  onClick={() => {
                    onEdit(message);
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-tg-text hover:bg-tg-bg-input"
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    onDelete(message.id);
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-400 hover:bg-tg-bg-input"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
