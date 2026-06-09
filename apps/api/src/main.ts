import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';
import { configureWebSocket } from './chats/configure-websocket';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  await configureWebSocket(app);
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
    }),
  );
  configureApp(app);

  const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
  console.log(`CORS allowed origins: ${allowedOrigins.join(', ')}`);

  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 4000);
  await app.listen(port, '0.0.0.0');
  console.log(`BuySeek API running on port ${port} (/api)`);
}

bootstrap();
