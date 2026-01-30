'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { api } from '@/lib/api';
import { useCallStore } from '@/stores/call';
import { getChatSocket } from '@/lib/socket';
import type { Room } from '@proroom/types';

interface StartCallModalProps {
  open: boolean;
  onClose: () => void;
  room: Room;
}

export const StartCallModal = ({ open, onClose, room }: StartCallModalProps) => {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [callType, setCallType] = useState<'audio' | 'video'>('video');
  const [handle, setHandle] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const { setCallTitle, setCallHandle, setVideoEnabled } = useCallStore();

  const handleStart = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.post(`/rooms/${room.id}/call`, {
        title: title.trim() || undefined,
      });

      setCallTitle(data.callTitle);
      setCallHandle(data.callHandle);
      setVideoEnabled(callType === 'video');

      // Notify room members
      const socket = getChatSocket();
      socket.emit('call:initiate', { roomId: room.id, type: callType });

      onClose();
      router.push(`/calls/${room.id}/lobby`);
    } catch (err) {
      console.error('Failed to start call:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateLink = async () => {
    if (handle) return;
    setIsLoading(true);
    try {
      const { data } = await api.post(`/rooms/${room.id}/call`, {
        title: title.trim() || undefined,
      });
      setHandle(data.callHandle);
      setCallHandle(data.callHandle);
      setCallTitle(data.callTitle);
    } catch (err) {
      console.error('Failed to generate link:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const copyLink = async () => {
    if (!handle) return;
    const link = `${window.location.origin}/join/${handle}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setTitle('');
    setHandle(null);
    setCopied(false);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Start a Call">
      <div className="space-y-4">
        {/* Call title */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-tg-text-secondary">
            Call title (optional)
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={room.name}
            className="w-full rounded-lg border border-tg-border bg-tg-bg-input px-3 py-2 text-sm text-tg-text placeholder-tg-text-secondary outline-none focus:border-tg-accent"
          />
        </div>

        {/* Call type toggle */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-tg-text-secondary">
            Call type
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setCallType('audio')}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                callType === 'audio'
                  ? 'bg-tg-accent text-white'
                  : 'bg-tg-bg-input text-tg-text-secondary hover:bg-tg-border'
              }`}
            >
              Audio
            </button>
            <button
              onClick={() => setCallType('video')}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                callType === 'video'
                  ? 'bg-tg-accent text-white'
                  : 'bg-tg-bg-input text-tg-text-secondary hover:bg-tg-border'
              }`}
            >
              Video
            </button>
          </div>
        </div>

        {/* Generate / copy link */}
        <div>
          {handle ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/join/${handle}`}
                className="flex-1 truncate rounded-lg border border-tg-border bg-tg-bg-input px-3 py-2 text-sm text-tg-text"
              />
              <button
                onClick={copyLink}
                className="shrink-0 rounded-lg bg-tg-bg-input px-3 py-2 text-sm font-medium text-tg-text transition-colors hover:bg-tg-border"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          ) : (
            <button
              onClick={handleGenerateLink}
              disabled={isLoading}
              className="w-full rounded-lg bg-tg-bg-input px-3 py-2 text-sm font-medium text-tg-text transition-colors hover:bg-tg-border disabled:opacity-50"
            >
              Generate Invite Link
            </button>
          )}
        </div>

        {/* Start button */}
        <button
          onClick={handleStart}
          disabled={isLoading}
          className="w-full rounded-xl bg-tg-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-tg-accent/90 disabled:opacity-50"
        >
          {isLoading ? 'Starting...' : 'Start Call'}
        </button>
      </div>
    </Modal>
  );
};
