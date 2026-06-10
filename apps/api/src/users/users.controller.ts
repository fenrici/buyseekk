import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../common/types/auth-user';
import { THROTTLE_LIMITS } from '../config/throttle.config';
import { UpdateProfileDto } from './users.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(user.id, dto);
  }

  @Throttle({ default: THROTTLE_LIMITS.search })
  @Get(':id/profile')
  profile(@Param('id') id: string) {
    return this.users.getPublicProfile(id);
  }

  @Throttle({ default: THROTTLE_LIMITS.search })
  @Get(':id/ratings')
  ratings(@Param('id') id: string) {
    return this.users.getRatingSummary(id);
  }
}
