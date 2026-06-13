import { Module } from '@nestjs/common';
import { RatingsModule } from '../ratings/ratings.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OffersController } from './offers.controller';
import { OffersService } from './offers.service';

@Module({
  imports: [RatingsModule, NotificationsModule],
  controllers: [OffersController],
  providers: [OffersService],
})
export class OffersModule {}
