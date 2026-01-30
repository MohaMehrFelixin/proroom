'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCallStore } from '@/stores/call';
import { useChatStore } from '@/stores/chat';

const LobbyPage = () => {
  const params = useParams<{ roomId: string }>();
  const router = useRouter();
  const roomId = params.roomId;

  const rooms = useChatStore((s) => s.rooms);
  const room = rooms.find((r) => r.id === roomId);

  const {
    isAudioEnabled,
    isVideoEnabled,
    callTitle,
    setAudioEnabled,
    setVideoEnabled,
  } = useCallStore();

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);

  // Get media on mount
  useEffect(() => {
    let cancelled = false;

    const startPreview = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: isVideoEnabled,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Audio level monitoring
        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          if (cancelled) return;
          analyser.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          setAudioLevel(avg / 255);
          animFrameRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        // Camera/mic not available
      }
    };

    startPreview();

    return () => {
      cancelled = true;
      cancelAnimationFrame(animFrameRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  // Sync video track enabled state
  useEffect(() => {
    const stream = streamRef.current;
    if (!stream) return;
    stream.getVideoTracks().forEach((t) => (t.enabled = isVideoEnabled));
  }, [isVideoEnabled]);

  // Sync audio track enabled state
  useEffect(() => {
    const stream = streamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => (t.enabled = isAudioEnabled));
  }, [isAudioEnabled]);

  const handleJoin = useCallback(() => {
    // Stop preview stream — the call page will acquire its own
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    cancelAnimationFrame(animFrameRef.current);
    router.push(`/calls/${roomId}`);
  }, [router, roomId]);

  const handleCancel = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    cancelAnimationFrame(animFrameRef.current);
    router.push(`/chat/${roomId}`);
  }, [router, roomId]);

  const displayTitle = callTitle || room?.name || 'Call';

  return (
    <div className="flex h-full flex-col items-center justify-center bg-tg-bg-dark p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Title */}
        <div className="text-center">
          <h1 className="text-xl font-semibold text-tg-text">{displayTitle}</h1>
          <p className="mt-1 text-sm text-tg-text-secondary">
            Preview your camera and microphone before joining
          </p>
        </div>

        {/* Video preview */}
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`h-full w-full object-cover ${!isVideoEnabled ? 'hidden' : ''}`}
          />
          {!isVideoEnabled && (
            <div className="flex h-full items-center justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-tg-bg-input text-2xl font-semibold text-tg-text">
                <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
            </div>
          )}

          {/* Audio level indicator */}
          {isAudioEnabled && (
            <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
              <div className="flex items-end gap-0.5">
                {[0.2, 0.4, 0.6, 0.8].map((threshold, i) => (
                  <div
                    key={i}
                    className={`w-1 rounded-full transition-all ${
                      audioLevel > threshold ? 'bg-green-400' : 'bg-white/30'
                    }`}
                    style={{ height: `${8 + i * 4}px` }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-4">
          <button
            onClick={() => setAudioEnabled(!isAudioEnabled)}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
              isAudioEnabled
                ? 'bg-tg-bg-input text-tg-text hover:bg-tg-border'
                : 'bg-red-500 text-white'
            }`}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              {isAudioEnabled ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
              ) : (
                <>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
                </>
              )}
            </svg>
          </button>

          <button
            onClick={() => setVideoEnabled(!isVideoEnabled)}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
              isVideoEnabled
                ? 'bg-tg-bg-input text-tg-text hover:bg-tg-border'
                : 'bg-red-500 text-white'
            }`}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              {isVideoEnabled ? (
                <path strokeLinecap="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9.75a2.25 2.25 0 002.25-2.25V7.5a2.25 2.25 0 00-2.25-2.25H4.5A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
              ) : (
                <>
                  <path strokeLinecap="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9.75a2.25 2.25 0 002.25-2.25V7.5a2.25 2.25 0 00-2.25-2.25H4.5A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
                </>
              )}
            </svg>
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleCancel}
            className="flex-1 rounded-xl bg-tg-bg-input py-3 font-medium text-tg-text transition-colors hover:bg-tg-border"
          >
            Cancel
          </button>
          <button
            onClick={handleJoin}
            className="flex-1 rounded-xl bg-tg-accent py-3 font-semibold text-white transition-colors hover:bg-tg-accent/90"
          >
            Join Call
          </button>
        </div>
      </div>
    </div>
  );
};

export default LobbyPage;
