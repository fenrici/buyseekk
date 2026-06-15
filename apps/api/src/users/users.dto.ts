import { IsBoolean, IsEnum, IsObject, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Locale, RequestCategory, SellerType, UserMode } from '@prisma/client';
import { NotificationPreferenceKey } from '@buyseekk/shared';

export class UpdateLanguageDto {
  @IsEnum(Locale)
  locale!: Locale;
}

export class UpdateActiveModeDto {
  @IsEnum(UserMode)
  activeMode!: UserMode;
}

export class SellerProfileDto {
  @IsEnum(SellerType)
  sellerType!: SellerType;

  @IsEnum(RequestCategory)
  sellerCategory!: RequestCategory;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  businessName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;
}

export class LastSearchFiltersDto {
  @IsObject()
  filters!: Record<string, unknown>;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  businessName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatarUrl?: string;
}

class NotificationPreferencesPatchDto {
  @IsOptional()
  @IsBoolean()
  matchingRequests?: boolean;

  @IsOptional()
  @IsBoolean()
  newOffers?: boolean;

  @IsOptional()
  @IsBoolean()
  newMessages?: boolean;

  @IsOptional()
  @IsBoolean()
  requestExpiring?: boolean;

  @IsOptional()
  @IsBoolean()
  requestInactive?: boolean;
}

export class UpdatePreferencesDto {
  @IsOptional()
  @IsEnum(UserMode)
  preferredMode?: UserMode;

  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationPreferencesPatchDto)
  notificationPreferences?: Partial<Record<NotificationPreferenceKey, boolean>>;
}
