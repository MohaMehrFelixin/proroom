import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import type { AuthResponse, AuthTokens } from '@proroom/types';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_SECONDS = 900; // 15 minutes
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

@Injectable()
export class AuthService {
  private readonly refreshSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {
    this.refreshSecret = this.config.getOrThrow('JWT_REFRESH_SECRET');
  }

  async register(
    dto: RegisterDto,
    ipAddress?: string,
    deviceInfo?: string,
  ): Promise<AuthResponse> {
    const existing = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });

    if (existing) {
      throw new ConflictException('Username already exists');
    }

    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        displayName: dto.displayName,
        passwordHash,
        role: 'MEMBER',
      },
    });

    const tokens = await this.generateTokens(user.id);

    const tokenHash = this.hashToken(tokens.refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    await this.prisma.session.create({
      data: {
        userId: user.id,
        tokenHash,
        ipAddress,
        deviceInfo,
        expiresAt,
      },
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role as unknown as AuthResponse['user']['role'],
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
      tokens,
    };
  }

  async login(
    dto: LoginDto,
    ipAddress?: string,
    deviceInfo?: string,
  ): Promise<AuthResponse> {
    await this.checkBruteForce(dto.username);

    const user = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });

    if (!user || !user.isActive) {
      await this.recordFailedAttempt(dto.username);
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) {
      await this.recordFailedAttempt(dto.username);
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.clearFailedAttempts(dto.username);

    const tokens = await this.generateTokens(user.id);

    const tokenHash = this.hashToken(tokens.refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    await this.prisma.session.create({
      data: {
        userId: user.id,
        tokenHash,
        ipAddress,
        deviceInfo,
        expiresAt,
      },
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role as unknown as AuthResponse['user']['role'],
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
      tokens,
    };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const tokenHash = this.hashToken(refreshToken);

    const session = await this.prisma.session.findUnique({
      where: { tokenHash },
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await this.prisma.session.delete({ where: { id: session.id } });
      }
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Rotate refresh token
    await this.prisma.session.delete({ where: { id: session.id } });

    const tokens = await this.generateTokens(session.userId);

    const newTokenHash = this.hashToken(tokens.refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    await this.prisma.session.create({
      data: {
        userId: session.userId,
        tokenHash: newTokenHash,
        ipAddress: session.ipAddress,
        deviceInfo: session.deviceInfo,
        expiresAt,
      },
    });

    return tokens;
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.session
      .delete({ where: { tokenHash } })
      .catch(() => null);
  }

  async logoutAll(userId: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { userId } });
  }

  async validateJwtPayload(payload: {
    sub: string;
  }): Promise<{ id: string; role: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return { id: user.id, role: user.role };
  }

  private async generateTokens(userId: string): Promise<AuthTokens> {
    const accessToken = this.jwt.sign({ sub: userId });

    const refreshToken = randomBytes(64).toString('hex');

    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async checkBruteForce(username: string): Promise<void> {
    const key = `login-attempts:${username}`;
    const attempts = await this.redis.get(key);

    if (attempts && parseInt(attempts) >= MAX_LOGIN_ATTEMPTS) {
      throw new ForbiddenException(
        'Account temporarily locked. Try again later.',
      );
    }
  }

  private async recordFailedAttempt(username: string): Promise<void> {
    const key = `login-attempts:${username}`;
    const current = await this.redis.incr(key);
    if (current === 1) {
      await this.redis.expire(key, LOCKOUT_DURATION_SECONDS);
    }
  }

  private async clearFailedAttempts(username: string): Promise<void> {
    await this.redis.del(`login-attempts:${username}`);
  }
}
