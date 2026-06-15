import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthTokenCleanupScheduler {
  private readonly logger = new Logger(AuthTokenCleanupScheduler.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purgeExpiredTokens() {
    if (process.env.NODE_ENV === 'test') return;
    const now = new Date();
    try {
      const [refresh, verify, reset] = await this.prisma.$transaction([
        this.prisma.refreshToken.deleteMany({
          where: { OR: [{ expiresAt: { lt: now } }, { revokedAt: { not: null } }] },
        }),
        this.prisma.emailVerificationToken.deleteMany({
          where: { expiresAt: { lt: now } },
        }),
        this.prisma.passwordResetToken.deleteMany({
          where: { OR: [{ expiresAt: { lt: now } }, { usedAt: { not: null } }] },
        }),
      ]);
      const total = refresh.count + verify.count + reset.count;
      if (total > 0) {
        this.logger.log(
          `Purged expired tokens: refresh=${refresh.count} verify=${verify.count} reset=${reset.count}`,
        );
      }
    } catch (err) {
      this.logger.error('token cleanup failed', err instanceof Error ? err.stack : err);
    }
  }
}
