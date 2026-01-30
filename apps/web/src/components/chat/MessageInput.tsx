'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
interface MessageInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  editingContent?: string | null;
  onCancelEdit?: () => void;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
}

export const MessageInput = ({
  onSend,
  disabled,
  editingContent,
  onCancelEdit,
  onTypingStart,
  onTypingStop,
}: MessageInputProps) => {
  const [value, setValue] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    if (editingContent !== undefined && editingContent !== null) {
      setValue(editingContent);
      textareaRef.current?.focus();
    }
  }, [editingContent]);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 150)}px`;
  }, []);

  useEffect(() => {
    autoResize();
  }, [value, autoResize]);

  const handleTyping = useCallback(() => {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      onTypingStart?.();
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      onTypingStop?.();
    }, 2000);
  }, [onTypingStart, onTypingStop]);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
    if (isTypingRef.current) {
      isTypingRef.current = false;
      onTypingStop?.();
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    // Reset height
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape' && editingContent !== null && editingContent !== undefined) {
      onCancelEdit?.();
      setValue('');
    }
  };

  return (
    <div className="border-t border-tg-border bg-tg-bg-secondary px-2 py-2.5 sm:px-4">
      {editingContent !== null && editingContent !== undefined && (
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-tg-bg-input px-3 py-2">
          <svg className="h-4 w-4 shrink-0 text-tg-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
          </svg>
          <span className="flex-1 truncate text-sm text-tg-text-secondary">Editing message</span>
          <button onClick={onCancelEdit} className="text-tg-text-secondary hover:text-tg-text">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      <div className="flex items-end gap-2">
        <button
          onClick={() => setShowEmoji(!showEmoji)}
          className="mb-0.5 rounded-lg p-2 text-tg-text-secondary hover:bg-tg-bg-input hover:text-tg-text"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
          </svg>
        </button>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            handleTyping();
          }}
          onKeyDown={handleKeyDown}
          placeholder="Message"
          rows={1}
          className="max-h-[150px] min-h-[36px] flex-1 resize-none rounded-xl bg-tg-bg-input px-4 py-2 text-sm text-tg-text placeholder-tg-text-secondary outline-none"
        />
        {value.trim() ? (
          <button
            onClick={handleSend}
            disabled={disabled}
            className="mb-0.5 rounded-full bg-tg-accent p-2 text-white transition-colors hover:bg-tg-accent/80 disabled:opacity-50"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        ) : (
          <button className="mb-0.5 rounded-lg p-2 text-tg-text-secondary hover:bg-tg-bg-input hover:text-tg-text">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};
