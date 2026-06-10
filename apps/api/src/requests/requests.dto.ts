import { Country, Currency, OperationType, RequestCategory } from '@prisma/client';
import { ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
import { MAX_IMAGES_PER_ENTITY } from '@buyseekk/shared';

export class CreateRequestDto {
  @IsEnum(RequestCategory)
  category!: RequestCategory;

  @IsOptional()
  @IsEnum(OperationType)
  operation?: OperationType;

  @IsOptional()
  @IsString()
  @MinLength(5)
  title?: string;

  @IsString()
  @MinLength(10)
  requirements!: string;

  @IsInt()
  @Min(1)
  budget!: number;

  @IsOptional()
  @IsString()
  budgetPeriod?: string;

  @IsOptional()
  @IsBoolean()
  negotiable?: boolean;

  @IsEnum(Currency)
  currency!: Currency;

  @IsString()
  @MinLength(2)
  location!: string;

  @IsEnum(Country)
  country!: Country;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_IMAGES_PER_ENTITY)
  @IsString({ each: true })
  imageUrls?: string[];

  @IsOptional()
  @IsString()
  zone?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  bedrooms?: number;

  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(5000)
  minSqm?: number;

  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(5000)
  maxSqm?: number;

  @IsOptional()
  @IsString()
  carBrand?: string;

  @IsOptional()
  @IsString()
  carModel?: string;

  @IsOptional()
  @IsString()
  carColor?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(500000)
  maxMileage?: number;
}
