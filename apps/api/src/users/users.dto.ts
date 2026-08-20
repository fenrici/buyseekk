import { IsBoolean, IsEnum, IsObject, IsOptional, IsString, MaxLength, MinLength, ValidateIf, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { BusinessType, Locale, RequestCategory, SellerType, UserMode } from '@prisma/client';
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
  @ValidateIf((dto: SellerProfileDto) => dto.sellerType === SellerType.COMPANY)
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  businessName?: string;

  @IsOptional()
  @ValidateIf((dto: SellerProfileDto) => dto.sellerType === SellerType.COMPANY)
  @IsEnum(BusinessType)
  businessType?: BusinessType;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  sellerAvatarUrl?: string;
}

export class UpdateSellerProfileDto extends SellerProfileDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  declare state: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  declare city: string;
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
  @IsEnum(BusinessType)
  businessType?: BusinessType;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  buyerAvatarUrl?: string;
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

export class UpdateSellerChatSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  defaultAcceptMessage?: string | null;
}
