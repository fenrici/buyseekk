import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateRatingDto } from './ratings.dto';
import { RatingsService } from './ratings.service';

@Controller('ratings')
@UseGuards(JwtAuthGuard)
export class RatingsController {
  constructor(private ratings: RatingsService) {}

  @Post()
  create(@Req() req: { user: { id: string } }, @Body() dto: CreateRatingDto) {
    return this.ratings.create(req.user.id, dto);
  }

  @Get('pending')
  pending(@Req() req: { user: { id: string } }) {
    return this.ratings.pending(req.user.id);
  }

  @Get('user/:userId/stats')
  stats(@Param('userId') userId: string) {
    return this.ratings.getStats(userId);
  }

  @Get('offer/:offerId')
  forOffer(@Req() req: { user: { id: string } }, @Param('offerId') offerId: string) {
    return this.ratings.forOffer(offerId, req.user.id);
  }
}
