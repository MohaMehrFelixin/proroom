import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardStats() {
    const [totalUsers, activeUsers, totalRooms, totalMessages] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { isActive: true } }),
        this.prisma.room.count(),
        this.prisma.message.count(),
      ]);

    return { totalUsers, activeUsers, totalRooms, totalMessages };
  }

  async getActiveSessions() {
    const sessions = await this.prisma.session.findMany({
      where: { expiresAt: { gt: new Date() } },
      include: {
        user: {
          select: { id: true, username: true, displayName: true, avatarPath: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return sessions;
  }

  async revokeAllSessions(userId: string) {
    await this.prisma.session.deleteMany({ where: { userId } });
    return { success: true };
  }
}
