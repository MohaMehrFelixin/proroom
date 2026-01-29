import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';

const CREDENTIAL_TTL_SECONDS = 86400; // 24 hours

export interface TurnCredentials {
  urls: string[];
  username: string;
  credential: string;
}

@Injectable()
export class TurnService {
  private readonly turnSecret: string;
  private readonly turnHost: string;

  constructor(private readonly config: ConfigService) {
    this.turnSecret = this.config.getOrThrow('TURN_SECRET');
    this.turnHost = this.config.get(
      'TURN_HOST',
      this.config.get('MEDIASOUP_ANNOUNCED_IP', '127.0.0.1'),
    );
  }

  generateCredentials(userId: string): TurnCredentials {
    const timestamp = Math.floor(Date.now() / 1000) + CREDENTIAL_TTL_SECONDS;
    const username = `${timestamp}:${userId}`;
    const credential = createHmac('sha1', this.turnSecret)
      .update(username)
      .digest('base64');

    return {
      urls: [
        `turn:${this.turnHost}:3478?transport=udp`,
        `turn:${this.turnHost}:3478?transport=tcp`,
        `turns:${this.turnHost}:5349?transport=tcp`,
      ],
      username,
      credential,
    };
  }
}
