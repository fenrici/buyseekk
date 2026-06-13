import { plainToInstance } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  validateSync,
} from 'class-validator';
import { STORAGE_PROVIDER } from '../storage/storage.interface';

class EnvironmentVariables {
  @IsString()
  DATABASE_URL!: string;

  @IsString()
  @MinLength(16, { message: 'JWT_SECRET debe tener al menos 16 caracteres' })
  JWT_SECRET!: string;

  @IsOptional()
  @IsString()
  JWT_EXPIRES_IN?: string;

  @IsOptional()
  @IsString()
  JWT_ACCESS_EXPIRES?: string;

  @IsOptional()
  @IsString()
  JWT_REFRESH_EXPIRES?: string;

  @IsOptional()
  @IsIn(['console', 'resend'])
  EMAIL_PROVIDER?: string;

  @IsOptional()
  @IsString()
  EMAIL_FROM?: string;

  @IsOptional()
  @IsString()
  EMAIL_API_KEY?: string;

  @IsOptional()
  @IsEmail()
  EMAIL_SANDBOX_TO?: string;

  @IsOptional()
  @IsString()
  API_PORT?: string;

  @IsOptional()
  @IsString()
  CORS_ORIGIN?: string;

  @IsOptional()
  @IsString()
  NODE_ENV?: string;

  @IsOptional()
  @IsIn([STORAGE_PROVIDER.LOCAL, STORAGE_PROVIDER.R2])
  STORAGE_PROVIDER?: string;

  @IsOptional()
  @IsString()
  STORAGE_PUBLIC_URL?: string;

  @IsOptional()
  @IsString()
  R2_ACCOUNT_ID?: string;

  @IsOptional()
  @IsString()
  R2_ACCESS_KEY_ID?: string;

  @IsOptional()
  @IsString()
  R2_SECRET_ACCESS_KEY?: string;

  @IsOptional()
  @IsString()
  R2_BUCKET_NAME?: string;

  @IsOptional()
  @IsString()
  REDIS_URL?: string;
}

export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    const messages = errors
      .flatMap((e) => Object.values(e.constraints ?? {}))
      .join('; ');
    throw new Error(`Config inválida: ${messages}`);
  }

  if (validated.JWT_SECRET === 'dev-secret-change-me' && validated.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET no puede usar el valor por defecto en producción');
  }

  if (validated.NODE_ENV === 'production' && !validated.CORS_ORIGIN?.trim()) {
    throw new Error('CORS_ORIGIN es obligatorio en producción');
  }

  if (validated.STORAGE_PROVIDER === STORAGE_PROVIDER.R2) {
    const required = [
      ['STORAGE_PUBLIC_URL', validated.STORAGE_PUBLIC_URL],
      ['R2_ACCOUNT_ID', validated.R2_ACCOUNT_ID],
      ['R2_ACCESS_KEY_ID', validated.R2_ACCESS_KEY_ID],
      ['R2_SECRET_ACCESS_KEY', validated.R2_SECRET_ACCESS_KEY],
      ['R2_BUCKET_NAME', validated.R2_BUCKET_NAME],
    ] as const;
    const missing = required.filter(([, value]) => !value).map(([name]) => name);
    if (missing.length) {
      throw new Error(`STORAGE_PROVIDER=r2 requiere: ${missing.join(', ')}`);
    }
  }

  if (validated.EMAIL_PROVIDER === 'resend') {
    if (!validated.EMAIL_API_KEY?.trim()) {
      throw new Error('EMAIL_PROVIDER=resend requiere EMAIL_API_KEY');
    }
    if (!validated.EMAIL_FROM?.trim()) {
      throw new Error('EMAIL_PROVIDER=resend requiere EMAIL_FROM');
    }
    if (validated.EMAIL_FROM.includes('@resend.dev') && !validated.EMAIL_SANDBOX_TO?.trim()) {
      throw new Error(
        'Sin dominio propio: EMAIL_FROM con @resend.dev requiere EMAIL_SANDBOX_TO (el email de tu cuenta Resend)',
      );
    }
  }

  return validated;
}
