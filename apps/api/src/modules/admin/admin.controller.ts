import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('sessions')
  async getActiveSessions() {
    return this.adminService.getActiveSessions();
  }

  @Post('sessions/:userId/revoke')
  async revokeAllSessions(@Param('userId') userId: string) {
    return this.adminService.revokeAllSessions(userId);
  }
}
