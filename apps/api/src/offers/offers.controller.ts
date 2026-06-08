import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateOfferDto } from './offers.dto';
import { OffersService } from './offers.service';

@Controller('offers')
@UseGuards(JwtAuthGuard)
export class OffersController {
  constructor(private offers: OffersService) {}

  @Post()
  create(@Req() req: { user: { id: string } }, @Body() dto: CreateOfferDto) {
    return this.offers.create(req.user.id, dto);
  }

  @Get('received')
  received(@Req() req: { user: { id: string } }) {
    return this.offers.received(req.user.id);
  }

  @Get('sent')
  sent(@Req() req: { user: { id: string } }) {
    return this.offers.sent(req.user.id);
  }

  @Get(':id/comparison')
  comparison(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    return this.offers.getComparison(id, req.user.id);
  }

  @Patch(':id/accept')
  accept(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    return this.offers.accept(id, req.user.id);
  }

  @Patch(':id/reject')
  reject(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    return this.offers.reject(id, req.user.id);
  }
}
