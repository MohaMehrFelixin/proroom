import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MediaGateway } from './media.gateway';
import { MediaService } from './media.service';
import { TurnService } from './turn.service';
import { TurnController } from './turn.controller';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [TurnController],
  providers: [MediaGateway, MediaService, TurnService],
  exports: [TurnService],
})
export class MediaModule {}
