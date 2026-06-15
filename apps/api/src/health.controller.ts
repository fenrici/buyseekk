import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { createClient } from 'redis';
import { PrismaService } from './prisma/prisma.service';

async function pingRedis(): Promise<'ok' | 'skipped' | 'error'> {
  const url = process.env.REDIS_URL?.trim();
  if (!url) return 'skipped';
  const client = createClient({ url });
  try {
    await client.connect();
    await client.ping();
    return 'ok';
  } catch {
    return 'error';
  } finally {
    await client.quit().catch(() => undefined);
  }
}

@SkipThrottle()
@Controller()
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get()
  root() {
    return {
      name: 'Buyseekk API',
      status: 'ok',
      version: '0.1.0',
      docs: 'Usá /api/auth, /api/requests, /api/offers',
    };
  }

  @Get('health')
  async health() {
    const timestamp = new Date().toISOString();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const redis = await pingRedis();
      if (redis === 'error') {
        throw new ServiceUnavailableException({
          status: 'degraded',
          db: 'ok',
          redis: 'error',
          timestamp,
        });
      }
      return { status: 'ok', db: 'ok', redis, timestamp };
    } catch (err) {
      if (err instanceof ServiceUnavailableException) throw err;
      throw new ServiceUnavailableException({
        status: 'degraded',
        db: 'error',
        timestamp,
      });
    }
  }
}
