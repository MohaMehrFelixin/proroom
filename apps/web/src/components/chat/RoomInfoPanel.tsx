'use client';

import { Avatar } from '@/components/ui/Avatar';
import { getAvatarUrl } from '@/lib/avatar';
import { useChatStore } from '@/stores/chat';
import type { Room } from '@proroom/types';

interface RoomInfoPanelProps {
  room: Room;
  open: boolean;
  onClose: () => void;
}

export const RoomInfoPanel = ({ room, open, onClose }: RoomInfoPanelProps) => {
  const onlineUsers = useChatStore((s) => s.onlineUsers);

  if (!open) return null;

  const isDM = room.type === 'DM';
  const members = room.members ?? [];

  return (
    <div className="flex h-full w-80 shrink-0 flex-col border-l border-tg-border bg-tg-bg-secondary">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-tg-border px-4 py-3">
        <h3 className="text-sm font-semibold text-tg-text">
          {isDM ? 'User Info' : 'Group Info'}
        </h3>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-tg-text-secondary hover:bg-tg-bg-input hover:text-tg-text"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Room avatar + name */}
      <div className="flex flex-col items-center border-b border-tg-border px-4 py-6">
        <Avatar name={room.name} id={room.id} size="lg" />
        <h2 className="mt-3 text-base font-semibold text-tg-text">{room.name}</h2>
        <p className="text-xs text-tg-text-secondary">
          {isDM ? 'Direct Message' : `${members.length} members`}
        </p>
      </div>

      {/* Members list */}
      <div className="flex-1 overflow-y-auto p-3">
        <h4 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-tg-text-secondary">
          Members ({members.length})
        </h4>
        {members.map((member) => {
          const isOnline = onlineUsers.has(member.userId);
          return (
            <div
              key={member.id}
              className="flex items-center gap-3 rounded-lg px-2 py-2"
            >
              <Avatar
                name={member.user?.displayName ?? 'Unknown'}
                id={member.userId}
                size="md"
                online={isOnline}
                avatarUrl={getAvatarUrl(member.user?.avatarPath)}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-tg-text">
                  {member.user?.displayName ?? 'Unknown'}
                </div>
                <div className="truncate text-xs text-tg-text-secondary">
                  {isOnline ? 'online' : 'offline'}
                  {member.role === 'ADMIN' && (
                    <span className="ml-1 text-tg-accent">admin</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
