import type {
  EncryptedMessage,
  SendMessagePayload,
  EncryptedSenderKeyPayload,
} from './message';
import type {
  IncomingCallPayload,
  SignalPayload,
  TransportOptions,
  ConnectTransportPayload,
  ProducePayload,
  ConsumerOptions,
  CallType,
} from './call';
import type { RtpCapabilities } from './mediasoup';

export interface ServerToClientEvents {
  'message:new': (payload: EncryptedMessage) => void;
  'message:delivered': (payload: { messageId: string }) => void;
  'message:edited': (payload: { messageId: string; roomId: string }) => void;
  'message:deleted': (payload: { messageId: string; roomId: string }) => void;
  'message:read': (payload: { roomId: string; userId: string; lastReadMessageId: string }) => void;

  'user:online': (payload: { userId: string }) => void;
  'user:offline': (payload: { userId: string }) => void;
  'user:typing': (payload: { roomId: string; userId: string }) => void;
  'user:stop-typing': (payload: { roomId: string; userId: string }) => void;

  'call:incoming': (payload: IncomingCallPayload) => void;
  'call:signal': (payload: SignalPayload) => void;
  'call:user-joined': (payload: {
    userId: string;
    displayName: string;
    producerIds: string[];
  }) => void;
  'call:user-left': (payload: { userId: string }) => void;
  'call:ended': (payload: { roomId: string }) => void;
  'call:router-rtp-capabilities': (payload: RtpCapabilities) => void;
  'call:transport-created': (payload: TransportOptions) => void;
  'call:produced': (payload: { producerId: string }) => void;
  'call:consumed': (payload: ConsumerOptions) => void;
  'call:new-producer': (payload: {
    userId: string;
    producerId: string;
    kind: 'audio' | 'video';
    appData: Record<string, unknown>;
  }) => void;

  'senderkey:distribute': (payload: EncryptedSenderKeyPayload) => void;
  'senderkey:request': (payload: { roomId: string; requesterId: string }) => void;

  'error': (payload: { message: string; code?: string }) => void;
}

export interface ClientToServerEvents {
  'message:send': (
    payload: SendMessagePayload,
    callback: (response: { messageId: string }) => void,
  ) => void;

  'room:join': (roomId: string) => void;
  'room:leave': (roomId: string) => void;

  'typing:start': (roomId: string) => void;
  'typing:stop': (roomId: string) => void;

  'call:initiate': (payload: {
    roomId: string;
    type: CallType;
  }) => void;
  'call:accept': (payload: { roomId: string }) => void;
  'call:reject': (payload: { roomId: string }) => void;
  'call:join-room': (
    roomId: string,
    callback: (response: { rtpCapabilities: RtpCapabilities }) => void,
  ) => void;
  'call:leave-room': (roomId: string) => void;
  'call:signal': (payload: SignalPayload) => void;
  'call:create-transport': (
    payload: { direction: 'send' | 'recv' },
    callback: (response: TransportOptions) => void,
  ) => void;
  'call:connect-transport': (
    payload: ConnectTransportPayload,
    callback: (response: { connected: boolean }) => void,
  ) => void;
  'call:produce': (
    payload: ProducePayload,
    callback: (response: { producerId: string }) => void,
  ) => void;
  'call:consume': (
    payload: { producerId: string },
    callback: (response: ConsumerOptions) => void,
  ) => void;
  'call:resume-consumer': (
    payload: { consumerId: string },
    callback: (response: { resumed: boolean }) => void,
  ) => void;

  'senderkey:distribute': (payload: EncryptedSenderKeyPayload) => void;
  'senderkey:request': (payload: { roomId: string; requesterId: string }) => void;

  'message:edit': (
    payload: { messageId: string; roomId: string; ciphertext: string; nonce: string },
    callback: (response: { success: boolean }) => void,
  ) => void;
  'message:delete': (
    payload: { messageId: string; roomId: string },
    callback: (response: { success: boolean }) => void,
  ) => void;
  'message:read': (payload: { roomId: string; lastReadMessageId: string }) => void;
}
