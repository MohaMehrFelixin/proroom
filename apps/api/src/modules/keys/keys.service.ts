import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UploadKeysDto } from './dto/upload-keys.dto';

@Injectable()
export class KeysService {
  constructor(private readonly prisma: PrismaService) {}

  async uploadKeys(userId: string, dto: UploadKeysDto) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        identityKey: dto.identityKey,
        signedPreKey: dto.signedPreKey,
        preKeySignature: dto.preKeySignature,
      },
    });

    return { success: true };
  }

  async getPublicKeys(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        identityKey: true,
        signedPreKey: true,
        preKeySignature: true,
      },
    });

    if (!user || !user.identityKey) {
      throw new NotFoundException('Public keys not found for this user');
    }

    return {
      userId: user.id,
      identityKey: user.identityKey,
      signedPreKey: user.signedPreKey,
      preKeySignature: user.preKeySignature,
    };
  }

  async getBatchPublicKeys(userIds: string[]) {
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        identityKey: true,
        signedPreKey: true,
        preKeySignature: true,
      },
    });

    return users
      .filter((u) => u.identityKey)
      .map((u) => ({
        userId: u.id,
        identityKey: u.identityKey,
        signedPreKey: u.signedPreKey,
        preKeySignature: u.preKeySignature,
      }));
  }

  async getSenderKeys(roomId: string, recipientUserId: string) {
    const keys = await this.prisma.senderKeyDistribution.findMany({
      where: { roomId, recipientUserId },
      select: {
        senderUserId: true,
        encryptedSenderKey: true,
        nonce: true,
        keyId: true,
      },
    });

    return keys.map((k) => ({
      senderUserId: k.senderUserId,
      encryptedSenderKey: Buffer.from(k.encryptedSenderKey).toString('base64'),
      nonce: Buffer.from(k.nonce).toString('base64'),
      keyId: k.keyId,
    }));
  }
}
