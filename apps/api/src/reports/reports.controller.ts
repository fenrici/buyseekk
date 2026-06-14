import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SecurityLogService } from '../auth/security-log.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../common/types/auth-user';
import { THROTTLE_LIMITS } from '../config/throttle.config';
import { CreateReportDto } from './reports.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private reports: ReportsService) {}

  @Throttle({ default: THROTTLE_LIMITS.write })
  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateReportDto,
    @Req() req: { ip?: string; headers?: Record<string, string | string[] | undefined> },
  ) {
    return this.reports.create(user.id, dto, SecurityLogService.fromRequest(req));
  }
}
