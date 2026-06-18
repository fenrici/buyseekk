import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { MAX_UPLOAD_BYTES } from '@buyseekk/shared';
import { UploadsController } from './uploads.controller';

@Module({
  imports: [
    MulterModule.register({
      storage: memoryStorage(),
      limits: { fileSize: MAX_UPLOAD_BYTES, fields: 4 },
    }),
  ],
  controllers: [UploadsController],
})
export class UploadsModule {}
