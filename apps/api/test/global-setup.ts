import { execSync } from 'child_process';
import { join } from 'path';

export default function globalSetup() {
  process.env.NODE_ENV = 'test';
  process.env.STORAGE_PROVIDER = 'local';
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret-key-32chars';
  process.env.JWT_ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES ?? '15m';
  process.env.JWT_REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES ?? '30d';
  process.env.EMAIL_PROVIDER = process.env.EMAIL_PROVIDER ?? 'console';
  process.env.DATABASE_URL =
    process.env.DATABASE_URL ?? 'postgresql://buyseekk:buyseekk@localhost:5432/buyseekk';

  const apiRoot = join(__dirname, '..');
  execSync('npx prisma migrate deploy', {
    cwd: apiRoot,
    env: process.env,
    stdio: 'inherit',
  });
}
