import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { sortSavedRequestsForSeller } from '@buyseekk/shared';
import { isSellerCapable, type AuthUser } from '../common/types/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import { RequestsService } from '../requests/requests.service';

@Injectable()
export class SavedRequestsService {
  constructor(
    private prisma: PrismaService,
    private requests: RequestsService,
  ) {}

  private assertSeller(user: AuthUser) {
    if (!isSellerCapable(user.role)) {
      throw new ForbiddenException('Solo vendedores pueden guardar solicitudes');
    }
  }

  private async assertSaveableRequest(user: AuthUser, requestId: string) {
    const req = await this.prisma.request.findUnique({ where: { id: requestId } });
    if (!req || !req.active) throw new NotFoundException('Solicitud no encontrada');
    if (req.userId === user.id) throw new ForbiddenException('No podés guardar tu propia solicitud');
    if (req.country !== user.country) throw new NotFoundException('Solicitud no encontrada');
    if (user.sellerCategory && req.category !== user.sellerCategory) {
      throw new NotFoundException('Solicitud no encontrada');
    }
    return req;
  }

  async list(user: AuthUser) {
    this.assertSeller(user);
    const rows = await this.prisma.savedRequest.findMany({
      where: { sellerId: user.id },
      orderBy: { createdAt: 'desc' },
      select: { requestId: true, createdAt: true },
    });
    if (rows.length === 0) return [];

    const savedAtMap = new Map(rows.map((r) => [r.requestId, r.createdAt]));
    const requests = await this.prisma.request.findMany({
      where: { id: { in: rows.map((r) => r.requestId) } },
      include: {
        user: { select: { id: true, name: true, country: true, currency: true, avatarUrl: true } },
        offers: { select: { id: true, status: true, chat: { select: { id: true } } } },
      },
    });

    const sorted = sortSavedRequestsForSeller(requests);
    const items = await this.requests.formatManyForSeller(sorted, user.id);
    return items.map((item) => ({
      ...item,
      isSaved: true,
      savedAt: savedAtMap.get(item.id)?.toISOString() ?? null,
    }));
  }

  async save(user: AuthUser, requestId: string) {
    this.assertSeller(user);
    await this.assertSaveableRequest(user, requestId);

    const existing = await this.prisma.savedRequest.findUnique({
      where: { sellerId_requestId: { sellerId: user.id, requestId } },
    });
    if (existing) return { ok: true, saved: true };

    try {
      await this.prisma.savedRequest.create({
        data: { sellerId: user.id, requestId },
      });
      return { ok: true, saved: true };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('La solicitud ya está guardada');
      }
      throw e;
    }
  }

  async remove(user: AuthUser, requestId: string) {
    this.assertSeller(user);
    const row = await this.prisma.savedRequest.findUnique({
      where: { sellerId_requestId: { sellerId: user.id, requestId } },
    });
    if (!row) throw new NotFoundException('Solicitud no guardada');
    await this.prisma.savedRequest.delete({ where: { id: row.id } });
    return { ok: true, saved: false };
  }
}
