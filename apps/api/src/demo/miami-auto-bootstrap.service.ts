import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MIAMI_AUTO_DEMO_REQUESTS } from './miami-auto-demo-data';
import { countMiamiAutoDemoRequests, seedMiamiAutos } from './miami-auto-seed';

@Injectable()
export class MiamiAutoBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(MiamiAutoBootstrapService.name);

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    if (process.env.NODE_ENV !== 'production') return;

    const existing = await countMiamiAutoDemoRequests(this.prisma);
    if (existing >= MIAMI_AUTO_DEMO_REQUESTS.length) return;

    const result = await seedMiamiAutos(this.prisma);
    this.logger.log(
      `Miami autos demo seed: ${result.total} solicitudes (${result.created} nuevas, ${result.updated} actualizadas).`,
    );
  }
}
