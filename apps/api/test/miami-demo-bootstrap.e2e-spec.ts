import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import { countMiamiAutoDemoRequests } from '../src/demo/miami-auto-seed';
import { createTestApp, resetDatabase } from './helpers';

describe('Miami demo bootstrap (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const envBackup = {
    nodeEnv: process.env.NODE_ENV,
    bootstrapFlag: process.env.ENABLE_MIAMI_DEMO_BOOTSTRAP,
  };

  beforeAll(async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.ENABLE_MIAMI_DEMO_BOOTSTRAP;
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    process.env.NODE_ENV = envBackup.nodeEnv;
    if (envBackup.bootstrapFlag === undefined) {
      delete process.env.ENABLE_MIAMI_DEMO_BOOTSTRAP;
    } else {
      process.env.ENABLE_MIAMI_DEMO_BOOTSTRAP = envBackup.bootstrapFlag;
    }
    await app.close();
  });

  it('does not bootstrap demo content when NODE_ENV=production without explicit flag', async () => {
    const count = await countMiamiAutoDemoRequests(prisma);
    expect(count).toBe(0);

    const demoUsers = await prisma.user.count({
      where: { email: 'comprador.us@buyseekk.com' },
    });
    expect(demoUsers).toBe(0);
  });
});
