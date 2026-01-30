'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useChatStore } from '@/stores/chat';
import { SearchInput } from '@/components/ui/SearchInput';
import { RoomListItem } from '@/components/chat/RoomListItem';
import { CreateRoomModal } from '@/components/chat/CreateRoomModal';
import { clearCryptoState } from '@/lib/crypto';
import { cn } from '@/lib/cn';
import type { Room } from '@proroom/types';

export const Sidebar = () => {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { rooms, setRooms, activeRoomId, setActiveRoom, clearUnread } = useChatStore();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const { data } = await api.get<Room[]>('/rooms');
        setRooms(data);
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    };
    fetchRooms();
  }, [setRooms]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const handleRoomClick = (roomId: string) => {
    setActiveRoom(roomId);
    clearUnread(roomId);
    router.push(`/chat/${roomId}`);
  };

  const handleLogout = async () => {
    const refreshToken = useAuthStore.getState().refreshToken;
    if (refreshToken) {
      await api.post('/auth/logout', { refreshToken }).catch(() => null);
    }
    clearCryptoState();
    logout();
    router.push('/login');
  };

  const filteredRooms = search
    ? rooms.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()))
    : rooms;

  return (
    <>
      <aside className={cn(
        'flex h-full w-full flex-col border-r border-tg-border bg-tg-bg-secondary',
        'md:w-[320px] md:max-w-[320px]',
        activeRoomId ? 'hidden md:flex' : 'flex',
      )}>
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2.5">
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="rounded-lg p-2 text-tg-text-secondary hover:bg-tg-bg-input hover:text-tg-text"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
            {menuOpen && (
              <div className="absolute left-0 top-full z-50 mt-1 min-w-[180px] rounded-lg bg-tg-bg-dark py-1 shadow-xl">
                <button
                  onClick={() => {
                    router.push('/profile');
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-tg-text hover:bg-tg-bg-input"
                >
                  <svg className="h-4 w-4 text-tg-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Settings
                </button>
                {user?.role === 'ADMIN' && (
                  <button
                    onClick={() => {
                      router.push('/admin');
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-tg-text hover:bg-tg-bg-input"
                  >
                    <svg className="h-4 w-4 text-tg-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                    Admin Panel
                  </button>
                )}
                <div className="my-1 border-t border-tg-border" />
                <button
                  onClick={() => {
                    handleLogout();
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-red-400 hover:bg-tg-bg-input"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                  </svg>
                  Log Out
                </button>
              </div>
            )}
          </div>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search"
            className="flex-1"
          />
        </div>

        {/* Room list */}
        <div className="flex-1 overflow-y-auto px-2 py-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-tg-accent border-t-transparent" />
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="py-12 text-center text-sm text-tg-text-secondary">
              {search ? 'No chats found' : 'No conversations yet'}
            </div>
          ) : (
            filteredRooms.map((room) => (
              <RoomListItem
                key={room.id}
                room={room}
                active={activeRoomId === room.id}
                onClick={() => handleRoomClick(room.id)}
              />
            ))
          )}
        </div>

        {/* FAB - Compose button */}
        <div className="relative px-3 pb-4">
          <button
            onClick={() => setCreateOpen(true)}
            className="absolute bottom-6 right-5 flex h-12 w-12 items-center justify-center rounded-full bg-tg-accent shadow-lg transition-transform hover:scale-105 active:scale-95 sm:h-14 sm:w-14"
          >
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
            </svg>
          </button>
        </div>
      </aside>

      <CreateRoomModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
};
