'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getMediaSocket } from '@/lib/socket';
import { useCallStore } from '@/stores/call';
import { useAuthStore } from '@/stores/auth';
import { useChatStore } from '@/stores/chat';
import { api } from '@/lib/api';
import { MemberRole } from '@proroom/types';
import { VideoGrid } from '@/components/call/VideoGrid';
import { CallControls } from '@/components/call/CallControls';
import { CallHeader } from '@/components/call/CallHeader';
import { AddPeopleModal } from '@/components/call/AddPeopleModal';
import { getChatSocket } from '@/lib/socket';
import { Device, types as mediasoupTypes } from 'mediasoup-client';

type Transport = mediasoupTypes.Transport;
type Producer = mediasoupTypes.Producer;
type Consumer = mediasoupTypes.Consumer;

interface RemoteStreamEntry {
  id: string;
  stream: MediaStream;
  userId: string;
  isScreen: boolean;
}

/**
 * Forcefully stop every track on a MediaStream and null out any
 * video element that still references it.
 */
const killStream = (stream: MediaStream | null | undefined) => {
  if (!stream) return;
  stream.getTracks().forEach((t) => {
    t.enabled = false;
    t.stop();
  });
};

const CallPage = () => {
  const params = useParams<{ roomId: string }>();
  const router = useRouter();
  const roomId = params.roomId;
  const user = useAuthStore((s) => s.user);
  const {
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    pinnedUserId,
    participantNames,
    setStatus,
    setActiveRoom,
    toggleAudio,
    toggleVideo,
    setVideoEnabled,
    setScreenSharing,
    removeParticipant,
    setLocalStream,
    setScreenStream,
    setPinnedUser,
    setParticipantName,
    reset,
  } = useCallStore();

  const rooms = useChatStore((s) => s.rooms);
  const room = rooms.find((r) => r.id === roomId);
  const currentMember = room?.members?.find((m) => m.userId === user?.id);
  const isAdmin = currentMember?.role === MemberRole.ADMIN || room?.createdBy === user?.id;
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showAddPeople, setShowAddPeople] = useState(false);

  const deviceRef = useRef<Device | null>(null);
  const sendTransportRef = useRef<Transport | null>(null);
  const recvTransportRef = useRef<Transport | null>(null);
  const producersRef = useRef<Map<string, Producer>>(new Map());
  const consumersRef = useRef<Map<string, Consumer>>(new Map());

  // Track ALL streams we ever create so we can stop them all, even across
  // React Strict Mode double-mount cycles.
  const allStreamsRef = useRef<MediaStream[]>([]);
  const mountedRef = useRef(true);

  const [remoteStreams, setRemoteStreams] = useState<RemoteStreamEntry[]>([]);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const handleToggleAudio = useCallback(() => {
    const producer = producersRef.current.get('audio');
    if (producer) {
      if (isAudioEnabled) {
        producer.pause();
      } else {
        producer.resume();
      }
    }
    toggleAudio();
  }, [isAudioEnabled, toggleAudio]);

  const handleToggleVideo = useCallback(() => {
    const producer = producersRef.current.get('video');
    if (producer) {
      if (isVideoEnabled) {
        producer.pause();
        const localStream = useCallStore.getState().localStream;
        localStream?.getVideoTracks().forEach((t) => (t.enabled = false));
      } else {
        producer.resume();
        const localStream = useCallStore.getState().localStream;
        localStream?.getVideoTracks().forEach((t) => (t.enabled = true));
      }
    }
    toggleVideo();
  }, [isVideoEnabled, toggleVideo]);

  /**
   * Teardown everything: stop all media tracks, close producers/consumers/
   * transports, notify server, reset store.
   */
  const cleanup = useCallback(() => {
    // 1. Kill every stream we ever acquired (handles Strict Mode duplicates)
    for (const s of allStreamsRef.current) {
      killStream(s);
    }
    allStreamsRef.current = [];

    // Also kill whatever the store currently holds (belt & suspenders)
    killStream(useCallStore.getState().localStream);
    killStream(useCallStore.getState().screenStream);

    // 2. Close all producers
    for (const [, producer] of producersRef.current) {
      try { producer.close(); } catch { /* already closed */ }
    }
    producersRef.current.clear();

    // 3. Close all consumers
    for (const [, consumer] of consumersRef.current) {
      try { consumer.close(); } catch { /* already closed */ }
    }
    consumersRef.current.clear();

    // 4. Close transports
    try { sendTransportRef.current?.close(); } catch { /* */ }
    try { recvTransportRef.current?.close(); } catch { /* */ }
    sendTransportRef.current = null;
    recvTransportRef.current = null;

    // 5. Notify server and remove listeners
    try {
      const socket = getMediaSocket();
      socket.emit('call:leave-room', roomId);
      socket.off('call:new-producer');
      socket.off('call:user-left');
      socket.off('call:ended');
    } catch {
      // Socket may not be available
    }

    // 6. Reset store
    reset();
  }, [roomId, reset]);

  const handleLeaveCall = useCallback(() => {
    cleanup();
    router.push(`/chat/${roomId}`);
  }, [cleanup, router, roomId]);

  const consumeProducer = async (
    socket: ReturnType<typeof getMediaSocket>,
    device: Device,
    recvTransport: Transport,
    producerId: string,
    userId: string,
    appData?: Record<string, unknown>,
  ) => {
    const consumerData: {
      id: string;
      producerId: string;
      kind: string;
      rtpParameters: Record<string, unknown>;
    } = await new Promise((resolve) => {
      socket.emit('call:consume', { producerId }, resolve);
    });

    const consumer = await recvTransport.consume({
      ...consumerData,
      rtpParameters: consumerData.rtpParameters as never,
    } as never);

    consumersRef.current.set(consumer.id, consumer);

    await new Promise<void>((resolve) => {
      socket.emit('call:resume-consumer', { consumerId: consumer.id }, () => resolve());
    });

    const stream = new MediaStream([consumer.track]);
    const isScreen = appData?.type === 'screen';

    setRemoteStreams((prev) => [
      ...prev,
      { id: consumer.id, stream, userId, isScreen },
    ]);

    if (isScreen) {
      setPinnedUser(null);
    }
  };

  const joinCall = useCallback(async () => {
    setStatus('connecting');
    setActiveRoom(roomId);

    try {
      // Reuse stream from lobby if available, otherwise acquire new one
      const storeState = useCallStore.getState();
      let stream: MediaStream;
      let hasVideo = storeState.isVideoEnabled;

      if (storeState.localStream && storeState.localStream.getTracks().some((t) => t.readyState === 'live')) {
        // Lobby handed us a live stream — reuse it
        stream = storeState.localStream;
      } else {
        // No lobby stream — acquire fresh (direct navigation or stream died)
        const wantVideo = storeState.isVideoEnabled;
        hasVideo = wantVideo;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: wantVideo,
          });
        } catch {
          try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            hasVideo = false;
          } catch {
            setStatus('idle');
            setMediaError('Could not access your camera or microphone. Check your browser permissions.');
            return;
          }
        }

        // Apply lobby mute preferences
        if (!storeState.isAudioEnabled) {
          stream.getAudioTracks().forEach((t) => (t.enabled = false));
        }
      }

      // Track this stream so cleanup can always find it
      allStreamsRef.current.push(stream);

      // If cleanup already ran (Strict Mode unmount) while we were awaiting
      // getUserMedia, stop immediately and bail.
      if (!mountedRef.current) {
        killStream(stream);
        return;
      }

      setLocalStream(stream);
      if (!hasVideo) {
        setVideoEnabled(false);
      }

      const socket = getMediaSocket();
      const device = new Device();
      deviceRef.current = device;

      const response: {
        rtpCapabilities: Record<string, unknown>;
        existingProducers: Array<{
          userId: string;
          producerId: string;
          kind: string;
          appData: Record<string, unknown>;
        }>;
      } = await new Promise((resolve) => {
        socket.emit('call:join-room', { roomId, rtpCapabilities: {} }, resolve);
      });

      await device.load({
        routerRtpCapabilities: response.rtpCapabilities as never,
      });

      socket.emit('call:update-rtp-capabilities', {
        rtpCapabilities: device.rtpCapabilities,
      });

      // Create send transport
      const sendTransportData: Record<string, unknown> = await new Promise((resolve) => {
        socket.emit('call:create-transport', { direction: 'send' }, resolve);
      });

      const sendTransport = device.createSendTransport(sendTransportData as never);
      sendTransportRef.current = sendTransport;

      sendTransport.on('connect', ({ dtlsParameters }, callback) => {
        socket.emit(
          'call:connect-transport',
          { transportId: sendTransport.id, dtlsParameters },
          () => callback(),
        );
      });

      sendTransport.on('produce', ({ kind, rtpParameters, appData }, callback) => {
        socket.emit(
          'call:produce',
          { transportId: sendTransport.id, kind, rtpParameters, appData },
          (response: { producerId: string }) => {
            callback({ id: response.producerId });
          },
        );
      });

      // Create recv transport
      const recvTransportData: Record<string, unknown> = await new Promise((resolve) => {
        socket.emit('call:create-transport', { direction: 'recv' }, resolve);
      });

      const recvTransport = device.createRecvTransport(recvTransportData as never);
      recvTransportRef.current = recvTransport;

      recvTransport.on('connect', ({ dtlsParameters }, callback) => {
        socket.emit(
          'call:connect-transport',
          { transportId: recvTransport.id, dtlsParameters },
          () => callback(),
        );
      });

      // Produce audio and video tracks
      for (const track of stream.getTracks()) {
        const producer = await sendTransport.produce({
          track,
          ...(track.kind === 'video'
            ? {
                encodings: [
                  { maxBitrate: 100000, scaleResolutionDownBy: 4 },
                  { maxBitrate: 300000, scaleResolutionDownBy: 2 },
                  { maxBitrate: 900000 },
                ],
              }
            : {}),
        });
        producersRef.current.set(track.kind, producer);
      }

      // Consume existing producers
      for (const prod of response.existingProducers) {
        await consumeProducer(socket, device, recvTransport, prod.producerId, prod.userId, prod.appData);
      }

      // Listen for new producers
      socket.on('call:new-producer', async (data) => {
        await consumeProducer(socket, device, recvTransport, data.producerId, data.userId, data.appData);
      });

      socket.on('call:user-left', (data) => {
        removeParticipant(data.userId);
        setRemoteStreams((prev) => prev.filter((s) => s.userId !== data.userId));
      });

      setStatus('active');
    } catch (err) {
      console.error('Failed to join call:', err);
      setStatus('idle');
      setMediaError('Failed to connect to the call. Please try again.');
    }
  }, [roomId, setStatus, setActiveRoom, setLocalStream, setVideoEnabled, removeParticipant, setPinnedUser, router, reset]);

  // Main lifecycle: join on mount, cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    joinCall();

    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, []);

  // Listen for call:ended (admin ended the call for everyone)
  useEffect(() => {
    let socket: ReturnType<typeof getMediaSocket>;
    try {
      socket = getMediaSocket();
    } catch {
      return;
    }

    const handleEnded = () => {
      cleanup();
      router.push(`/chat/${roomId}`);
    };

    socket.on('call:ended', handleEnded);
    return () => {
      socket.off('call:ended', handleEnded);
    };
  }, [roomId, cleanup, router]);

  // Resolve participant names from remote streams
  useEffect(() => {
    const userIds = [...new Set(remoteStreams.map((s) => s.userId))];
    for (const uid of userIds) {
      if (!participantNames[uid]) {
        setParticipantName(uid, uid.slice(0, 8));
      }
    }
  }, [remoteStreams, participantNames, setParticipantName]);

  const handleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      const screenProducer = producersRef.current.get('screen');
      if (screenProducer) {
        screenProducer.close();
        producersRef.current.delete('screen');
      }
      killStream(useCallStore.getState().screenStream);
      setScreenSharing(false);
      setScreenStream(null);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      allStreamsRef.current.push(stream);
      setScreenStream(stream);
      setScreenSharing(true);

      const track = stream.getVideoTracks()[0];
      const producer = await sendTransportRef.current!.produce({
        track,
        appData: { type: 'screen' },
      });
      producersRef.current.set('screen', producer);

      track.onended = () => {
        producer.close();
        producersRef.current.delete('screen');
        setScreenSharing(false);
        setScreenStream(null);
      };
    } catch {
      // User cancelled screen share picker
    }
  }, [isScreenSharing, setScreenSharing, setScreenStream]);

  const handleEndForAll = useCallback(() => {
    setShowEndConfirm(true);
  }, []);

  const confirmEndForAll = useCallback(async () => {
    setShowEndConfirm(false);
    try {
      const socket = getMediaSocket();
      socket.emit('call:end-for-all', { roomId });
    } catch {
      // Socket not available
    }
    // Also deactivate via API as fallback
    try {
      await api.post(`/rooms/${roomId}/call/end`);
    } catch {
      // Already deactivated by gateway
    }
    cleanup();
    router.push(`/chat/${roomId}`);
  }, [roomId, cleanup, router]);

  const participantCount = 1 + new Set(remoteStreams.map((s) => s.userId)).size;
  const localStream = useCallStore((s) => s.localStream);
  const screenStream = useCallStore((s) => s.screenStream);

  const callTitle = useCallStore((s) => s.callTitle);
  const activeUserIds = new Set([user?.id ?? '', ...remoteStreams.map((s) => s.userId)]);

  const handleInviteUser = useCallback((userId: string) => {
    try {
      const socket = getChatSocket();
      socket.emit('call:invite', { roomId, userId, type: 'video' });
    } catch {
      // Socket not ready
    }
  }, [roomId]);

  if (mediaError) {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center bg-tg-bg-dark p-6 text-center sm:h-full">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
          <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="mb-2 text-lg font-semibold text-tg-text">Cannot Join Call</h2>
        <p className="mb-6 max-w-xs text-sm text-tg-text-secondary">{mediaError}</p>
        <div className="flex gap-3">
          <button
            onClick={() => router.push(`/chat/${roomId}`)}
            className="rounded-xl bg-tg-bg-input px-6 py-2.5 text-sm font-medium text-tg-text transition-colors hover:bg-tg-border"
          >
            Back to Chat
          </button>
          <button
            onClick={() => {
              setMediaError(null);
              joinCall();
            }}
            className="rounded-xl bg-tg-accent px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-tg-accent/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] flex-col bg-tg-bg-dark sm:h-full">
      <CallHeader
        roomName={callTitle || room?.name || roomId}
        participantCount={participantCount}
        isAdmin={isAdmin}
        onBack={handleLeaveCall}
        onEndForAll={handleEndForAll}
        onAddPeople={() => setShowAddPeople(true)}
      />

      <div className="min-h-0 flex-1">
        <VideoGrid
          localStream={localStream}
          localScreenStream={screenStream}
          localUserId={user?.id ?? ''}
          localName={user?.displayName ?? 'You'}
          isVideoEnabled={isVideoEnabled}
          isAudioEnabled={isAudioEnabled}
          isScreenSharing={isScreenSharing}
          remoteStreams={remoteStreams}
          participantNames={participantNames}
          pinnedUserId={pinnedUserId}
          onPinUser={setPinnedUser}
        />
      </div>

      <CallControls
        isAudioEnabled={isAudioEnabled}
        isVideoEnabled={isVideoEnabled}
        isScreenSharing={isScreenSharing}
        onToggleAudio={handleToggleAudio}
        onToggleVideo={handleToggleVideo}
        onToggleScreenShare={handleScreenShare}
        onLeave={handleLeaveCall}
      />

      {/* Add people modal */}
      {room && (
        <AddPeopleModal
          open={showAddPeople}
          onClose={() => setShowAddPeople(false)}
          members={room.members ?? []}
          activeUserIds={activeUserIds}
          onInvite={handleInviteUser}
        />
      )}

      {/* End call confirmation dialog */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-80 rounded-2xl bg-tg-bg-secondary p-6 shadow-2xl">
            <h3 className="mb-2 text-lg font-semibold text-tg-text">End call for everyone?</h3>
            <p className="mb-5 text-sm text-tg-text-secondary">
              This will disconnect all participants from the call.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="flex-1 rounded-xl bg-tg-bg-input py-2.5 font-medium text-tg-text transition-colors hover:bg-tg-border"
              >
                Cancel
              </button>
              <button
                onClick={confirmEndForAll}
                className="flex-1 rounded-xl bg-red-500 py-2.5 font-medium text-white transition-colors hover:bg-red-600"
              >
                End Call
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CallPage;
