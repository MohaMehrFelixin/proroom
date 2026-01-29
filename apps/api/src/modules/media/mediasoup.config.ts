import type { WorkerSettings, RouterOptions, WebRtcTransportOptions } from 'mediasoup/node/lib/types';
import * as os from 'os';

const MEDIASOUP_LISTEN_IP = process.env.MEDIASOUP_LISTEN_IP ?? '0.0.0.0';
const MEDIASOUP_ANNOUNCED_IP = process.env.MEDIASOUP_ANNOUNCED_IP ?? '127.0.0.1';
const MIN_PORT = parseInt(process.env.MEDIASOUP_MIN_PORT ?? '40000');
const MAX_PORT = parseInt(process.env.MEDIASOUP_MAX_PORT ?? '40100');

export const workerSettings: WorkerSettings = {
  logLevel: 'warn',
  rtcMinPort: MIN_PORT,
  rtcMaxPort: MAX_PORT,
};

export const numWorkers = Math.min(os.cpus().length, 4);

export const routerOptions: RouterOptions = {
  mediaCodecs: [
    {
      kind: 'audio',
      mimeType: 'audio/opus',
      clockRate: 48000,
      channels: 2,
    },
    {
      kind: 'video',
      mimeType: 'video/VP8',
      clockRate: 90000,
      parameters: {
        'x-google-start-bitrate': 1000,
      },
    },
    {
      kind: 'video',
      mimeType: 'video/VP9',
      clockRate: 90000,
      parameters: {
        'profile-id': 2,
        'x-google-start-bitrate': 1000,
      },
    },
    {
      kind: 'video',
      mimeType: 'video/H264',
      clockRate: 90000,
      parameters: {
        'packetization-mode': 1,
        'profile-level-id': '4d0032',
        'level-asymmetry-allowed': 1,
        'x-google-start-bitrate': 1000,
      },
    },
  ],
};

export const transportOptions: WebRtcTransportOptions = {
  listenIps: [
    {
      ip: MEDIASOUP_LISTEN_IP,
      announcedIp: MEDIASOUP_ANNOUNCED_IP,
    },
  ],
  initialAvailableOutgoingBitrate: 1000000,
  maxSctpMessageSize: 262144,
  enableUdp: true,
  enableTcp: true,
  preferUdp: true,
};
