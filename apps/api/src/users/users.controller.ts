import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../common/types/auth-user';
import { THROTTLE_LIMITS } from '../config/throttle.config';
import {
  LastSearchFiltersDto,
  SellerProfileDto,
  UpdateActiveModeDto,
  UpdateLanguageDto,
  UpdatePreferencesDto,
  UpdateProfileDto,
} from './users.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @SkipThrottle()
  @Patch('me')
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @SkipThrottle()
  @Get('me/settings')
  settings(@CurrentUser() user: AuthUser) {
    return this.users.getSettings(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @SkipThrottle()
  @Patch('me/language')
  updateLanguage(@CurrentUser() user: AuthUser, @Body() dto: UpdateLanguageDto) {
    return this.users.updateLanguage(user.id, dto.locale);
  }

  @UseGuards(JwtAuthGuard)
  @SkipThrottle()
  @Patch('me/preferences')
  updatePreferences(@CurrentUser() user: AuthUser, @Body() dto: UpdatePreferencesDto) {
    return this.users.updatePreferences(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @SkipThrottle()
  @Patch('me/active-mode')
  updateActiveMode(@CurrentUser() user: AuthUser, @Body() dto: UpdateActiveModeDto) {
    return this.users.updateActiveMode(user.id, dto.activeMode);
  }

  @UseGuards(JwtAuthGuard)
  @SkipThrottle()
  @Post('me/seller-profile')
  createSellerProfile(@CurrentUser() user: AuthUser, @Body() dto: SellerProfileDto) {
    return this.users.createSellerProfile(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @SkipThrottle()
  @Patch('me/seller-profile')
  updateSellerProfile(@CurrentUser() user: AuthUser, @Body() dto: SellerProfileDto) {
    return this.users.updateSellerProfile(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @SkipThrottle()
  @Patch('me/last-search-filters')
  updateLastFilters(@CurrentUser() user: AuthUser, @Body() dto: LastSearchFiltersDto) {
    return this.users.updateLastSearchFilters(user.id, dto);
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
