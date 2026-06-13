import { Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthUser } from '../common/types/auth-user';
import { SavedRequestsService } from './saved-requests.service';

@Controller('saved-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('seller')
export class SavedRequestsController {
  constructor(private saved: SavedRequestsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.saved.list(user);
  }

  @Post(':requestId')
  save(@CurrentUser() user: AuthUser, @Param('requestId') requestId: string) {
    return this.saved.save(user, requestId);
  }

  @Delete(':requestId')
  remove(@CurrentUser() user: AuthUser, @Param('requestId') requestId: string) {
    return this.saved.remove(user, requestId);
  }
}
