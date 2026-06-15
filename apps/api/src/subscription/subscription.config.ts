import { ConfigService } from '@nestjs/config';

/** Si true, todos los usuarios tienen acceso Plus/Enterprise sin límites de plan. */
export function isPlusFeaturesUnlocked(config: ConfigService): boolean {
  const raw = (config.get<string>('PLUS_FEATURES_UNLOCKED') ?? 'true').trim().toLowerCase();
  return raw !== 'false' && raw !== '0' && raw !== 'no';
}
