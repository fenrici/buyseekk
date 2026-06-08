import { Injectable } from '@nestjs/common';
import { RatingsService } from '../ratings/ratings.service';

@Injectable()
export class UsersService {
  constructor(private ratings: RatingsService) {}

  async getRatingSummary(userId: string) {
    const stats = await this.ratings.getStats(userId);
    return {
      average: stats.avgStars ?? 0,
      count: stats.reviewCount,
      noResponseCount: stats.noResponseCount,
    };
  }
}
