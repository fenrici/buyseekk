import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationPayload } from './notification-delivery.interface';

type AuthedSocket = Socket & { data: { userId: string } };

@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  },
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(NotificationGateway.name);

  @WebSocketServer() server!: Server;

  constructor(
    private jwt: JwtService,
    private config: ConfigService,
    private prisma: PrismaService,
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

  emitToUser(userId: string, notification: NotificationPayload, unreadCount: number) {
    this.server.to(this.userRoom(userId)).emit('notification', { notification, unreadCount });
  }

  emitUnreadCount(userId: string, unreadCount: number) {
    this.server.to(this.userRoom(userId)).emit('unread-count', { unreadCount });
  }

  private userRoom(userId: string) {
    return `user:${userId}`;
  }
}
