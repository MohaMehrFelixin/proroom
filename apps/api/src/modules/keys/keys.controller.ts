import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { KeysService } from './keys.service';
import { UploadKeysDto } from './dto/upload-keys.dto';

@Controller('keys')
@UseGuards(JwtAuthGuard)
export class KeysController {
  constructor(private readonly keysService: KeysService) {}

  @Post('upload')
  async uploadKeys(
    @Body() dto: UploadKeysDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.keysService.uploadKeys(req.user.id, dto);
  }

  @Get('user/:userId')
  async getPublicKeys(@Param('userId') userId: string) {
    return this.keysService.getPublicKeys(userId);
  }

  @Get('batch')
  async getBatchPublicKeys(@Query('userIds') userIds: string) {
    return this.keysService.getBatchPublicKeys(userIds.split(','));
  }

  @Get('sender-keys/:roomId')
  async getSenderKeys(
    @Param('roomId') roomId: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.keysService.getSenderKeys(roomId, req.user.id);
  }
}
