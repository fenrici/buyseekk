import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { EmailModule } from '../email/email.module';
import { PrismaModule } from '../prisma/prisma.module';
import {
  EmailNotificationChannel,
  InAppNotificationChannel,
  PushNotificationChannel,
} from './notification-channels';
import { NotificationGateway } from './notification.gateway';
import { NotificationsController } from './notifications.controller';
import { NotificationsScheduler } from './notifications.scheduler';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [
    PrismaModule,
    EmailModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'dev-secret-change-me'),
        signOptions: {
          expiresIn: (config.get<string>('JWT_ACCESS_EXPIRES') ??
            config.get('JWT_EXPIRES_IN', '15m')) as JwtSignOptions['expiresIn'],
        },
      }),
    }),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationGateway,
    InAppNotificationChannel,
    EmailNotificationChannel,
    PushNotificationChannel,
    NotificationsScheduler,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
