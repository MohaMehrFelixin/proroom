import type { RtpCapabilities, RtpParameters } from './mediasoup';

export type CallType = 'audio' | 'video';
export type TransportDirection = 'send' | 'recv';
export type MediaKind = 'audio' | 'video';

export interface IncomingCallPayload {
  roomId: string;
  callerId: string;
  callerName: string;
  type: CallType;
}

export interface SignalPayload {
  roomId: string;
  targetUserId?: string;
  signal: Record<string, unknown>;
}

export interface TransportOptions {
  id: string;
  iceParameters: Record<string, unknown>;
  iceCandidates: Record<string, unknown>[];
  dtlsParameters: Record<string, unknown>;
}

export interface ConnectTransportPayload {
  transportId: string;
  dtlsParameters: Record<string, unknown>;
}

export interface ProducePayload {
  transportId: string;
  kind: MediaKind;
  rtpParameters: RtpParameters;
  appData?: Record<string, unknown>;
}

export interface ConsumerOptions {
  id: string;
  producerId: string;
  kind: MediaKind;
  rtpParameters: RtpParameters;
}

export interface CallParticipant {
  userId: string;
  displayName: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenSharing: boolean;
  producerIds: string[];
}
