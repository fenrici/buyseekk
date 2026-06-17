import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Inject, Logger, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { THROTTLE_LIMITS } from '../config/throttle.config';
import { ChatsService } from './chats.service';
import { PrismaService } from '../prisma/prisma.service';

type AuthedSocket = Socket & { data: { userId: string } };

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);
  private readonly sendTimestamps = new Map<string, number[]>();

  @WebSocketServer() server!: Server;

  constructor(
    private jwt: JwtService,
    private config: ConfigService,
    private prisma: PrismaService,
    @Inject(forwardRef(() => ChatsService))
    private chats: ChatsService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token as string | undefined;
      if (!token) throw new Error('missing token');

      const payload = this.jwt.verify<{ sub: string }>(token, {
        secret: this.config.get('JWT_SECRET', 'dev-secret-change-me'),
      });
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) throw new Error('user not found');

      (client as AuthedSocket).data.userId = user.id;
      client.join(this.userRoom(user.id));
      this.logger.log(`connected user=${user.id} socket=${client.id}`);
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'auth failed';
      this.logger.warn(`rejected socket=${client.id} reason=${reason}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = (client as AuthedSocket).data?.userId;
    this.logger.log(`disconnected user=${userId ?? 'unknown'} socket=${client.id}`);
  }

  @SubscribeMessage('join')
  async join(@ConnectedSocket() client: AuthedSocket, @MessageBody() chatId: string) {
    await this.chats.getOne(chatId, client.data.userId);
    const room = this.room(chatId);
    client.join(room);
    this.logger.debug(`join user=${client.data.userId} room=${room}`);
    return { ok: true };
  }

  @SubscribeMessage('send')
  async send(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { chatId: string; text: string },
  ) {
    this.assertMessageRate(client.data.userId);
    const message = await this.chats.send(body.chatId, client.data.userId, { text: body.text });
    const room = this.room(body.chatId);
    this.server.to(room).emit('message', message);
    this.logger.debug(
      `message chat=${body.chatId} user=${client.data.userId} msg=${message.id}`,
    );
    return message;
  }

  emitPartnerRead(chatId: string, userId: string, readAt: Date) {
    this.server.to(this.room(chatId)).emit('partner-read', {
      userId,
      readAt: readAt.toISOString(),
    });
  }

  emitUnreadToUser(
    userId: string,
    payload: { totalUnread: number; byChatId: Record<string, number> },
  ) {
    this.server.to(this.userRoom(userId)).emit('unread-update', payload);
  }

  private room(chatId: string) {
    return `chat:${chatId}`;
  }

  private userRoom(userId: string) {
    return `user:${userId}`;
  }

  private assertMessageRate(userId: string) {
    const { ttl, limit } = THROTTLE_LIMITS.chat;
    const now = Date.now();
    const recent = (this.sendTimestamps.get(userId) ?? []).filter((t) => now - t < ttl);
    if (recent.length >= limit) {
      throw new WsException('Demasiados mensajes. Esperá un momento e intentá de nuevo.');
    }
    recent.push(now);
    this.sendTimestamps.set(userId, recent);
  }
}
