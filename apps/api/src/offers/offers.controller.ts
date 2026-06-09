import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginationQueryDto } from '../common/dto/pagination.query.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthUser } from '../common/types/auth-user';
import { THROTTLE_LIMITS } from '../config/throttle.config';
import { CreateOfferDto } from './offers.dto';
import { OffersService } from './offers.service';

@Controller('offers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OffersController {
  constructor(private offers: OffersService) {}

  @Throttle({ offer: THROTTLE_LIMITS.offer })
  @Post()
  @Roles('seller')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateOfferDto) {
    return this.offers.create(user.id, dto);
  }

  @Get('received')
  @Roles('buyer')
  received(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto) {
    return this.offers.received(user.id, query.page, query.limit);
  }

  @Get('sent')
  @Roles('seller')
  sent(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto) {
    return this.offers.sent(user.id, query.page, query.limit);
  }

  @Get(':id/comparison')
  comparison(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.offers.getComparison(id, user.id);
  }

  @Throttle({ write: THROTTLE_LIMITS.write })
  @Patch(':id/accept')
  @Roles('buyer')
  accept(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.offers.accept(id, user.id);
  }

  @Throttle({ write: THROTTLE_LIMITS.write })
  @Patch(':id/reject')
  @Roles('buyer')
  reject(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.offers.reject(id, user.id);
  }
}
