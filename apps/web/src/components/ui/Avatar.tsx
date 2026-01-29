'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';

const AVATAR_COLORS = [
  'bg-red-500',
  'bg-orange-500',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-teal-500',
  'bg-cyan-500',
  'bg-blue-500',
  'bg-indigo-500',
  'bg-violet-500',
  'bg-pink-500',
];

const getColorFromId = (id: string): string => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length] ?? AVATAR_COLORS[0];
};

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

interface AvatarProps {
  name: string;
  id: string;
  size?: 'sm' | 'md' | 'lg';
  online?: boolean;
  avatarUrl?: string;
  className?: string;
}

const SIZES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
};

const DOT_SIZES = {
  sm: 'h-2.5 w-2.5 -bottom-0 -right-0',
  md: 'h-3 w-3 -bottom-0.5 -right-0.5',
  lg: 'h-3.5 w-3.5 -bottom-0.5 -right-0.5',
};

export const Avatar = ({ name, id, size = 'md', online, avatarUrl, className }: AvatarProps) => {
  const [imgError, setImgError] = useState(false);
  const color = getColorFromId(id);
  const initials = getInitials(name);
  const showImage = avatarUrl && !imgError;

  return (
    <div className={cn('relative inline-flex shrink-0', className)}>
      {showImage ? (
        <img
          src={avatarUrl}
          alt={name}
          onError={() => setImgError(true)}
          className={cn('rounded-full object-cover', SIZES[size])}
        />
      ) : (
        <div
          className={cn(
            'flex items-center justify-center rounded-full font-semibold text-white',
            color,
            SIZES[size],
          )}
        >
          {initials}
        </div>
      )}
      {online !== undefined && (
        <span
          className={cn(
            'absolute rounded-full border-2 border-tg-bg-secondary',
            online ? 'bg-tg-green' : 'bg-tg-text-secondary',
            DOT_SIZES[size],
          )}
        />
      )}
    </div>
  );
};
