import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FilesService } from './files.service';
import { RequestUploadDto } from './dto/request-upload.dto';
import { RequestAvatarUploadDto } from './dto/request-avatar-upload.dto';

@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload-url')
  async getUploadUrl(
    @Body() dto: RequestUploadDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.filesService.getUploadUrl(
      dto.roomId,
      req.user.id,
      dto.fileName,
      dto.mimeType,
      dto.size,
    );
  }

  @Post('avatar-upload-url')
  async getAvatarUploadUrl(
    @Body() dto: RequestAvatarUploadDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.filesService.getAvatarUploadUrl(
      req.user.id,
      dto.mimeType,
      dto.size,
    );
  }

  @Get(':fileId/download-url')
  async getDownloadUrl(@Param('fileId') fileId: string) {
    return this.filesService.getDownloadUrl(fileId);
  }
}
