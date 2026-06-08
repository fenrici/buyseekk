import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
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
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
