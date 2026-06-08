import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SendMessageDto } from './chats.dto';
import { ChatsService } from './chats.service';

@Controller('chats')
@UseGuards(JwtAuthGuard)
export class ChatsController {
  constructor(private chats: ChatsService) {}

  @Get()
  list(@Req() req: { user: { id: string } }) {
    return this.chats.list(req.user.id);
  }

  @Get(':id')
  getOne(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    return this.chats.getOne(id, req.user.id);
  }

  @Post(':id/messages')
  send(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chats.send(id, req.user.id, dto);
  }
}
