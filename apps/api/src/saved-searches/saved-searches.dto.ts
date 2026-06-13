import { IsBoolean, IsEnum, IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { RequestCategory } from '@prisma/client';

export class CreateSavedSearchDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsEnum(RequestCategory)
  category?: RequestCategory;

  @IsObject()
  filters!: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateSavedSearchDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsEnum(RequestCategory)
  category?: RequestCategory;

  @IsOptional()
  @IsObject()
  filters?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class LastSearchFiltersDto {
  @IsObject()
  filters!: Record<string, unknown>;
}
