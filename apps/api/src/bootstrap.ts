import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { ThrottleExceptionFilter } from './common/filters/throttle-exception.filter';
import { MulterExceptionFilter } from './uploads/multer-exception.filter';
import { STORAGE_PROVIDER } from './storage/storage.interface';

export function configureApp(app: INestApplication) {
  const expressApp = app as NestExpressApplication;
  expressApp.enableShutdownHooks();
  expressApp.set('trust proxy', 1);

  const storageProvider = process.env.STORAGE_PROVIDER ?? STORAGE_PROVIDER.LOCAL;
  if (storageProvider === STORAGE_PROVIDER.LOCAL) {
    expressApp.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/api/uploads/' });
  }

  app.useGlobalFilters(
    new PrismaExceptionFilter(),
    new ThrottleExceptionFilter(),
    new MulterExceptionFilter(),
  );
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) {
        callback(null, process.env.NODE_ENV !== 'production');
        return;
      }
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.setGlobalPrefix('api');
}
