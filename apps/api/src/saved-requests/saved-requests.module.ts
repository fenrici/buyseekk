import { Module } from '@nestjs/common';
import { RequestsModule } from '../requests/requests.module';
import { SavedRequestsController } from './saved-requests.controller';
import { SavedRequestsService } from './saved-requests.service';

@Module({
  imports: [RequestsModule],
  controllers: [SavedRequestsController],
  providers: [SavedRequestsService],
})
export class SavedRequestsModule {}
