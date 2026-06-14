import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma, SecurityEvent, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SecurityContext, SecurityLogService } from '../auth/security-log.service';
import { CreateReportDto } from './reports.dto';
import { AUTO_SUSPENSION_REASON, MODERATION_THRESHOLDS } from './moderation.config';

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private securityLog: SecurityLogService,
  ) {}

  async create(reporterId: string, dto: CreateReportDto, ctx: SecurityContext = {}) {
    const hasTarget =
      !!dto.reportedUserId ||
      !!dto.requestId ||
      !!dto.offerId ||
      !!dto.chatId ||
      !!dto.messageId;
    if (!hasTarget) {
      throw new BadRequestException('Indicá qué querés reportar');
    }

    // Un usuario solo puede reportar una vez el mismo contenido.
    const duplicateWhere = this.primaryTargetWhere(reporterId, dto);
    if (duplicateWhere) {
      const existing = await this.prisma.report.findFirst({ where: duplicateWhere });
      if (existing) {
        throw new ConflictException('Ya reportaste este contenido');
      }
    }

    const reporter = await this.prisma.user.findUnique({
      where: { id: reporterId },
      select: { emailVerified: true, blocked: true, suspended: true },
    });

    // Solo cuentan reportes de usuarios verificados, activos y no bloqueados/suspendidos.
    let weight =
      reporter && reporter.emailVerified && !reporter.blocked && !reporter.suspended ? 1 : 0;

    // Best-effort: deduce el usuario reportado desde la entidad asociada.
    let reportedUserId = dto.reportedUserId ?? null;
    if (!reportedUserId && dto.offerId) {
      const offer = await this.prisma.offer.findUnique({
        where: { id: dto.offerId },
        select: { sellerId: true },
      });
      reportedUserId = offer?.sellerId ?? null;
    }
    if (!reportedUserId && dto.requestId) {
      const req = await this.prisma.request.findUnique({
        where: { id: dto.requestId },
        select: { userId: true },
      });
      reportedUserId = req?.userId ?? null;
    }
    if (reportedUserId) {
      const exists = await this.prisma.user.findUnique({
        where: { id: reportedUserId },
        select: { id: true },
      });
      if (!exists) reportedUserId = null;
    }

    // Anti-abuso: no contar varios reportes del mismo contenido desde la misma IP
    // (protección básica contra cuentas títere de una sola persona/red).
    if (weight === 1 && ctx.ip) {
      const targetWhere = this.contentTargetWhere(dto);
      if (targetWhere) {
        const sameIp = await this.prisma.report.findFirst({
          where: { ...targetWhere, reporterIp: ctx.ip, weight: { gte: 1 } },
          select: { id: true },
        });
        if (sameIp) weight = 0;
      }
    }

    const report = await this.prisma.report.create({
      data: {
        reporterId,
        reason: dto.reason,
        details: dto.details?.trim() || null,
        reportedUserId,
        requestId: dto.requestId || null,
        offerId: dto.offerId || null,
        chatId: dto.chatId || null,
        messageId: dto.messageId || null,
        weight,
        reporterIp: ctx.ip ?? null,
        reporterUserAgent: ctx.userAgent ?? null,
      },
    });

    // Solo evaluamos umbrales si el reporte cuenta (usuario elegible).
    let triggered: string | null = null;
    if (weight === 1) {
      const actions: string[] = [];
      if (dto.requestId) {
        const a = await this.evaluateContent('request', dto.requestId, ctx);
        if (a) actions.push(a);
      }
      if (dto.offerId) {
        const a = await this.evaluateContent('offer', dto.offerId, ctx);
        if (a) actions.push(a);
      }
      if (reportedUserId) {
        const a = await this.evaluateUser(reportedUserId, ctx);
        if (a) actions.push(a);
      }
      triggered = actions[0] ?? null;
      if (triggered) {
        await this.prisma.report.update({
          where: { id: report.id },
          data: { autoTriggeredAction: actions.join(',') },
        });
      }
    }

    return { id: report.id, status: report.status, createdAt: report.createdAt };
  }

  private primaryTargetWhere(
    reporterId: string,
    dto: CreateReportDto,
  ): Prisma.ReportWhereInput | null {
    if (dto.messageId) return { reporterId, messageId: dto.messageId };
    if (dto.offerId) return { reporterId, offerId: dto.offerId };
    if (dto.requestId) return { reporterId, requestId: dto.requestId };
    if (dto.chatId) return { reporterId, chatId: dto.chatId };
    if (dto.reportedUserId) return { reporterId, reportedUserId: dto.reportedUserId };
    return null;
  }

  private contentTargetWhere(dto: CreateReportDto): Prisma.ReportWhereInput | null {
    if (dto.offerId) return { offerId: dto.offerId };
    if (dto.requestId) return { requestId: dto.requestId };
    if (dto.messageId) return { messageId: dto.messageId };
    if (dto.chatId) return { chatId: dto.chatId };
    if (dto.reportedUserId) return { reportedUserId: dto.reportedUserId };
    return null;
  }

  /** Cuenta reportantes únicos elegibles (weight >= 1) para un filtro dado. */
  private async countUniqueReporters(where: Prisma.ReportWhereInput): Promise<number> {
    const groups = await this.prisma.report.groupBy({
      by: ['reporterId'],
      where: { ...where, weight: { gte: 1 } },
    });
    return groups.length;
  }

  private async evaluateContent(
    kind: 'request' | 'offer',
    id: string,
    ctx: SecurityContext,
  ): Promise<string | null> {
    const where: Prisma.ReportWhereInput =
      kind === 'request' ? { requestId: id } : { offerId: id };
    const count = await this.countUniqueReporters(where);

    if (kind === 'request') {
      const req = await this.prisma.request.findUnique({
        where: { id },
        select: { userId: true, hiddenByModeration: true, moderationReviewRequired: true },
      });
      if (!req) return null;

      if (count >= MODERATION_THRESHOLDS.HIDE_CONTENT && !req.hiddenByModeration) {
        await this.prisma.request.update({
          where: { id },
          data: { hiddenByModeration: true, moderationReviewRequired: true },
        });
        await this.securityLog.log(SecurityEvent.AUTO_HIDE_REQUEST, {
          userId: req.userId,
          ip: ctx.ip,
          userAgent: ctx.userAgent,
          metadata: { requestId: id, uniqueReports: count },
        });
        return 'AUTO_HIDE_REQUEST';
      }
      if (count >= MODERATION_THRESHOLDS.REVIEW_REQUIRED && !req.moderationReviewRequired) {
        await this.prisma.request.update({
          where: { id },
          data: { moderationReviewRequired: true },
        });
        await this.securityLog.log(SecurityEvent.AUTO_REVIEW_TRIGGERED, {
          userId: req.userId,
          ip: ctx.ip,
          userAgent: ctx.userAgent,
          metadata: { requestId: id, uniqueReports: count },
        });
        return 'AUTO_REVIEW_TRIGGERED';
      }
      return null;
    }

    const offer = await this.prisma.offer.findUnique({
      where: { id },
      select: { sellerId: true, hiddenByModeration: true, moderationReviewRequired: true },
    });
    if (!offer) return null;

    if (count >= MODERATION_THRESHOLDS.HIDE_CONTENT && !offer.hiddenByModeration) {
      await this.prisma.offer.update({
        where: { id },
        data: { hiddenByModeration: true, moderationReviewRequired: true },
      });
      await this.securityLog.log(SecurityEvent.AUTO_HIDE_OFFER, {
        userId: offer.sellerId,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: { offerId: id, uniqueReports: count },
      });
      return 'AUTO_HIDE_OFFER';
    }
    if (count >= MODERATION_THRESHOLDS.REVIEW_REQUIRED && !offer.moderationReviewRequired) {
      await this.prisma.offer.update({
        where: { id },
        data: { moderationReviewRequired: true },
      });
      await this.securityLog.log(SecurityEvent.AUTO_REVIEW_TRIGGERED, {
        userId: offer.sellerId,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: { offerId: id, uniqueReports: count },
      });
      return 'AUTO_REVIEW_TRIGGERED';
    }
    return null;
  }

  private async evaluateUser(userId: string, ctx: SecurityContext): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, blocked: true, suspended: true },
    });
    if (!user || user.role === UserRole.ADMIN || user.blocked) return null;

    const count = await this.countUniqueReporters({ reportedUserId: userId });

    if (count >= MODERATION_THRESHOLDS.SUSPEND_USER && !user.suspended) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { suspended: true, suspendedAt: new Date(), suspendedReason: AUTO_SUSPENSION_REASON },
      });
      await this.securityLog.log(SecurityEvent.AUTO_SUSPEND_USER, {
        userId,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: { uniqueReports: count },
      });
      return 'AUTO_SUSPEND_USER';
    }
    return null;
  }
}
