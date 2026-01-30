import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { SendMessagePayload, EncryptedSenderKeyPayload, EncryptedMessage } from '@proroom/types';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async saveMessage(senderId: string, payload: SendMessagePayload): Promise<EncryptedMessage | EncryptedMessage[]> {
    // Update room's updatedAt
    await this.prisma.room.update({
      where: { id: payload.roomId },
      data: { updatedAt: new Date() },
    });

    // Group PAIRWISE: save one row per recipient
    if (payload.recipientCopies && payload.recipientCopies.length > 0) {
      const groupMessageId = `grp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const now = new Date();

      const messages = await this.prisma.$transaction(
        payload.recipientCopies.map((copy) =>
          this.prisma.message.create({
            data: {
              roomId: payload.roomId,
              senderId,
              ciphertext: Buffer.from(copy.ciphertext, 'base64'),
              nonce: Buffer.from(copy.nonce, 'base64'),
              encryptionType: payload.encryptionType,
              messageType: payload.messageType,
              fileId: payload.fileId,
              recipientUserId: copy.recipientUserId,
              groupMessageId,
              createdAt: now,
            },
          }),
        ),
      );

      return messages.map((m, i) => ({
        id: m.id,
        roomId: m.roomId,
        senderId: m.senderId,
        ciphertext: payload.recipientCopies![i].ciphertext,
        nonce: payload.recipientCopies![i].nonce,
        encryptionType: m.encryptionType as unknown as EncryptedMessage['encryptionType'],
        messageType: m.messageType as unknown as EncryptedMessage['messageType'],
        fileId: m.fileId ?? undefined,
        createdAt: m.createdAt.toISOString(),
        recipientUserId: m.recipientUserId ?? undefined,
        groupMessageId: m.groupMessageId ?? undefined,
      })) as EncryptedMessage[];
    }

    // DM or legacy: single message row
    const message = await this.prisma.message.create({
      data: {
        roomId: payload.roomId,
        senderId,
        ciphertext: Buffer.from(payload.ciphertext, 'base64'),
        nonce: Buffer.from(payload.nonce, 'base64'),
        encryptionType: payload.encryptionType,
        senderKeyId: payload.senderKeyId,
        messageType: payload.messageType,
        fileId: payload.fileId,
      },
    });

    return {
      id: message.id,
      roomId: message.roomId,
      senderId: message.senderId,
      ciphertext: payload.ciphertext,
      nonce: payload.nonce,
      encryptionType: message.encryptionType as unknown as EncryptedMessage['encryptionType'],
      senderKeyId: message.senderKeyId ?? undefined,
      messageType: message.messageType as unknown as EncryptedMessage['messageType'],
      fileId: message.fileId ?? undefined,
      createdAt: message.createdAt.toISOString(),
    };
  }

  async isRoomMember(roomId: string, userId: string): Promise<boolean> {
    const member = await this.prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
    return !!member;
  }

  async getRoomMemberIds(roomId: string): Promise<string[]> {
    const members = await this.prisma.roomMember.findMany({
      where: { roomId },
      select: { userId: true },
    });
    return members.map((m) => m.userId);
  }

  async editMessage(
    messageId: string,
    senderId: string,
    ciphertext: string,
    nonce: string,
  ) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });
    if (!message || message.senderId !== senderId) return null;
    if (message.isDeleted) return null;

    return this.prisma.message.update({
      where: { id: messageId },
      data: {
        ciphertext: Buffer.from(ciphertext, 'base64'),
        nonce: Buffer.from(nonce, 'base64'),
        isEdited: true,
      },
    });
  }

  async deleteMessage(messageId: string, senderId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });
    if (!message || message.senderId !== senderId) return null;

    return this.prisma.message.update({
      where: { id: messageId },
      data: { isDeleted: true },
    });
  }

  async markAsRead(roomId: string, userId: string, lastReadMessageId: string) {
    // Upsert read receipt for the last read message
    await this.prisma.readReceipt.upsert({
      where: {
        messageId_userId: { messageId: lastReadMessageId, userId },
      },
      create: {
        messageId: lastReadMessageId,
        userId,
      },
      update: {
        readAt: new Date(),
      },
    });
  }

  async getReadReceipts(messageId: string) {
    return this.prisma.readReceipt.findMany({
      where: { messageId },
      select: {
        userId: true,
        readAt: true,
      },
    });
  }

  async saveSenderKeyDistribution(payload: EncryptedSenderKeyPayload) {
    await this.prisma.senderKeyDistribution.upsert({
      where: {
        roomId_senderUserId_recipientUserId_keyId: {
          roomId: payload.roomId,
          senderUserId: payload.senderUserId,
          recipientUserId: payload.recipientUserId,
          keyId: payload.keyId,
        },
      },
      create: {
        roomId: payload.roomId,
        senderUserId: payload.senderUserId,
        recipientUserId: payload.recipientUserId,
        encryptedSenderKey: Buffer.from(payload.encryptedSenderKey, 'base64'),
        nonce: Buffer.from(payload.nonce, 'base64'),
        keyId: payload.keyId,
      },
      update: {
        encryptedSenderKey: Buffer.from(payload.encryptedSenderKey, 'base64'),
        nonce: Buffer.from(payload.nonce, 'base64'),
      },
    });
  }
}
