'use client';

import { Avatar } from '@/components/ui/Avatar';
import { getAvatarUrl } from '@/lib/avatar';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/stores/auth';
import { useChatStore } from '@/stores/chat';
import type { Room } from '@proroom/types';

interface RoomListItemProps {
  room: Room;
  active: boolean;
  onClick: () => void;
}

const formatTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

export const RoomListItem = ({ room, active, onClick }: RoomListItemProps) => {
  const currentUser = useAuthStore((s) => s.user);
  const lastMessage = useChatStore((s) => s.lastMessages[room.id]);
  const unreadCount = useChatStore((s) => s.unreadCounts[room.id] ?? 0);
  const onlineUsers = useChatStore((s) => s.onlineUsers);
  const typingUsers = useChatStore((s) => s.typingUsers[room.id]);

  const isDM = room.type === 'DM';
  const otherMember = isDM
    ? room.members?.find((m) => m.userId !== currentUser?.id)
    : undefined;
  const displayName = isDM
    ? otherMember?.user?.displayName ?? room.name
    : room.name;
  const avatarId = isDM ? otherMember?.userId ?? room.id : room.id;
  const isOnline = isDM && otherMember ? onlineUsers.has(otherMember.userId) : undefined;

  const typingArray = typingUsers ? Array.from(typingUsers).filter((uid) => uid !== currentUser?.id) : [];
  const isTyping = typingArray.length > 0;

  const lastMsgPreview = lastMessage
    ? lastMessage.senderId === currentUser?.id
      ? `You: ${lastMessage.content}`
      : lastMessage.content
    : isDM
      ? 'Start a conversation'
      : 'No messages yet';

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
        active
          ? 'bg-tg-accent/20'
          : 'hover:bg-tg-bg-input',
      )}
    >
      <Avatar
        name={displayName}
        id={avatarId}
        size="lg"
        online={isOnline}
        avatarUrl={getAvatarUrl(otherMember?.user?.avatarPath)}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <span className={cn('truncate text-sm font-semibold', active ? 'text-tg-text' : 'text-tg-text')}>
            {displayName}
          </span>
          {lastMessage && (
            <span className="ml-2 shrink-0 text-[11px] text-tg-text-secondary">
              {formatTime(lastMessage.createdAt)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <span className="truncate text-[13px] text-tg-text-secondary">
            {isTyping ? (
              <span className="italic text-tg-accent">typing...</span>
            ) : (
              lastMsgPreview
            )}
          </span>
          {unreadCount > 0 && (
            <Badge count={unreadCount} className="ml-2 shrink-0" />
          )}
        </div>
      </div>
    </button>
  );
};
