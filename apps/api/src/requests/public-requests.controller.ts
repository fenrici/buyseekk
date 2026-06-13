import { Controller, Get, Param, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { THROTTLE_LIMITS } from '../config/throttle.config';
import { PublicRequestsQueryDto } from './public-requests.query.dto';
import { RequestsService } from './requests.service';

/** Listado público de solicitudes (sin auth) para visitantes que exploran la app. */
@Controller('public/requests')
export class PublicRequestsController {
  constructor(private requests: RequestsService) {}

  @Throttle({ default: THROTTLE_LIMITS.search })
  @Get()
  list(@Query() query: PublicRequestsQueryDto) {
    return this.requests.listPublic(query);
  }

  @Throttle({ default: THROTTLE_LIMITS.search })
  @Get(':id')
  one(@Param('id') id: string) {
    return this.requests.getPublicOne(id);
  }
}
