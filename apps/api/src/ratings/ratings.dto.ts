import { RatingType } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min, ValidateIf } from 'class-validator';

export class CreateRatingDto {
  @IsString()
  offerId!: string;

  @IsEnum(RatingType)
  type!: RatingType;

  @ValidateIf((o) => o.type === RatingType.REVIEW)
  @IsInt()
  @Min(1)
  @Max(5)
  stars?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}
