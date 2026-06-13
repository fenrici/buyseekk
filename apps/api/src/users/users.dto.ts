import { IsEnum, IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Locale, RequestCategory, SellerType, UserMode } from '@prisma/client';

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
