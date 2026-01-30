import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { AddMemberDto } from './dto/add-member.dto';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRoomDto, createdBy: string) {
    const room = await this.prisma.room.create({
      data: {
        name: dto.name,
        type: dto.type,
        createdBy,
        members: {
          create: [
            { userId: createdBy, role: 'ADMIN' },
            ...dto.memberIds
              .filter((id) => id !== createdBy)
              .map((userId) => ({ userId, role: 'MEMBER' as const })),
          ],
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, username: true, displayName: true, avatarPath: true },
            },
          },
        },
      },
    });

    return room;
  }

  async findByUser(userId: string) {
    const rooms = await this.prisma.room.findMany({
      where: {
        members: { some: { userId } },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, username: true, displayName: true, avatarPath: true },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true, senderId: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return rooms;
  }

  async findById(roomId: string, userId: string) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, username: true, displayName: true, avatarPath: true },
            },
          },
        },
      },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    const isMember = room.members.some((m) => m.userId === userId);
    if (!isMember) {
      throw new ForbiddenException('Not a member of this room');
    }

    return room;
  }

  async addMember(roomId: string, dto: AddMemberDto, requesterId: string) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: { members: true },
    });

    if (!room) throw new NotFoundException('Room not found');

    const requester = room.members.find((m) => m.userId === requesterId);
    if (!requester || requester.role !== 'ADMIN') {
      throw new ForbiddenException('Only room admins can add members');
    }

    return this.prisma.roomMember.create({
      data: {
        roomId,
        userId: dto.userId,
        role: dto.role ?? 'MEMBER',
      },
      include: {
        user: {
          select: { id: true, username: true, displayName: true, avatarPath: true },
        },
      },
    });
  }

  async removeMember(roomId: string, userId: string, requesterId: string) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: { members: true },
    });

    if (!room) throw new NotFoundException('Room not found');

    const requester = room.members.find((m) => m.userId === requesterId);
    if (!requester || (requester.role !== 'ADMIN' && requesterId !== userId)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    await this.prisma.roomMember.delete({
      where: { roomId_userId: { roomId, userId } },
    });

    // Clean up sender keys for removed member
    await this.prisma.senderKeyDistribution.deleteMany({
      where: {
        roomId,
        OR: [{ senderUserId: userId }, { recipientUserId: userId }],
      },
    });

    return { success: true };
  }

  async getMessages(
    roomId: string,
    userId: string,
    cursor?: string,
    limit = 50,
  ) {
    // Verify membership
    const membership = await this.prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });

    if (!membership) {
      throw new ForbiddenException('Not a member of this room');
    }

    const messages = await this.prisma.message.findMany({
      where: { roomId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(cursor
        ? { cursor: { id: cursor }, skip: 1 }
        : {}),
      select: {
        id: true,
        roomId: true,
        senderId: true,
        ciphertext: true,
        nonce: true,
        encryptionType: true,
        senderKeyId: true,
        messageType: true,
        fileId: true,
        createdAt: true,
      },
    });

    return messages.map((m) => ({
      ...m,
      ciphertext: Buffer.from(m.ciphertext).toString('base64'),
      nonce: Buffer.from(m.nonce).toString('base64'),
    }));
  }

  async activateCall(roomId: string, userId: string, title?: string) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: { members: true },
    });

    if (!room) throw new NotFoundException('Room not found');

    const member = room.members.find((m) => m.userId === userId);
    if (!member || member.role !== 'ADMIN') {
      throw new ForbiddenException('Only room admins can start calls');
    }

    const callHandle = randomBytes(6).toString('base64url');

    const updated = await this.prisma.room.update({
      where: { id: roomId },
      data: {
        callHandle,
        callTitle: title || room.name,
        isCallActive: true,
        callStartedAt: new Date(),
        callStartedBy: userId,
      },
    });

    return {
      callHandle: updated.callHandle,
      callTitle: updated.callTitle,
      isCallActive: updated.isCallActive,
    };
  }

  async deactivateCall(roomId: string) {
    await this.prisma.room.update({
      where: { id: roomId },
      data: {
        isCallActive: false,
        callHandle: null,
        callTitle: null,
        callStartedAt: null,
        callStartedBy: null,
      },
    });
  }

  async resolveCallHandle(handle: string, userId: string) {
    const room = await this.prisma.room.findUnique({
      where: { callHandle: handle },
      include: { members: true },
    });

    if (!room) throw new NotFoundException('Invalid call link');

    const isMember = room.members.some((m) => m.userId === userId);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this room');
    }

    return {
      roomId: room.id,
      callTitle: room.callTitle,
      isCallActive: room.isCallActive,
    };
  }
}
