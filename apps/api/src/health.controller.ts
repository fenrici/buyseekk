import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from './prisma/prisma.service';

@SkipThrottle()
@Controller()
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get()
  root() {
    return {
      name: 'BuySeek API',
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
      return { status: 'ok', db: 'ok', timestamp };
    } catch {
      throw new ServiceUnavailableException({
        status: 'degraded',
        db: 'error',
        timestamp,
      });
    }
  }
}
