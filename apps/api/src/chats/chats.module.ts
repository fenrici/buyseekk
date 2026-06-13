import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ChatGateway } from './chat.gateway';
import { ChatsController } from './chats.controller';
import { ChatsService } from './chats.service';

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [ChatsController],
  providers: [ChatsService, ChatGateway],
})
export class ChatsModule {}
