import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { validateEnv } from './config/env.validation';
import { buildThrottlerDefinitions } from './config/throttle.config';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { ChatsModule } from './chats/chats.module';
import { HealthController } from './health.controller';
import { OffersModule } from './offers/offers.module';
import { RatingsModule } from './ratings/ratings.module';
import { PrismaModule } from './prisma/prisma.module';
import { RequestsModule } from './requests/requests.module';
import { StorageModule } from './storage/storage.module';
import { UploadsModule } from './uploads/uploads.module';
import { UsersModule } from './users/users.module';
import { SavedSearchesModule } from './saved-searches/saved-searches.module';
import { SavedRequestsModule } from './saved-requests/saved-requests.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ThrottlerModule.forRoot({
      skipIf: () => process.env.NODE_ENV === 'test',
      throttlers: buildThrottlerDefinitions(),
    }),
    StorageModule,
    CommonModule,
    PrismaModule,
    AuthModule,
    ChatsModule,
    UsersModule,
    RequestsModule,
    OffersModule,
    RatingsModule,
    UploadsModule,
    SavedSearchesModule,
    SavedRequestsModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
