import { INestApplication, Logger } from '@nestjs/common';
import { RedisIoAdapter } from './redis-io.adapter';

const logger = new Logger('WebSocket');

export async function configureWebSocket(app: INestApplication): Promise<void> {
  const redisUrl = process.env.REDIS_URL?.trim();

  if (!redisUrl) {
    logger.log('Socket.IO using in-memory adapter (REDIS_URL not set)');
    return;
  }

  const adapter = new RedisIoAdapter(app);
  try {
    await adapter.connect(redisUrl);
    app.useWebSocketAdapter(adapter);
    logger.log('Socket.IO Redis adapter enabled — ready for multiple instances');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`Redis connection failed: ${message}`);

    if (process.env.NODE_ENV === 'production') {
      throw new Error(`REDIS_URL configured but connection failed: ${message}`);
    }

    logger.warn('Falling back to in-memory Socket.IO adapter (dev only)');
  }
}
