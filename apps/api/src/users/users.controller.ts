import { Controller, Get, Param } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { THROTTLE_LIMITS } from '../config/throttle.config';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  @Throttle({ search: THROTTLE_LIMITS.search })
  @Get(':id/ratings')
  ratings(@Param('id') id: string) {
    return this.users.getRatingSummary(id);
  }
}
