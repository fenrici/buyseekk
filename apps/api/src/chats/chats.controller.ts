import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../common/dto/pagination.query.dto';
import { NonAdminGuard } from '../common/guards/non-admin.guard';
import { AuthUser } from '../common/types/auth-user';
import { THROTTLE_LIMITS } from '../config/throttle.config';
import { ChatDetailQueryDto } from './chat-detail.query.dto';
import { SendMessageDto } from './chats.dto';
import { ChatsService } from './chats.service';

@Controller('chats')
@UseGuards(JwtAuthGuard, NonAdminGuard)
export class ChatsController {
  constructor(private chats: ChatsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto) {
    return this.chats.list(user.id, query.page, query.limit);
  }

  @Get(':id')
  getOne(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query() query: ChatDetailQueryDto,
  ) {
    return this.chats.getOne(id, user.id, query);
  }

  @Throttle({ default: THROTTLE_LIMITS.chat })
  @Post(':id/messages')
  send(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chats.send(id, user.id, dto);
  }
}
