import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthUser } from '../common/types/auth-user';
import { CreateSavedSearchDto, UpdateSavedSearchDto } from './saved-searches.dto';
import { SavedSearchesService } from './saved-searches.service';

@Controller('saved-searches')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('seller')
@SkipThrottle()
export class SavedSearchesController {
  constructor(private saved: SavedSearchesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.saved.list(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateSavedSearchDto) {
    return this.saved.create(user.id, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateSavedSearchDto) {
    return this.saved.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.saved.remove(user.id, id);
  }

  @Patch(':id/default')
  setDefault(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.saved.setDefault(user.id, id);
  }
}
