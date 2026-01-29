import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { AddMemberDto } from './dto/add-member.dto';

@Controller('rooms')
@UseGuards(JwtAuthGuard)
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  async create(@Body() dto: CreateRoomDto, @Request() req: { user: { id: string } }) {
    return this.roomsService.create(dto, req.user.id);
  }

  @Get()
  async findByUser(@Request() req: { user: { id: string } }) {
    return this.roomsService.findByUser(req.user.id);
  }

  @Get(':id')
  async findById(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.roomsService.findById(id, req.user.id);
  }

  @Get(':id/messages')
  async getMessages(
    @Param('id') roomId: string,
    @Query('cursor') cursor: string | undefined,
    @Query('limit') limit: string | undefined,
    @Request() req: { user: { id: string } },
  ) {
    return this.roomsService.getMessages(
      roomId,
      req.user.id,
      cursor,
      limit ? parseInt(limit) : 50,
    );
  }

  @Post(':id/members')
  async addMember(
    @Param('id') roomId: string,
    @Body() dto: AddMemberDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.roomsService.addMember(roomId, dto, req.user.id);
  }

  @Delete(':id/members/:userId')
  async removeMember(
    @Param('id') roomId: string,
    @Param('userId') userId: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.roomsService.removeMember(roomId, userId, req.user.id);
  }
}
