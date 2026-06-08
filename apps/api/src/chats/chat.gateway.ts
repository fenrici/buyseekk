import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
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
  @WebSocketServer() server!: Server;

  constructor(
    private jwt: JwtService,
    private config: ConfigService,
    private prisma: PrismaService,
    private chats: ChatsService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token as string | undefined;
      if (!token) throw new Error('no token');
      const payload = this.jwt.verify<{ sub: string }>(token, {
        secret: this.config.get('JWT_SECRET', 'dev-secret-change-me'),
      });
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) throw new Error('no user');
      (client as AuthedSocket).data.userId = user.id;
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect() {}

  @SubscribeMessage('join')
  async join(@ConnectedSocket() client: AuthedSocket, @MessageBody() chatId: string) {
    await this.chats.getOne(chatId, client.data.userId);
    client.join(this.room(chatId));
    return { ok: true };
  }

  @SubscribeMessage('send')
  async send(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { chatId: string; text: string },
  ) {
    const message = await this.chats.send(body.chatId, client.data.userId, { text: body.text });
    this.server.to(this.room(body.chatId)).emit('message', message);
    return message;
  }

  private room(chatId: string) {
    return `chat:${chatId}`;
  }
}
