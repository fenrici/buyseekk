import { Module } from '@nestjs/common';
import { RatingsModule } from '../ratings/ratings.module';
import { OffersController } from './offers.controller';
import { OffersService } from './offers.service';

@Module({
  imports: [RatingsModule],
  controllers: [OffersController],
  providers: [OffersService],
})
export class OffersModule {}
