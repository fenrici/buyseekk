import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthUser } from '../common/types/auth-user';
import { THROTTLE_LIMITS } from '../config/throttle.config';
import { CreateOfferDto } from './offers.dto';
import { OffersListQueryDto, SentOffersQueryDto } from './sent-offers.query.dto';
import { OffersService } from './offers.service';

@Controller('offers')
@UseGuards(JwtAuthGuard, RolesGuard)
@SkipThrottle()
export class OffersController {
  constructor(private offers: OffersService) {}

  @Throttle({ default: THROTTLE_LIMITS.offer })
  @Post()
  @Roles('seller')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateOfferDto) {
    return this.offers.create(user.id, dto);
  }

  @Get('received')
  @Roles('buyer')
  received(@CurrentUser() user: AuthUser, @Query() query: OffersListQueryDto) {
    return this.offers.received(user.id, query.page, query.limit, query.status);
  }

  @Get('received/highlights')
  @Roles('buyer')
  receivedHighlights(@CurrentUser() user: AuthUser) {
    return this.offers.receivedHighlights(user.id);
  }

  @Get('sent')
  @Roles('seller')
  sent(@CurrentUser() user: AuthUser, @Query() query: SentOffersQueryDto) {
    return this.offers.sent(user.id, query.page, query.limit, query.status);
  }

  @Get(':id/comparison')
  comparison(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.offers.getComparison(id, user.id);
  }

  @Throttle({ default: THROTTLE_LIMITS.write })
  @Patch(':id/accept')
  @Roles('buyer')
  accept(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.offers.accept(id, user.id);
  }

  @Throttle({ default: THROTTLE_LIMITS.write })
  @Patch(':id/complete')
  @Roles('buyer')
  complete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.offers.complete(id, user.id);
  }

  @Throttle({ default: THROTTLE_LIMITS.write })
  @Patch(':id/end-negotiation')
  endNegotiation(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.offers.endNegotiation(id, user.id);
  }

  @Throttle({ default: THROTTLE_LIMITS.write })
  @Patch(':id/reject')
  @Roles('buyer')
  reject(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.offers.reject(id, user.id);
  }

  @Throttle({ default: THROTTLE_LIMITS.write })
  @Delete(':id')
  removeFromListing(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.offers.removeFromListing(id, user.id);
  }
}
