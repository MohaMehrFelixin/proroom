import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TurnService } from './turn.service';

@Controller('media')
@UseGuards(JwtAuthGuard)
export class TurnController {
  constructor(private readonly turnService: TurnService) {}

  @Get('turn-credentials')
  getTurnCredentials(@Request() req: { user: { id: string } }) {
    return this.turnService.generateCredentials(req.user.id);
  }
}
