import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OfferStatus, RequestCategory } from '@prisma/client';
import { MAX_ACTIVE_REQUESTS } from '../lib/business-rules';
import { RatingsService } from '../ratings/ratings.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRequestDto } from './requests.dto';

@Injectable()
export class RequestsService {
  constructor(
    private prisma: PrismaService,
    private ratings: RatingsService,
  ) {}

  private formatRequest(req: Awaited<ReturnType<typeof this.findByIdRaw>>) {
    if (!req) return null;
    const pendingOffers = req.offers.filter((o) => o.status === OfferStatus.PENDIENTE).length;
    return {
      ...req,
      offersCount: req.offers.length,
      pendingOffersCount: pendingOffers,
      hasOffers: req.offers.length > 0,
    };
  }

  private async findByIdRaw(id: string) {
    return this.prisma.request.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, country: true, currency: true } },
        offers: { select: { id: true, status: true } },
      },
    });
  }

  async create(userId: string, dto: CreateRequestDto) {
    const activeCount = await this.prisma.request.count({
      where: { userId, active: true },
    });
    if (activeCount >= MAX_ACTIVE_REQUESTS) {
      throw new BadRequestException(`Máximo ${MAX_ACTIVE_REQUESTS} solicitudes activas`);
    }

    const title =
      dto.title.startsWith('Busco') || dto.title.startsWith('Alquilo')
        ? dto.title
        : `Busco ${dto.title}`;

    const req = await this.prisma.request.create({
      data: {
        userId,
        category: dto.category,
        operation: dto.operation ?? 'COMPRA',
        title,
        requirements: dto.requirements,
        budget: dto.budget,
        budgetPeriod: dto.budgetPeriod,
        currency: dto.currency,
        location: dto.location,
        country: dto.country,
        imageUrls: dto.imageUrls ?? [],
      },
      include: {
        user: { select: { id: true, name: true, country: true, currency: true } },
        offers: { select: { id: true, status: true } },
      },
    });

    return this.formatRequest(req);
  }

  async list(filters: { category?: RequestCategory; country?: string; search?: string }) {
    const where: Record<string, unknown> = { active: true };

    if (filters.category) where.category = filters.category;
    if (filters.country) where.country = filters.country;
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { location: { contains: filters.search, mode: 'insensitive' } },
        { requirements: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const items = await this.prisma.request.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, country: true, currency: true } },
        offers: { select: { id: true, status: true } },
      },
    });

    return Promise.all(
      items.map(async (r) => ({
        ...this.formatRequest(r)!,
        user: {
          ...r.user,
          rating: await this.ratings.getStats(r.userId),
        },
      })),
    );
  }

  async mine(userId: string) {
    const items = await this.prisma.request.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, country: true, currency: true } },
        offers: { select: { id: true, status: true, sellerId: true, price: true } },
      },
    });
    return items.map((r) => this.formatRequest(r));
  }

  async getOne(id: string) {
    const req = await this.findByIdRaw(id);
    if (!req || !req.active) throw new NotFoundException('Solicitud no encontrada');
    return this.formatRequest(req);
  }

  async remove(userId: string, id: string) {
    const req = await this.prisma.request.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Solicitud no encontrada');
    if (req.userId !== userId) throw new ForbiddenException();

    await this.prisma.request.update({
      where: { id },
      data: { active: false },
    });
    return { ok: true };
  }
}
