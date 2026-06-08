import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { ChatsModule } from './chats/chats.module';
import { HealthController } from './health.controller';
import { OffersModule } from './offers/offers.module';
import { RatingsModule } from './ratings/ratings.module';
import { PrismaModule } from './prisma/prisma.module';
import { RequestsModule } from './requests/requests.module';
import { UploadsModule } from './uploads/uploads.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    CommonModule,
    PrismaModule,
    AuthModule,
    ChatsModule,
    UsersModule,
    RequestsModule,
    OffersModule,
    RatingsModule,
    UploadsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
