'use client';

import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/Avatar';
import { getAvatarUrl } from '@/lib/avatar';
import { useAuthStore } from '@/stores/auth';
import { useChatStore } from '@/stores/chat';
import { getChatSocket, getMediaSocket } from '@/lib/socket';
import type { Room } from '@proroom/types';

interface ChatHeaderProps {
  room: Room;
  onInfoClick?: () => void;
}

export const ChatHeader = ({ room, onInfoClick }: ChatHeaderProps) => {
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.user);
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

  const typingArray = typingUsers
    ? Array.from(typingUsers).filter((uid) => uid !== currentUser?.id)
    : [];

  const getSubtitle = (): string => {
    if (typingArray.length > 0) {
      if (isDM) return 'typing...';
      const names = typingArray
        .map((uid) => room.members?.find((m) => m.userId === uid)?.user?.displayName ?? 'Someone')
        .slice(0, 2);
      return `${names.join(', ')} ${names.length === 1 ? 'is' : 'are'} typing...`;
    }
    if (isDM) {
      return isOnline ? 'online' : 'offline';
    }
    const memberCount = room.members?.length ?? 0;
    const onlineCount = room.members?.filter((m) => onlineUsers.has(m.userId)).length ?? 0;
    return `${memberCount} members${onlineCount > 0 ? `, ${onlineCount} online` : ''}`;
  };

  const handleCall = (type: 'audio' | 'video') => {
    const socket = getMediaSocket();
    socket.emit('call:initiate', { roomId: room.id, type });
    router.push(`/calls/${room.id}`);
  };

  return (
    <div className="flex items-center justify-between border-b border-tg-border bg-tg-bg-secondary px-4 py-2.5">
      {/* Back button for mobile */}
      <button
        onClick={() => router.push('/chat')}
        className="mr-2 rounded-lg p-1.5 text-tg-text-secondary hover:bg-tg-bg-input md:hidden"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <button onClick={onInfoClick} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <Avatar name={displayName} id={avatarId} size="md" online={isOnline} avatarUrl={getAvatarUrl(otherMember?.user?.avatarPath)} />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-tg-text">{displayName}</div>
          <div className="truncate text-xs text-tg-text-secondary">{getSubtitle()}</div>
        </div>
      </button>

      <div className="flex items-center gap-1">
        <button
          onClick={() => handleCall('audio')}
          className="rounded-lg p-2 text-tg-text-secondary hover:bg-tg-bg-input hover:text-tg-text"
          title="Voice call"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
          </svg>
        </button>
        <button
          onClick={() => handleCall('video')}
          className="rounded-lg p-2 text-tg-text-secondary hover:bg-tg-bg-input hover:text-tg-text"
          title="Video call"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9.75a2.25 2.25 0 002.25-2.25V7.5a2.25 2.25 0 00-2.25-2.25H4.5A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </button>
        <button
          onClick={onInfoClick}
          className="rounded-lg p-2 text-tg-text-secondary hover:bg-tg-bg-input hover:text-tg-text"
          title="Room info"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
          </svg>
        </button>
      </div>
    </div>
  );
};
