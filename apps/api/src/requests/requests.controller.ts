import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthUser } from '../common/types/auth-user';
import { CreateRequestDto } from './requests.dto';
import { ListRequestsQueryDto } from './list-requests.query.dto';
import { MineRequestsQueryDto } from './mine-requests.query.dto';
import { UpdateRequestDto } from './update-request.dto';
import { RequestsService } from './requests.service';

@Controller('requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RequestsController {
  constructor(private requests: RequestsService) {}

  @Get()
  @Roles('seller')
  list(@CurrentUser() user: AuthUser, @Query() query: ListRequestsQueryDto) {
    return this.requests.listForSeller(user, query);
  }

  @Get('mine')
  @Roles('buyer')
  mine(@CurrentUser() user: AuthUser, @Query() query: MineRequestsQueryDto) {
    return this.requests.mine(user.id, query);
  }

  @Get('locations')
  @Roles('seller')
  locations(@CurrentUser() user: AuthUser) {
    return this.requests.locationsForSeller(user);
  }

  @Get(':id')
  @Roles('seller')
  one(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.requests.getOne(id, user);
  }

  @Post()
  @Roles('buyer')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateRequestDto) {
    return this.requests.create(user.id, dto);
  }

  @Patch(':id')
  @Roles('buyer')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateRequestDto,
  ) {
    return this.requests.update(user.id, id, dto);
  }

  @Delete(':id')
  @Roles('buyer')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.requests.remove(user.id, id);
  }
}
