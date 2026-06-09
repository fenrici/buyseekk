import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaginationQueryDto } from '../common/dto/pagination.query.dto';
import { THROTTLE_LIMITS } from '../config/throttle.config';
import { CreateRatingDto } from './ratings.dto';
import { RatingsService } from './ratings.service';

@Controller('ratings')
@UseGuards(JwtAuthGuard)
export class RatingsController {
  constructor(private ratings: RatingsService) {}

  @Throttle({ default: THROTTLE_LIMITS.write })
  @Post()
  create(@Req() req: { user: { id: string } }, @Body() dto: CreateRatingDto) {
    return this.ratings.create(req.user.id, dto);
  }

  @Get('pending')
  pending(@Req() req: { user: { id: string } }, @Query() query: PaginationQueryDto) {
    return this.ratings.pending(req.user.id, query.page, query.limit);
  }

  @Throttle({ default: THROTTLE_LIMITS.search })
  @Get('user/:userId/stats')
  stats(@Param('userId') userId: string) {
    return this.ratings.getStats(userId);
  }

  @Get('offer/:offerId')
  forOffer(@Req() req: { user: { id: string } }, @Param('offerId') offerId: string) {
    return this.ratings.forOffer(offerId, req.user.id);
  }
}
