import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createThrottledTestApp } from './helpers';

describe('Refresh throttle (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createThrottledTestApp();
  });

  afterAll(async () => {
    await app.close();
    delete process.env.ENABLE_THROTTLE_IN_TEST;
  });

  it('returns 429 after too many refresh attempts', async () => {
    let sawTooMany = false;
    for (let i = 0; i < 65; i++) {
      const res = await request(app.getHttpServer()).post('/api/auth/refresh');
      if (res.status === 429) {
        sawTooMany = true;
        break;
      }
    }
    expect(sawTooMany).toBe(true);
  });
});
