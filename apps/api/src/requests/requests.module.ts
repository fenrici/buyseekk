import { Module } from '@nestjs/common';
import { RatingsModule } from '../ratings/ratings.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PublicRequestsController } from './public-requests.controller';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';

@Module({
  imports: [RatingsModule, NotificationsModule],
  controllers: [RequestsController, PublicRequestsController],
  providers: [RequestsService],
  exports: [RequestsService],
})
export class RequestsModule {}
