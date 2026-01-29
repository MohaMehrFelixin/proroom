'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { SearchInput } from '@/components/ui/SearchInput';
import { Avatar } from '@/components/ui/Avatar';
import { getAvatarUrl } from '@/lib/avatar';
import { useUserSearch } from '@/hooks/useUserSearch';
import { api } from '@/lib/api';
import { useChatStore } from '@/stores/chat';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/cn';
import type { Room, User } from '@proroom/types';

interface CreateRoomModalProps {
  open: boolean;
  onClose: () => void;
}

type Mode = 'select' | 'dm' | 'group';

export const CreateRoomModal = ({ open, onClose }: CreateRoomModalProps) => {
  const router = useRouter();
  const { rooms, setRooms } = useChatStore();
  const [mode, setMode] = useState<Mode>('select');
  const [searchQuery, setSearchQuery] = useState('');
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [creating, setCreating] = useState(false);

  const { users, loading } = useUserSearch(searchQuery);

  const reset = () => {
    setMode('select');
    setSearchQuery('');
    setGroupName('');
    setSelectedUsers([]);
    setCreating(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const toggleUser = (user: User) => {
    setSelectedUsers((prev) =>
      prev.some((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : [...prev, user],
    );
  };

  const handleCreateDM = async (user: User) => {
    setCreating(true);
    try {
      const { data } = await api.post<Room>('/rooms', {
        name: user.displayName,
        type: 'DM',
        memberIds: [user.id],
      });
      setRooms([...rooms, data]);
      handleClose();
      router.push(`/chat/${data.id}`);
    } catch {
      // Handle error
    } finally {
      setCreating(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedUsers.length === 0) return;
    setCreating(true);
    try {
      const { data } = await api.post<Room>('/rooms', {
        name: groupName.trim(),
        type: 'GROUP',
        memberIds: selectedUsers.map((u) => u.id),
      });
      setRooms([...rooms, data]);
      handleClose();
      router.push(`/chat/${data.id}`);
    } catch {
      // Handle error
    } finally {
      setCreating(false);
    }
  };

  const title = mode === 'select' ? 'New Chat' : mode === 'dm' ? 'New Direct Message' : 'New Group';

  return (
    <Modal open={open} onClose={handleClose} title={title}>
      {mode === 'select' && (
        <div className="space-y-2">
          <button
            onClick={() => setMode('dm')}
            className="flex w-full items-center gap-3 rounded-lg p-3 text-left hover:bg-tg-bg-input"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-tg-accent">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold text-tg-text">New Direct Message</div>
              <div className="text-xs text-tg-text-secondary">Start a private conversation</div>
            </div>
          </button>
          <button
            onClick={() => setMode('group')}
            className="flex w-full items-center gap-3 rounded-lg p-3 text-left hover:bg-tg-bg-input"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-tg-green">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold text-tg-text">New Group</div>
              <div className="text-xs text-tg-text-secondary">Create a group conversation</div>
            </div>
          </button>
        </div>
      )}

      {mode === 'dm' && (
        <div className="space-y-3">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search users..."
          />
          <div className="max-h-[300px] overflow-y-auto">
            {loading ? (
              <div className="py-4 text-center text-sm text-tg-text-secondary">Searching...</div>
            ) : users.length === 0 && searchQuery ? (
              <div className="py-4 text-center text-sm text-tg-text-secondary">No users found</div>
            ) : (
              users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleCreateDM(user)}
                  disabled={creating}
                  className="flex w-full items-center gap-3 rounded-lg p-2.5 text-left hover:bg-tg-bg-input disabled:opacity-50"
                >
                  <Avatar name={user.displayName} id={user.id} size="md" avatarUrl={getAvatarUrl(user.avatarPath)} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-tg-text">{user.displayName}</div>
                    <div className="truncate text-xs text-tg-text-secondary">@{user.username}</div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {mode === 'group' && (
        <div className="space-y-3">
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Group name"
            className="w-full rounded-xl bg-tg-bg-input px-4 py-2.5 text-sm text-tg-text placeholder-tg-text-secondary outline-none focus:ring-1 focus:ring-tg-accent"
          />
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Add members..."
          />
          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedUsers.map((user) => (
                <span
                  key={user.id}
                  className="inline-flex items-center gap-1 rounded-full bg-tg-accent/20 px-2.5 py-1 text-xs text-tg-accent"
                >
                  {user.displayName}
                  <button onClick={() => toggleUser(user)} className="hover:text-white">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="max-h-[200px] overflow-y-auto">
            {loading ? (
              <div className="py-4 text-center text-sm text-tg-text-secondary">Searching...</div>
            ) : (
              users.map((user) => {
                const isSelected = selectedUsers.some((u) => u.id === user.id);
                return (
                  <button
                    key={user.id}
                    onClick={() => toggleUser(user)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg p-2.5 text-left',
                      isSelected ? 'bg-tg-accent/10' : 'hover:bg-tg-bg-input',
                    )}
                  >
                    <Avatar name={user.displayName} id={user.id} size="md" avatarUrl={getAvatarUrl(user.avatarPath)} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-tg-text">{user.displayName}</div>
                      <div className="truncate text-xs text-tg-text-secondary">@{user.username}</div>
                    </div>
                    {isSelected && (
                      <svg className="h-5 w-5 shrink-0 text-tg-accent" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                    )}
                  </button>
                );
              })
            )}
          </div>
          <button
            onClick={handleCreateGroup}
            disabled={creating || !groupName.trim() || selectedUsers.length === 0}
            className="w-full rounded-xl bg-tg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-tg-accent/80 disabled:opacity-50"
          >
            {creating ? 'Creating...' : `Create Group (${selectedUsers.length} members)`}
          </button>
        </div>
      )}
    </Modal>
  );
};
