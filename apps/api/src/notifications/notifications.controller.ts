import { Controller, Delete, Get, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaginationQueryDto } from '../common/dto/pagination.query.dto';
import { NotificationsService } from './notifications.service';

@SkipThrottle()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private notifications: NotificationsService) {}

  @Get('unread-count')
  unreadCount(@Req() req: { user: { id: string } }) {
    return this.notifications.getUnreadCount(req.user.id).then((count) => ({ count }));
  }

  @Get('recent')
  recent(@Req() req: { user: { id: string } }) {
    return this.notifications.recent(req.user.id, 20);
  }

  @Get()
  list(@Req() req: { user: { id: string } }, @Query() query: PaginationQueryDto) {
    return this.notifications.list(req.user.id, query.page, query.limit);
  }

  @Patch('read-all')
  markAllRead(@Req() req: { user: { id: string } }) {
    return this.notifications.markAllRead(req.user.id);
  }

  @Patch(':id/read')
  markRead(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    return this.notifications.markRead(req.user.id, id);
  }

  @Delete()
  clearAll(@Req() req: { user: { id: string } }) {
    return this.notifications.clearAll(req.user.id);
  }

  @Delete(':id')
  remove(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    return this.notifications.remove(req.user.id, id);
  }
}
