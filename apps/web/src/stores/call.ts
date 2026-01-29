import { create } from 'zustand';
import type { CallParticipant } from '@proroom/types';

type CallStatus = 'idle' | 'connecting' | 'ringing' | 'active';

interface CallState {
  status: CallStatus;
  activeRoomId: string | null;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  participants: Map<string, CallParticipant>;
  localStream: MediaStream | null;
  screenStream: MediaStream | null;
  pinnedUserId: string | null;
  participantNames: Record<string, string>;
  callDuration: number;

  setStatus: (status: CallStatus) => void;
  setActiveRoom: (roomId: string | null) => void;
  toggleAudio: () => void;
  toggleVideo: () => void;
  setAudioEnabled: (enabled: boolean) => void;
  setVideoEnabled: (enabled: boolean) => void;
  setScreenSharing: (sharing: boolean) => void;
  addParticipant: (participant: CallParticipant) => void;
  removeParticipant: (userId: string) => void;
  setLocalStream: (stream: MediaStream | null) => void;
  setScreenStream: (stream: MediaStream | null) => void;
  setPinnedUser: (userId: string | null) => void;
  setParticipantName: (userId: string, name: string) => void;
  setCallDuration: (duration: number) => void;
  reset: () => void;
}

export const useCallStore = create<CallState>((set) => ({
  status: 'idle',
  activeRoomId: null,
  isAudioEnabled: true,
  isVideoEnabled: true,
  isScreenSharing: false,
  participants: new Map(),
  localStream: null,
  screenStream: null,
  pinnedUserId: null,
  participantNames: {},
  callDuration: 0,

  setStatus: (status) => set({ status }),
  setActiveRoom: (roomId) => set({ activeRoomId: roomId }),
  toggleAudio: () => set((s) => ({ isAudioEnabled: !s.isAudioEnabled })),
  toggleVideo: () => set((s) => ({ isVideoEnabled: !s.isVideoEnabled })),
  setAudioEnabled: (enabled) => set({ isAudioEnabled: enabled }),
  setVideoEnabled: (enabled) => set({ isVideoEnabled: enabled }),
  setScreenSharing: (sharing) => set({ isScreenSharing: sharing }),

  addParticipant: (participant) =>
    set((state) => {
      const updated = new Map(state.participants);
      updated.set(participant.userId, participant);
      return { participants: updated };
    }),

  removeParticipant: (userId) =>
    set((state) => {
      const updated = new Map(state.participants);
      updated.delete(userId);
      return { participants: updated };
    }),

  setLocalStream: (stream) => set({ localStream: stream }),
  setScreenStream: (stream) => set({ screenStream: stream }),
  setPinnedUser: (userId) => set({ pinnedUserId: userId }),

  setParticipantName: (userId, name) =>
    set((state) => ({
      participantNames: { ...state.participantNames, [userId]: name },
    })),

  setCallDuration: (duration) => set({ callDuration: duration }),

  reset: () =>
    set({
      status: 'idle',
      activeRoomId: null,
      isAudioEnabled: true,
      isVideoEnabled: true,
      isScreenSharing: false,
      participants: new Map(),
      localStream: null,
      screenStream: null,
      pinnedUserId: null,
      participantNames: {},
      callDuration: 0,
    }),
}));
