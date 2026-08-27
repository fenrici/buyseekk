import { RefreshClientType } from '@prisma/client';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { RegisterDto, LoginDto } from './auth.dto';

const MOBILE_CLIENT_TYPES = [RefreshClientType.IOS, RefreshClientType.ANDROID] as const;

export class MobileRegisterDto extends RegisterDto {
  @IsIn(MOBILE_CLIENT_TYPES)
  clientType!: (typeof MOBILE_CLIENT_TYPES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(128)
  deviceId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  deviceLabel?: string;
}

export class MobileLoginDto extends LoginDto {
  @IsIn(MOBILE_CLIENT_TYPES)
  clientType!: (typeof MOBILE_CLIENT_TYPES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(128)
  deviceId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  deviceLabel?: string;
}

export class MobileRefreshDto {
  @IsString()
  @MinLength(10)
  refreshToken!: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  deviceId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  deviceLabel?: string;
}

export class MobileLogoutDto {
  @IsString()
  @MinLength(10)
  refreshToken!: string;
}

export type RefreshSessionMeta = {
  clientType: RefreshClientType;
  deviceId?: string;
  deviceLabel?: string;
};

export const WEB_REFRESH_SESSION: RefreshSessionMeta = {
  clientType: RefreshClientType.WEB,
};
