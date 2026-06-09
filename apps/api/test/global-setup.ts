import { execSync } from 'child_process';
import { join } from 'path';

export default function globalSetup() {
  process.env.NODE_ENV = 'test';
  process.env.STORAGE_PROVIDER = 'local';
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret-key-32chars';
  process.env.DATABASE_URL =
    process.env.DATABASE_URL ?? 'postgresql://buyseekk:buyseekk@localhost:5432/buyseekk';

  const apiRoot = join(__dirname, '..');
  execSync('npx prisma migrate deploy', {
    cwd: apiRoot,
    env: process.env,
    stdio: 'inherit',
  });
}
