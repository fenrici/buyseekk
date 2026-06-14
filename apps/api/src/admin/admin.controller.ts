import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SecurityLogService } from '../auth/security-log.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AdminGuard } from '../common/guards/admin.guard';
import { AuthUser } from '../common/types/auth-user';
import { AdminService } from './admin.service';
import {
  AdminChatMessagesQueryDto,
  BlockUserDto,
  ListAdminChatsQueryDto,
  ListAdminOffersQueryDto,
  ListAdminRequestsQueryDto,
  ListReportsQueryDto,
  ListSecurityLogsQueryDto,
  ListUsersQueryDto,
  UpdateReportStatusDto,
} from './admin.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private admin: AdminService) {}

  private ctx(req: Request) {
    return SecurityLogService.fromRequest({ ip: req.ip, headers: req.headers });
  }

  // ── Overview ─────────────────────────────────────────────────────────────
  @Get('overview')
  overview() {
    return this.admin.overview();
  }

  // ── Users ──────────────────────────────────────────────────────────────────
  @Get('users')
  listUsers(@Query() query: ListUsersQueryDto) {
    return this.admin.listUsers(query);
  }

  @Patch('users/:id/block')
  blockUser(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: BlockUserDto,
    @Req() req: Request,
  ) {
    return this.admin.blockUser(user.id, id, dto, this.ctx(req));
  }

  @Patch('users/:id/unblock')
  unblockUser(@CurrentUser() user: AuthUser, @Param('id') id: string, @Req() req: Request) {
    return this.admin.unblockUser(user.id, id, this.ctx(req));
  }

  @Patch('users/:id/verify-email')
  verifyUserEmail(@CurrentUser() user: AuthUser, @Param('id') id: string, @Req() req: Request) {
    return this.admin.verifyUserEmail(user.id, id, this.ctx(req));
  }

  @Patch('users/:id/unsuspend')
  unsuspendUser(@CurrentUser() user: AuthUser, @Param('id') id: string, @Req() req: Request) {
    return this.admin.unsuspendUser(user.id, id, this.ctx(req));
  }

  // ── Requests ────────────────────────────────────────────────────────────────
  @Get('requests')
  listRequests(@Query() query: ListAdminRequestsQueryDto) {
    return this.admin.listRequests(query);
  }

  @Patch('requests/:id/close')
  closeRequest(@CurrentUser() user: AuthUser, @Param('id') id: string, @Req() req: Request) {
    return this.admin.closeRequest(user.id, id, this.ctx(req));
  }

  @Patch('requests/:id/reactivate')
  reactivateRequest(@CurrentUser() user: AuthUser, @Param('id') id: string, @Req() req: Request) {
    return this.admin.reactivateRequest(user.id, id, this.ctx(req));
  }

  @Patch('requests/:id/restore')
  restoreRequest(@CurrentUser() user: AuthUser, @Param('id') id: string, @Req() req: Request) {
    return this.admin.restoreRequest(user.id, id, this.ctx(req));
  }

  @Delete('requests/:id')
  deleteRequest(@CurrentUser() user: AuthUser, @Param('id') id: string, @Req() req: Request) {
    return this.admin.deleteRequest(user.id, id, this.ctx(req));
  }

  // ── Offers ────────────────────────────────────────────────────────────────────
  @Get('offers')
  listOffers(@Query() query: ListAdminOffersQueryDto) {
    return this.admin.listOffers(query);
  }

  @Patch('offers/:id/restore')
  restoreOffer(@CurrentUser() user: AuthUser, @Param('id') id: string, @Req() req: Request) {
    return this.admin.restoreOffer(user.id, id, this.ctx(req));
  }

  @Delete('offers/:id')
  deleteOffer(@CurrentUser() user: AuthUser, @Param('id') id: string, @Req() req: Request) {
    return this.admin.deleteOffer(user.id, id, this.ctx(req));
  }

  // ── Chats & messages ─────────────────────────────────────────────────────────────
  @Get('chats')
  listChats(@Query() query: ListAdminChatsQueryDto) {
    return this.admin.listChats(query);
  }

  @Get('chats/:id')
  getChat(@Param('id') id: string, @Query() query: AdminChatMessagesQueryDto) {
    return this.admin.getChat(id, query);
  }

  @Delete('messages/:id')
  deleteMessage(@CurrentUser() user: AuthUser, @Param('id') id: string, @Req() req: Request) {
    return this.admin.deleteMessage(user.id, id, this.ctx(req));
  }

  // ── Reports ────────────────────────────────────────────────────────────────────
  @Get('reports')
  listReports(@Query() query: ListReportsQueryDto) {
    return this.admin.listReports(query);
  }

  @Patch('reports/:id/status')
  updateReportStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateReportStatusDto,
    @Req() req: Request,
  ) {
    return this.admin.updateReportStatus(user.id, id, dto, this.ctx(req));
  }

  // ── Moderación automática ───────────────────────────────────────────────────────
  @Get('moderation')
  moderationDashboard() {
    return this.admin.moderationDashboard();
  }

  // ── Security logs ────────────────────────────────────────────────────────────────
  @Get('security-logs')
  listSecurityLogs(@Query() query: ListSecurityLogsQueryDto) {
    return this.admin.listSecurityLogs(query);
  }
}
