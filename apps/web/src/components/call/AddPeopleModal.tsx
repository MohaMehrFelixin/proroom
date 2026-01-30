'use client';

import { useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { getAvatarUrl } from '@/lib/avatar';
import { SearchInput } from '@/components/ui/SearchInput';
import type { RoomMember } from '@proroom/types';

interface AddPeopleModalProps {
  open: boolean;
  onClose: () => void;
  members: RoomMember[];
  activeUserIds: Set<string>;
  onInvite: (userId: string) => void;
}

export const AddPeopleModal = ({
  open,
  onClose,
  members,
  activeUserIds,
  onInvite,
}: AddPeopleModalProps) => {
  const [search, setSearch] = useState('');
  const [invited, setInvited] = useState<Set<string>>(new Set());

  if (!open) return null;

  const available = members.filter((m) => {
    if (activeUserIds.has(m.userId)) return false;
    const name = m.user?.displayName ?? '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const handleInvite = (userId: string) => {
    onInvite(userId);
    setInvited((prev) => new Set(prev).add(userId));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-tg-bg-secondary shadow-2xl">
        <div className="flex items-center justify-between border-b border-tg-border px-4 py-3">
          <h3 className="text-sm font-semibold text-tg-text">Add People</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-tg-text-secondary hover:bg-tg-bg-input hover:text-tg-text"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-4 pt-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search members"
            className="w-full"
          />
        </div>

        <div className="max-h-64 overflow-y-auto p-3">
          {available.length === 0 ? (
            <p className="py-6 text-center text-sm text-tg-text-secondary">
              {search ? 'No members found' : 'Everyone is already in the call'}
            </p>
          ) : (
            available.map((member) => {
              const isInvited = invited.has(member.userId);
              return (
                <div
                  key={member.id}
                  className="flex items-center gap-3 rounded-lg px-2 py-2"
                >
                  <Avatar
                    name={member.user?.displayName ?? 'Unknown'}
                    id={member.userId}
                    size="md"
                    avatarUrl={getAvatarUrl(member.user?.avatarPath)}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-tg-text">
                      {member.user?.displayName ?? 'Unknown'}
                    </div>
                  </div>
                  <button
                    onClick={() => handleInvite(member.userId)}
                    disabled={isInvited}
                    className={
                      isInvited
                        ? 'rounded-lg px-3 py-1.5 text-xs font-medium text-tg-text-secondary'
                        : 'rounded-lg bg-tg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-tg-accent/80'
                    }
                  >
                    {isInvited ? 'Invited' : 'Invite'}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
