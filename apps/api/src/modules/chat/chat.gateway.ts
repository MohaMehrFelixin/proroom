import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  SendMessagePayload,
  EncryptedSenderKeyPayload,
} from '@proroom/types';

interface AuthenticatedSocket extends Socket {
  userId: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server<ClientToServerEvents, ServerToClientEvents>;

  private userSockets = new Map<string, Set<string>>();

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
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

      // Track user sockets
      if (!this.userSockets.has(client.userId)) {
        this.userSockets.set(client.userId, new Set());
      }
      this.userSockets.get(client.userId)!.add(client.id);

      // Join user's personal room for direct notifications
      client.join(`user:${client.userId}`);

      this.server.emit('user:online', { userId: client.userId });
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    if (!client.userId) return;

    const sockets = this.userSockets.get(client.userId);
    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.userSockets.delete(client.userId);
        this.server.emit('user:offline', { userId: client.userId });
      }
    }
  }

  @SubscribeMessage('room:join')
  async handleJoinRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() roomId: string,
  ) {
    const isMember = await this.chatService.isRoomMember(
      roomId,
      client.userId,
    );
    if (!isMember) {
      client.emit('error', { message: 'Not a member of this room' });
      return;
    }
    client.join(`room:${roomId}`);
  }

  @SubscribeMessage('room:leave')
  async handleLeaveRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() roomId: string,
  ) {
    client.leave(`room:${roomId}`);
  }

  @SubscribeMessage('message:send')
  async handleMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: SendMessagePayload,
  ) {
    const isMember = await this.chatService.isRoomMember(
      payload.roomId,
      client.userId,
    );
    if (!isMember) {
      client.emit('error', { message: 'Not a member of this room' });
      return;
    }

    const message = await this.chatService.saveMessage(
      client.userId,
      payload,
    );

    // Broadcast to all room members
    this.server.to(`room:${payload.roomId}`).emit('message:new', message);

    // Also notify offline members via their personal rooms
    const memberIds = await this.chatService.getRoomMemberIds(payload.roomId);
    for (const memberId of memberIds) {
      if (memberId !== client.userId) {
        this.server.to(`user:${memberId}`).emit('message:new', message);
      }
    }

    return { messageId: message.id };
  }

  @SubscribeMessage('typing:start')
  handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() roomId: string,
  ) {
    client.to(`room:${roomId}`).emit('user:typing', {
      roomId,
      userId: client.userId,
    });
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() roomId: string,
  ) {
    client.to(`room:${roomId}`).emit('user:stop-typing', {
      roomId,
      userId: client.userId,
    });
  }

  @SubscribeMessage('message:edit')
  async handleEditMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    payload: {
      messageId: string;
      roomId: string;
      ciphertext: string;
      nonce: string;
    },
  ) {
    const updated = await this.chatService.editMessage(
      payload.messageId,
      client.userId,
      payload.ciphertext,
      payload.nonce,
    );
    if (!updated) return { success: false };

    this.server.to(`room:${payload.roomId}`).emit('message:edited', {
      messageId: payload.messageId,
      roomId: payload.roomId,
    });
    return { success: true };
  }

  @SubscribeMessage('message:delete')
  async handleDeleteMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { messageId: string; roomId: string },
  ) {
    const deleted = await this.chatService.deleteMessage(
      payload.messageId,
      client.userId,
    );
    if (!deleted) return { success: false };

    this.server.to(`room:${payload.roomId}`).emit('message:deleted', {
      messageId: payload.messageId,
      roomId: payload.roomId,
    });
    return { success: true };
  }

  @SubscribeMessage('message:read')
  async handleReadReceipt(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { roomId: string; lastReadMessageId: string },
  ) {
    await this.chatService.markAsRead(
      payload.roomId,
      client.userId,
      payload.lastReadMessageId,
    );

    // Notify room members about read status
    client.to(`room:${payload.roomId}`).emit('message:read', {
      roomId: payload.roomId,
      userId: client.userId,
      lastReadMessageId: payload.lastReadMessageId,
    });
  }

  @SubscribeMessage('senderkey:distribute')
  async handleSenderKeyDistribution(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: EncryptedSenderKeyPayload,
  ) {
    await this.chatService.saveSenderKeyDistribution(payload);

    // Forward to recipient
    this.server
      .to(`user:${payload.recipientUserId}`)
      .emit('senderkey:distribute', payload);
  }

  @SubscribeMessage('senderkey:request')
  handleSenderKeyRequest(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { roomId: string; requesterId: string },
  ) {
    // Broadcast to all room members so they can re-distribute their sender keys
    client.to(`room:${payload.roomId}`).emit('senderkey:request', {
      roomId: payload.roomId,
      requesterId: client.userId,
    });
  }
}
