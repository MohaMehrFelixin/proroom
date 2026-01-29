// Minimal mediasoup type stubs for shared package
// Full types come from mediasoup/mediasoup-client packages

export interface RtpCapabilities {
  codecs: RtpCodecCapability[];
  headerExtensions?: Record<string, unknown>[];
}

export interface RtpCodecCapability {
  kind: 'audio' | 'video';
  mimeType: string;
  preferredPayloadType?: number;
  clockRate: number;
  channels?: number;
  parameters?: Record<string, unknown>;
  rtcpFeedback?: Record<string, unknown>[];
}

export interface RtpParameters {
  mid?: string;
  codecs: RtpCodecParameters[];
  headerExtensions?: Record<string, unknown>[];
  encodings?: Record<string, unknown>[];
  rtcp?: Record<string, unknown>;
}

export interface RtpCodecParameters {
  mimeType: string;
  payloadType: number;
  clockRate: number;
  channels?: number;
  parameters?: Record<string, unknown>;
  rtcpFeedback?: Record<string, unknown>[];
}
