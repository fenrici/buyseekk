import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  RequestStatus,
  SecurityEvent,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SecurityLogService, SecurityContext } from '../auth/security-log.service';
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
import { parseAdminPagination, toAdminPaginated } from './admin.pagination';

const USER_SAFE_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  activeMode: true,
  sellerType: true,
  sellerCategory: true,
  country: true,
  locale: true,
  currency: true,
  avatarUrl: true,
  city: true,
  businessName: true,
  emailVerified: true,
  emailVerifiedAt: true,
  blocked: true,
  blockedAt: true,
  blockedReason: true,
  suspended: true,
  suspendedAt: true,
  suspendedReason: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

function parseDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private securityLog: SecurityLogService,
  ) {}

  // ── Overview ────────────────────────────────────────────────────────────
  async overview() {
    const [
      totalUsers,
      buyers,
      sellers,
      verifiedUsers,
      activeRequests,
      offersSent,
      openChats,
      messagesSent,
      pendingReports,
      blockedUsers,
      suspendedUsers,
      hiddenRequests,
      hiddenOffers,
      reviewRequiredContent,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: { in: [UserRole.BUYER, UserRole.BOTH] } } }),
      this.prisma.user.count({ where: { role: { in: [UserRole.SELLER, UserRole.BOTH] } } }),
      this.prisma.user.count({ where: { emailVerified: true } }),
      this.prisma.request.count({ where: { active: true, status: { not: RequestStatus.CERRADA } } }),
      this.prisma.offer.count(),
      this.prisma.chat.count(),
      this.prisma.message.count(),
      this.prisma.report.count({ where: { status: 'PENDING' } }),
      this.prisma.user.count({ where: { blocked: true } }),
      this.prisma.user.count({ where: { suspended: true } }),
      this.prisma.request.count({ where: { hiddenByModeration: true } }),
      this.prisma.offer.count({ where: { hiddenByModeration: true } }),
      this.prisma.request.count({ where: { moderationReviewRequired: true } }) ,
    ]);

    return {
      totalUsers,
      buyers,
      sellers,
      verifiedUsers,
      activeRequests,
      offersSent,
      openChats,
      messagesSent,
      pendingReports,
      blockedUsers,
      suspendedUsers,
      hiddenRequests,
      hiddenOffers,
      reviewRequiredContent,
    };
  }

  // ── Users ───────────────────────────────────────────────────────────────
  async listUsers(query: ListUsersQueryDto) {
    const { page, limit, skip } = parseAdminPagination(query.page, query.limit);
    const where: Prisma.UserWhereInput = {};

    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
      ];
    }
    if (query.role) where.role = query.role;
    if (query.country) where.country = query.country;
    if (query.emailVerified !== undefined) where.emailVerified = query.emailVerified;
    if (query.blocked !== undefined) where.blocked = query.blocked;

    const createdFrom = parseDate(query.createdFrom);
    const createdTo = parseDate(query.createdTo);
    if (createdFrom || createdTo) {
      where.createdAt = {};
      if (createdFrom) where.createdAt.gte = createdFrom;
      if (createdTo) where.createdAt.lte = createdTo;
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: USER_SAFE_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return toAdminPaginated(items, total, page, limit);
  }

  private async findUserOrThrow(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async blockUser(adminId: string, id: string, dto: BlockUserDto, ctx: SecurityContext) {
    const user = await this.findUserOrThrow(id);
    if (user.id === adminId) {
      throw new BadRequestException('No podés bloquear tu propia cuenta');
    }
    if (user.role === UserRole.ADMIN) {
      throw new ForbiddenException('No podés bloquear a otro administrador');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        blocked: true,
        blockedAt: new Date(),
        blockedReason: dto.reason?.trim() || null,
      },
      select: USER_SAFE_SELECT,
    });

    await this.securityLog.log(SecurityEvent.ADMIN_USER_BLOCKED, {
      userId: adminId,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      metadata: { targetUserId: id, reason: dto.reason ?? null },
    });

    return updated;
  }

  async unblockUser(adminId: string, id: string, ctx: SecurityContext) {
    await this.findUserOrThrow(id);
    const updated = await this.prisma.user.update({
      where: { id },
      data: { blocked: false, blockedAt: null, blockedReason: null },
      select: USER_SAFE_SELECT,
    });

    await this.securityLog.log(SecurityEvent.ADMIN_USER_UNBLOCKED, {
      userId: adminId,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      metadata: { targetUserId: id },
    });

    return updated;
  }

  async verifyUserEmail(adminId: string, id: string, ctx: SecurityContext) {
    await this.findUserOrThrow(id);
    const updated = await this.prisma.user.update({
      where: { id },
      data: { emailVerified: true, emailVerifiedAt: new Date() },
      select: USER_SAFE_SELECT,
    });

    await this.securityLog.log(SecurityEvent.ADMIN_USER_EMAIL_VERIFIED, {
      userId: adminId,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      metadata: { targetUserId: id },
    });

    return updated;
  }

  // ── Requests ─────────────────────────────────────────────────────────────
  async listRequests(query: ListAdminRequestsQueryDto) {
    const { page, limit, skip } = parseAdminPagination(query.page, query.limit);
    const where: Prisma.RequestWhereInput = {};

    if (query.category) where.category = query.category;
    if (query.country) where.country = query.country;
    if (query.status) where.status = query.status;
    if (query.active !== undefined) where.active = query.active;
    if (query.userId) where.userId = query.userId;
    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { requirements: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.request.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          category: true,
          operation: true,
          budget: true,
          currency: true,
          location: true,
          country: true,
          active: true,
          status: true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true } },
          _count: { select: { offers: true } },
        },
      }),
      this.prisma.request.count({ where }),
    ]);

    return toAdminPaginated(items, total, page, limit);
  }

  async closeRequest(adminId: string, id: string, ctx: SecurityContext) {
    const req = await this.prisma.request.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Solicitud no encontrada');

    const updated = await this.prisma.request.update({
      where: { id },
      data: { status: RequestStatus.CERRADA, active: false, closedAt: new Date() },
    });

    await this.securityLog.log(SecurityEvent.ADMIN_REQUEST_CLOSED, {
      userId: adminId,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      metadata: { requestId: id },
    });

    return updated;
  }

  async reactivateRequest(adminId: string, id: string, ctx: SecurityContext) {
    const req = await this.prisma.request.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Solicitud no encontrada');

    const now = new Date();
    const updated = await this.prisma.request.update({
      where: { id },
      data: {
        status: RequestStatus.ACTIVA,
        active: true,
        closedAt: null,
        lastActivityAt: now,
        lastBuyerActivityAt: now,
      },
    });

    await this.securityLog.log(SecurityEvent.ADMIN_REQUEST_REACTIVATED, {
      userId: adminId,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      metadata: { requestId: id },
    });

    return updated;
  }

  async deleteRequest(adminId: string, id: string, ctx: SecurityContext) {
    const req = await this.prisma.request.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Solicitud no encontrada');

    await this.prisma.request.delete({ where: { id } });

    await this.securityLog.log(SecurityEvent.ADMIN_REQUEST_DELETED, {
      userId: adminId,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      metadata: { requestId: id },
    });

    return { ok: true };
  }

  // ── Offers ───────────────────────────────────────────────────────────────
  async listOffers(query: ListAdminOffersQueryDto) {
    const { page, limit, skip } = parseAdminPagination(query.page, query.limit);
    const where: Prisma.OfferWhereInput = {};

    if (query.status) where.status = query.status;
    if (query.sellerId) where.sellerId = query.sellerId;
    if (query.requestId) where.requestId = query.requestId;
    if (query.country) where.request = { country: query.country };
    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { message: { contains: term, mode: 'insensitive' } },
        { requestTitle: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.offer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          price: true,
          currency: true,
          message: true,
          status: true,
          requestTitle: true,
          createdAt: true,
          seller: { select: { id: true, name: true, email: true } },
          request: { select: { id: true, title: true, country: true } },
          chat: { select: { id: true } },
        },
      }),
      this.prisma.offer.count({ where }),
    ]);

    return toAdminPaginated(items, total, page, limit);
  }

  async deleteOffer(adminId: string, id: string, ctx: SecurityContext) {
    const offer = await this.prisma.offer.findUnique({ where: { id } });
    if (!offer) throw new NotFoundException('Oferta no encontrada');

    await this.prisma.offer.delete({ where: { id } });

    await this.securityLog.log(SecurityEvent.ADMIN_OFFER_DELETED, {
      userId: adminId,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      metadata: { offerId: id, sellerId: offer.sellerId },
    });

    return { ok: true };
  }

  // ── Chats & messages ──────────────────────────────────────────────────────
  async listChats(query: ListAdminChatsQueryDto) {
    const { page, limit, skip } = parseAdminPagination(query.page, query.limit);
    const where: Prisma.ChatWhereInput = {};

    if (query.search?.trim()) {
      const term = query.search.trim();
      where.offer = {
        OR: [
          { requestTitle: { contains: term, mode: 'insensitive' } },
          { seller: { name: { contains: term, mode: 'insensitive' } } },
        ],
      };
    }

    const [chats, total] = await Promise.all([
      this.prisma.chat.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          createdAt: true,
          offer: {
            select: {
              id: true,
              requestTitle: true,
              seller: { select: { id: true, name: true } },
              request: { select: { id: true, user: { select: { id: true, name: true } } } },
            },
          },
          _count: { select: { messages: true } },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { text: true, createdAt: true, fromRole: true },
          },
        },
      }),
      this.prisma.chat.count({ where }),
    ]);

    const items = chats.map((c) => ({
      id: c.id,
      createdAt: c.createdAt,
      requestTitle: c.offer.requestTitle,
      seller: c.offer.seller,
      buyer: c.offer.request.user,
      messageCount: c._count.messages,
      lastMessage: c.messages[0] ?? null,
    }));

    return toAdminPaginated(items, total, page, limit);
  }

  async getChat(id: string, query: AdminChatMessagesQueryDto = {}) {
    const chat = await this.prisma.chat.findUnique({
      where: { id },
      select: {
        id: true,
        createdAt: true,
        offer: {
          select: {
            id: true,
            requestTitle: true,
            price: true,
            currency: true,
            status: true,
            seller: { select: { id: true, name: true, email: true } },
            request: {
              select: { id: true, title: true, user: { select: { id: true, name: true, email: true } } },
            },
          },
        },
      },
    });
    if (!chat) throw new NotFoundException('Chat no encontrado');

    const { page, limit, skip } = parseAdminPagination(query.page, query.limit);
    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { chatId: id },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
        select: { id: true, fromRole: true, text: true, createdAt: true },
      }),
      this.prisma.message.count({ where: { chatId: id } }),
    ]);

    return { ...chat, messages: toAdminPaginated(messages, total, page, limit) };
  }

  async deleteMessage(adminId: string, id: string, ctx: SecurityContext) {
    const message = await this.prisma.message.findUnique({ where: { id } });
    if (!message) throw new NotFoundException('Mensaje no encontrado');

    await this.prisma.message.delete({ where: { id } });

    await this.securityLog.log(SecurityEvent.ADMIN_MESSAGE_DELETED, {
      userId: adminId,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      metadata: { messageId: id, chatId: message.chatId },
    });

    return { ok: true };
  }

  // ── Reports ───────────────────────────────────────────────────────────────
  async listReports(query: ListReportsQueryDto) {
    const { page, limit, skip } = parseAdminPagination(query.page, query.limit);
    const where: Prisma.ReportWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.reason) where.reason = query.reason;
    if (query.autoTriggered) where.autoTriggeredAction = { not: null };

    const [items, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
        select: {
          id: true,
          reason: true,
          details: true,
          status: true,
          weight: true,
          resolvedByAdmin: true,
          autoTriggeredAction: true,
          reporterIp: true,
          requestId: true,
          offerId: true,
          chatId: true,
          messageId: true,
          createdAt: true,
          reviewedAt: true,
          reporter: { select: { id: true, name: true, email: true } },
          reportedUser: { select: { id: true, name: true, email: true } },
          reviewedBy: { select: { id: true, name: true } },
        },
      }),
      this.prisma.report.count({ where }),
    ]);

    return toAdminPaginated(items, total, page, limit);
  }

  async updateReportStatus(
    adminId: string,
    id: string,
    dto: UpdateReportStatusDto,
    ctx: SecurityContext,
  ) {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Reporte no encontrado');

    const updated = await this.prisma.report.update({
      where: { id },
      data: {
        status: dto.status,
        reviewedAt: new Date(),
        reviewedById: adminId,
        resolvedByAdmin: true,
      },
    });

    await this.securityLog.log(SecurityEvent.ADMIN_REPORT_STATUS_CHANGED, {
      userId: adminId,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      metadata: { reportId: id, status: dto.status },
    });

    return updated;
  }

  // ── Moderación automática ───────────────────────────────────────────────────
  /** Levanta una suspensión preventiva automática (reversión por admin). */
  async unsuspendUser(adminId: string, id: string, ctx: SecurityContext) {
    await this.findUserOrThrow(id);
    const updated = await this.prisma.user.update({
      where: { id },
      data: { suspended: false, suspendedAt: null, suspendedReason: null },
      select: USER_SAFE_SELECT,
    });

    await this.securityLog.log(SecurityEvent.ADMIN_USER_UNSUSPENDED, {
      userId: adminId,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      metadata: { targetUserId: id },
    });

    return updated;
  }

  /** Restaura una solicitud ocultada por moderación (la vuelve a mostrar). */
  async restoreRequest(adminId: string, id: string, ctx: SecurityContext) {
    const req = await this.prisma.request.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Solicitud no encontrada');

    const updated = await this.prisma.request.update({
      where: { id },
      data: { hiddenByModeration: false, moderationReviewRequired: false },
    });

    await this.securityLog.log(SecurityEvent.AUTO_RESTORE_CONTENT, {
      userId: adminId,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      metadata: { requestId: id, restoredBy: adminId },
    });

    return updated;
  }

  /** Restaura una oferta ocultada por moderación (la vuelve a mostrar). */
  async restoreOffer(adminId: string, id: string, ctx: SecurityContext) {
    const offer = await this.prisma.offer.findUnique({ where: { id } });
    if (!offer) throw new NotFoundException('Oferta no encontrada');

    const updated = await this.prisma.offer.update({
      where: { id },
      data: { hiddenByModeration: false, moderationReviewRequired: false },
    });

    await this.securityLog.log(SecurityEvent.AUTO_RESTORE_CONTENT, {
      userId: adminId,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      metadata: { offerId: id, restoredBy: adminId },
    });

    return updated;
  }

  /** Dashboard de moderación comunitaria: ocultos, suspendidos y rankings. */
  async moderationDashboard() {
    const [
      hiddenRequests,
      hiddenOffers,
      suspendedUsers,
      topRequestGroups,
      topOfferGroups,
      topReportedUserGroups,
      topReporterGroups,
    ] = await Promise.all([
      this.prisma.request.findMany({
        where: { hiddenByModeration: true },
        orderBy: { updatedAt: 'desc' },
        take: 50,
        select: {
          id: true,
          title: true,
          country: true,
          moderationReviewRequired: true,
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.offer.findMany({
        where: { hiddenByModeration: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          requestTitle: true,
          price: true,
          currency: true,
          seller: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.user.findMany({
        where: { suspended: true },
        orderBy: { suspendedAt: 'desc' },
        take: 50,
        select: {
          id: true,
          name: true,
          email: true,
          suspendedAt: true,
          suspendedReason: true,
        },
      }),
      this.prisma.report.groupBy({
        by: ['requestId'],
        where: { requestId: { not: null }, weight: { gte: 1 } },
        _count: { _all: true },
        orderBy: { _count: { requestId: 'desc' } },
        take: 10,
      }),
      this.prisma.report.groupBy({
        by: ['offerId'],
        where: { offerId: { not: null }, weight: { gte: 1 } },
        _count: { _all: true },
        orderBy: { _count: { offerId: 'desc' } },
        take: 10,
      }),
      this.prisma.report.groupBy({
        by: ['reportedUserId'],
        where: { reportedUserId: { not: null }, weight: { gte: 1 } },
        _count: { _all: true },
        orderBy: { _count: { reportedUserId: 'desc' } },
        take: 10,
      }),
      this.prisma.report.groupBy({
        by: ['reporterId'],
        _count: { _all: true },
        orderBy: { _count: { reporterId: 'desc' } },
        take: 10,
      }),
    ]);

    const requestIds = topRequestGroups.map((g) => g.requestId!).filter(Boolean);
    const offerIds = topOfferGroups.map((g) => g.offerId!).filter(Boolean);
    const reportedUserIds = topReportedUserGroups
      .map((g) => g.reportedUserId!)
      .filter(Boolean);
    const reporterIds = topReporterGroups.map((g) => g.reporterId).filter(Boolean);

    const [reqInfo, offerInfo, userInfo] = await Promise.all([
      this.prisma.request.findMany({
        where: { id: { in: requestIds } },
        select: { id: true, title: true },
      }),
      this.prisma.offer.findMany({
        where: { id: { in: offerIds } },
        select: { id: true, requestTitle: true },
      }),
      this.prisma.user.findMany({
        where: { id: { in: [...reportedUserIds, ...reporterIds] } },
        select: { id: true, name: true, email: true, suspended: true, blocked: true },
      }),
    ]);

    const reqMap = new Map(reqInfo.map((r) => [r.id, r.title]));
    const offerMap = new Map(offerInfo.map((o) => [o.id, o.requestTitle]));
    const userMap = new Map(userInfo.map((u) => [u.id, u]));

    const SUSPEND = 25;
    const MAX_PRIORITY = 50;

    const topReportedContent = [
      ...topRequestGroups.map((g) => ({
        type: 'request' as const,
        id: g.requestId!,
        title: reqMap.get(g.requestId!) ?? '(eliminada)',
        uniqueReports: g._count._all,
      })),
      ...topOfferGroups.map((g) => ({
        type: 'offer' as const,
        id: g.offerId!,
        title: offerMap.get(g.offerId!) ?? '(eliminada)',
        uniqueReports: g._count._all,
      })),
    ]
      .sort((a, b) => b.uniqueReports - a.uniqueReports)
      .slice(0, 10);

    const topReportedUsers = topReportedUserGroups.map((g) => {
      const u = userMap.get(g.reportedUserId!);
      return {
        id: g.reportedUserId!,
        name: u?.name ?? '(desconocido)',
        email: u?.email ?? '',
        suspended: u?.suspended ?? false,
        blocked: u?.blocked ?? false,
        uniqueReports: g._count._all,
        highPriority: g._count._all >= MAX_PRIORITY,
        suspendThreshold: g._count._all >= SUSPEND,
      };
    });

    const topReporters = topReporterGroups.map((g) => {
      const u = userMap.get(g.reporterId);
      return {
        id: g.reporterId,
        name: u?.name ?? '(desconocido)',
        email: u?.email ?? '',
        reportsSent: g._count._all,
      };
    });

    const priorityAlerts = topReportedUsers.filter((u) => u.highPriority);

    return {
      hiddenRequests,
      hiddenOffers,
      suspendedUsers,
      topReportedContent,
      topReportedUsers,
      topReporters,
      priorityAlerts,
    };
  }

  // ── Security logs ───────────────────────────────────────────────────────────
  async listSecurityLogs(query: ListSecurityLogsQueryDto) {
    const { page, limit, skip } = parseAdminPagination(query.page, query.limit);
    const where: Prisma.SecurityLogWhereInput = {};

    if (query.userId) where.userId = query.userId;
    if (query.event) where.event = query.event;
    if (query.ip?.trim()) where.ip = { contains: query.ip.trim(), mode: 'insensitive' };

    const dateFrom = parseDate(query.dateFrom);
    const dateTo = parseDate(query.dateTo);
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const [items, total] = await Promise.all([
      this.prisma.securityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          event: true,
          ip: true,
          userAgent: true,
          metadata: true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.securityLog.count({ where }),
    ]);

    return toAdminPaginated(items, total, page, limit);
  }
}
