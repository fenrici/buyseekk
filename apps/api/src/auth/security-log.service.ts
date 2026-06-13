import { Injectable } from '@nestjs/common';
import { Prisma, SecurityEvent } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type SecurityContext = {
  ip?: string;
  userAgent?: string;
};

@Injectable()
export class SecurityLogService {
  constructor(private prisma: PrismaService) {}

  async log(
    event: SecurityEvent,
    options: {
      userId?: string;
      ip?: string;
      userAgent?: string;
      metadata?: Record<string, unknown>;
    } = {},
  ) {
    await this.prisma.securityLog.create({
      data: {
        event,
        userId: options.userId,
        ip: options.ip,
        userAgent: options.userAgent,
        metadata: (options.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }

  static fromRequest(req: {
    ip?: string;
    headers?: Record<string, string | string[] | undefined>;
  }): SecurityContext {
    const forwarded = req.headers?.['x-forwarded-for'];
    const ip =
      (typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : undefined) ||
      req.ip;
    const userAgent = req.headers?.['user-agent'];
    return {
      ip: typeof ip === 'string' ? ip : undefined,
      userAgent: typeof userAgent === 'string' ? userAgent : undefined,
    };
  }
}
