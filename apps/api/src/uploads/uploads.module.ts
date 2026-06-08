import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { MAX_UPLOAD_BYTES } from '@buyseekk/shared';
import { UploadsController } from './uploads.controller';

const UPLOAD_DIR = join(process.cwd(), 'uploads');
const ALLOWED = new Set(['.jpg', '.jpeg', '.png', '.webp']);

@Module({
  imports: [
    MulterModule.register({
      storage: diskStorage({
        destination: UPLOAD_DIR,
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname).toLowerCase();
          const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
          cb(null, name);
        },
      }),
      limits: { fileSize: MAX_UPLOAD_BYTES },
      fileFilter: (_req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase();
        if (!ALLOWED.has(ext)) {
          cb(new Error('Solo se permiten imágenes JPG, PNG o WebP'), false);
          return;
        }
        cb(null, true);
      },
    }),
  ],
  controllers: [UploadsController],
})
export class UploadsModule {}
