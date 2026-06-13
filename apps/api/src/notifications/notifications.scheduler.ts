import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationsScheduler {
  private readonly logger = new Logger(NotificationsScheduler.name);

  constructor(private notifications: NotificationsService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleRequestLifecycle() {
    if (process.env.NODE_ENV === 'test') return;
    try {
      await this.notifications.scanRequestLifecycle();
    } catch (err) {
      this.logger.error('request lifecycle scan failed', err instanceof Error ? err.stack : err);
    }
  }
}
