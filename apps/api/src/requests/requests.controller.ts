import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RequestCategory } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateRequestDto } from './requests.dto';
import { RequestsService } from './requests.service';

@Controller('requests')
export class RequestsController {
  constructor(private requests: RequestsService) {}

  @Get()
  list(
    @Query('category') category?: RequestCategory,
    @Query('country') country?: string,
    @Query('search') search?: string,
  ) {
    return this.requests.list({ category, country, search });
  }

  @UseGuards(JwtAuthGuard)
  @Get('mine')
  mine(@Req() req: { user: { id: string } }) {
    return this.requests.mine(req.user.id);
  }

  @Get(':id')
  one(@Param('id') id: string) {
    return this.requests.getOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req: { user: { id: string } }, @Body() dto: CreateRequestDto) {
    return this.requests.create(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    return this.requests.remove(req.user.id, id);
  }
}
