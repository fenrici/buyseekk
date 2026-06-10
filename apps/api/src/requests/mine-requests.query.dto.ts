import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../common/dto/pagination.query.dto';

export class MineRequestsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsIn(['open', 'closed', 'archived'])
  scope?: 'open' | 'closed' | 'archived';
}
