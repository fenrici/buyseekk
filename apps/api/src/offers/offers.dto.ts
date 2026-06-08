import { Currency } from '@prisma/client';
import { ArrayMaxSize, IsArray, IsEnum, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { MAX_IMAGES_PER_ENTITY } from '@buyseekk/shared';

export class CreateOfferDto {
  @IsString()
  requestId!: string;

  @IsInt()
  @Min(1)
  price!: number;

  @IsEnum(Currency)
  currency!: Currency;

  @IsString()
  @MinLength(10)
  message!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_IMAGES_PER_ENTITY)
  @IsString({ each: true })
  imageUrls?: string[];
}
