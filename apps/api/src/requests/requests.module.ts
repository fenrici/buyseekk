import { Module } from '@nestjs/common';
import { RatingsModule } from '../ratings/ratings.module';
import { PublicRequestsController } from './public-requests.controller';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';

@Module({
  imports: [RatingsModule],
  controllers: [RequestsController, PublicRequestsController],
  providers: [RequestsService],
  exports: [RequestsService],
})
export class RequestsModule {}
