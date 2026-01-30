import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { MediaService } from './media.service';
import { RoomsService } from '../rooms/rooms.service';
import type { RtpCapabilities } from 'mediasoup/node/lib/types';

interface AuthenticatedSocket extends Socket {
  userId: string;
  currentCallRoom?: string;
  rtpCapabilities?: RtpCapabilities;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/media',
})
export class MediaGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly mediaService: MediaService,
    private readonly jwtService: JwtService,
    private readonly roomsService: RoomsService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth.token ??
        client.handshake.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        client.disconnect();
        return;
      }
      const payload = this.jwtService.verify<{ sub: string }>(token);
      client.userId = payload.sub;
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.currentCallRoom) {
      this.mediaService.removePeer(client.currentCallRoom, client.userId);
      this.server
        .to(`call:${client.currentCallRoom}`)
        .emit('call:user-left', { userId: client.userId });
      client.leave(`call:${client.currentCallRoom}`);
    }
  }

  @SubscribeMessage('call:join-room')
  async handleJoinRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string; rtpCapabilities: RtpCapabilities },
  ) {
    const { roomId, rtpCapabilities } = data;
    client.currentCallRoom = roomId;
    client.rtpCapabilities = rtpCapabilities;

    const room = await this.mediaService.getOrCreateRoom(roomId);
    client.join(`call:${roomId}`);

    // Notify others
    client.to(`call:${roomId}`).emit('call:user-joined', {
      userId: client.userId,
      displayName: client.userId, // resolved by frontend
      producerIds: [],
    });

    // Return existing producers for the new peer to consume
    const existingProducers = this.mediaService.getProducers(
      roomId,
      client.userId,
    );

    return {
      rtpCapabilities: room.router.rtpCapabilities,
      existingProducers,
    };
  }

  @SubscribeMessage('call:update-rtp-capabilities')
  handleUpdateRtpCapabilities(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { rtpCapabilities: RtpCapabilities },
  ) {
    client.rtpCapabilities = data.rtpCapabilities;
  }

  @SubscribeMessage('call:leave-room')
  async handleLeaveRoom(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.currentCallRoom) return;

    const roomId = client.currentCallRoom;
    this.mediaService.removePeer(roomId, client.userId);
    this.server
      .to(`call:${roomId}`)
      .emit('call:user-left', { userId: client.userId });
    client.leave(`call:${roomId}`);
    client.currentCallRoom = undefined;
  }

  @SubscribeMessage('call:create-transport')
  async handleCreateTransport(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { direction: 'send' | 'recv' },
  ) {
    if (!client.currentCallRoom) return;

    const transport = await this.mediaService.createTransport(
      client.currentCallRoom,
      client.userId,
      data.direction,
    );

    return transport;
  }

  @SubscribeMessage('call:connect-transport')
  async handleConnectTransport(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: { transportId: string; dtlsParameters: Record<string, unknown> },
  ) {
    if (!client.currentCallRoom) return;

    await this.mediaService.connectTransport(
      client.currentCallRoom,
      client.userId,
      data.transportId,
      data.dtlsParameters,
    );

    return { connected: true };
  }

  @SubscribeMessage('call:produce')
  async handleProduce(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: {
      transportId: string;
      kind: 'audio' | 'video';
      rtpParameters: Record<string, unknown>;
      appData?: Record<string, unknown>;
    },
  ) {
    if (!client.currentCallRoom) return;

    const producerId = await this.mediaService.produce(
      client.currentCallRoom,
      client.userId,
      data.transportId,
      data.kind,
      data.rtpParameters as never,
      data.appData,
    );

    // Notify others about new producer
    client.to(`call:${client.currentCallRoom}`).emit('call:new-producer', {
      userId: client.userId,
      producerId,
      kind: data.kind,
      appData: data.appData ?? {},
    });

    return { producerId };
  }

  @SubscribeMessage('call:consume')
  async handleConsume(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { producerId: string },
  ) {
    if (!client.currentCallRoom || !client.rtpCapabilities) return;

    const consumerData = await this.mediaService.consume(
      client.currentCallRoom,
      client.userId,
      data.producerId,
      client.rtpCapabilities,
    );

    return consumerData;
  }

  @SubscribeMessage('call:resume-consumer')
  async handleResumeConsumer(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { consumerId: string },
  ) {
    if (!client.currentCallRoom) return;

    await this.mediaService.resumeConsumer(
      client.currentCallRoom,
      client.userId,
      data.consumerId,
    );

    return { resumed: true };
  }

  // P2P signaling for 1-on-1 calls
  @SubscribeMessage('call:signal')
  handleSignal(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: {
      roomId: string;
      targetUserId: string;
      signal: Record<string, unknown>;
    },
  ) {
    this.server.to(`user:${data.targetUserId}`).emit('call:signal', {
      roomId: data.roomId,
      signal: data.signal,
      targetUserId: client.userId,
    });
  }

  @SubscribeMessage('call:end-for-all')
  async handleEndForAll(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ) {
    const { roomId } = data;

    // Broadcast to all participants in the call room
    this.server.to(`call:${roomId}`).emit('call:ended', { roomId });

    // Clean up the media room
    await this.mediaService.closeRoom(roomId);

    // Deactivate call in DB
    try {
      await this.roomsService.deactivateCall(roomId);
    } catch {
      // Room may not exist or call already deactivated
    }
  }
}
