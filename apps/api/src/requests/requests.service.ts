import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Country, OfferStatus, OperationType, RequestCategory, UserRole } from '@prisma/client';
import {
  citiesForCountry,
  isValidBrand,
  isValidColor,
  isValidModel,
  MAX_ACTIVE_REQUESTS,
  parsePagination,
  toPaginatedResult,
  zonesForCountryAndCity,
} from '@buyseekk/shared';
import { isBuyerCapable, isSellerCapable } from '../common/types/auth-user';
import { validateImageUrls } from '../common/utils/image-urls';
import { RatingsService } from '../ratings/ratings.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRequestDto } from './requests.dto';
import { ListRequestsQueryDto } from './list-requests.query.dto';

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

  private assertSellerRole(role: UserRole) {
    if (!isSellerCapable(role)) {
      throw new ForbiddenException('Solo vendedores pueden ver el marketplace');
    }
  }

  async create(userId: string, dto: CreateRequestDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ForbiddenException();
    if (!isBuyerCapable(user.role)) {
      throw new ForbiddenException('Solo compradores pueden publicar solicitudes');
    }
    validateImageUrls(dto.imageUrls);

    if (dto.country !== user.country) {
      throw new BadRequestException('Solo podés publicar solicitudes en tu país');
    }
    const allowedCities = citiesForCountry(user.country);
    if (!allowedCities.includes(dto.location)) {
      throw new BadRequestException('Ciudad no válida para tu país');
    }

    if (dto.category === RequestCategory.AUTOS) {
      if (!dto.carBrand || !dto.carModel || !dto.carColor || dto.maxMileage == null) {
        throw new BadRequestException('Marca, modelo, color y millaje son obligatorios para autos');
      }
      if (!dto.zone) throw new BadRequestException('Zona obligatoria para autos');
      const autoZones = zonesForCountryAndCity(user.country, dto.location);
      if (!autoZones.includes(dto.zone)) {
        throw new BadRequestException('Zona no válida para tu país y ciudad');
      }
      if (!isValidBrand(dto.carBrand)) throw new BadRequestException('Marca no válida');
      if (!isValidModel(dto.carBrand, dto.carModel)) throw new BadRequestException('Modelo no válido');
      if (!isValidColor(dto.carColor)) throw new BadRequestException('Color no válido');
      if (dto.maxMileage < 0 || dto.maxMileage > 500000) {
        throw new BadRequestException('Millaje no válido');
      }
    } else if (dto.category === RequestCategory.INMOBILIARIA) {
      if (!dto.title?.trim()) throw new BadRequestException('Título obligatorio');
      if (!dto.zone) throw new BadRequestException('Zona obligatoria para inmuebles');
      const allowedZones = zonesForCountryAndCity(user.country, dto.location);
      if (!allowedZones.includes(dto.zone)) {
        throw new BadRequestException('Zona no válida para tu país y ciudad');
      }
      if (dto.bedrooms == null || dto.bedrooms < 1 || dto.bedrooms > 10) {
        throw new BadRequestException('Cantidad de habitaciones obligatoria para inmuebles');
      }
      if (dto.minSqm != null && (dto.minSqm < 10 || dto.minSqm > 5000)) {
        throw new BadRequestException('Metros cuadrados mínimos no válidos');
      }
      if (dto.maxSqm != null && (dto.maxSqm < 10 || dto.maxSqm > 5000)) {
        throw new BadRequestException('Metros cuadrados máximos no válidos');
      }
      if (dto.minSqm != null && dto.maxSqm != null && dto.minSqm > dto.maxSqm) {
        throw new BadRequestException('El mínimo de m² no puede superar el máximo');
      }
      if (dto.carBrand || dto.carModel || dto.carColor || dto.maxMileage != null) {
        throw new BadRequestException('Los campos de auto solo aplican a solicitudes de autos');
      }
    } else {
      throw new BadRequestException('Categoría no válida');
    }

    const activeCount = await this.prisma.request.count({
      where: { userId, active: true },
    });
    if (activeCount >= MAX_ACTIVE_REQUESTS) {
      throw new BadRequestException(`Máximo ${MAX_ACTIVE_REQUESTS} solicitudes activas`);
    }

    const trimmedTitle = dto.title?.trim() ?? '';
    const autoTitle =
      dto.category === RequestCategory.AUTOS && dto.carBrand && dto.carModel
        ? `Busco ${dto.carBrand} ${dto.carModel}`
        : null;
    const title =
      trimmedTitle ||
      autoTitle ||
      (trimmedTitle.startsWith('Busco') || trimmedTitle.startsWith('Alquilo')
        ? trimmedTitle
        : `Busco ${trimmedTitle}`);

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
        zone: dto.zone ?? null,
        bedrooms: dto.category === RequestCategory.INMOBILIARIA ? dto.bedrooms! : null,
        minSqm: dto.category === RequestCategory.INMOBILIARIA ? dto.minSqm ?? null : null,
        maxSqm: dto.category === RequestCategory.INMOBILIARIA ? dto.maxSqm ?? null : null,
        country: dto.country,
        imageUrls: dto.imageUrls ?? [],
        carBrand: dto.category === RequestCategory.AUTOS ? dto.carBrand : null,
        carModel: dto.category === RequestCategory.AUTOS ? dto.carModel : null,
        carColor: dto.category === RequestCategory.AUTOS ? dto.carColor! : null,
        maxMileage: dto.category === RequestCategory.AUTOS ? dto.maxMileage! : null,
      },
      include: {
        user: { select: { id: true, name: true, country: true, currency: true } },
        offers: { select: { id: true, status: true } },
      },
    });

    return this.formatRequest(req);
  }

  async listForSeller(
    user: { id: string; country: Country; role: UserRole },
    filters: ListRequestsQueryDto,
  ) {
    this.assertSellerRole(user.role);

    const hasAutoFilter = !!(filters.carBrand || filters.carModel || filters.carColor || filters.maxMileage);
    const hasEstateFilter = !!(
      filters.bedrooms ||
      filters.minSqm != null ||
      filters.maxSqm != null
    );
    const hasZoneFilter = !!filters.zone;

    const where: Record<string, unknown> = {
      active: true,
      country: user.country,
      userId: { not: user.id },
    };

    if (filters.category) where.category = filters.category;
    else if (hasAutoFilter && !hasEstateFilter && !hasZoneFilter) where.category = RequestCategory.AUTOS;
    else if (hasEstateFilter && !hasAutoFilter && !hasZoneFilter) where.category = RequestCategory.INMOBILIARIA;

    if (filters.operation) where.operation = filters.operation;
    if (filters.location) where.location = filters.location;
    if (filters.zone) where.zone = filters.zone;
    if (filters.bedrooms) where.bedrooms = filters.bedrooms;
    if (filters.carBrand) where.carBrand = filters.carBrand;
    if (filters.carModel) where.carModel = filters.carModel;
    if (filters.carColor) where.carColor = filters.carColor;

    const rangeFilters: Record<string, unknown>[] = [];
    if (filters.maxMileage != null) {
      rangeFilters.push({ OR: [{ maxMileage: null }, { maxMileage: { lte: filters.maxMileage } }] });
    }
    if (filters.minSqm != null) {
      rangeFilters.push({ OR: [{ minSqm: null }, { minSqm: { lte: filters.minSqm } }] });
    }
    if (filters.maxSqm != null) {
      rangeFilters.push({ OR: [{ maxSqm: null }, { maxSqm: { gte: filters.maxSqm } }] });
    }
    if (rangeFilters.length === 1) {
      Object.assign(where, rangeFilters[0]);
    } else if (rangeFilters.length > 1) {
      where.AND = rangeFilters;
    }

    const { page, limit, skip } = parsePagination(filters.page, filters.limit);

    const [items, total] = await Promise.all([
      this.prisma.request.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, country: true, currency: true } },
          offers: { select: { id: true, status: true } },
        },
      }),
      this.prisma.request.count({ where }),
    ]);

    const ratingMap = await this.ratings.getStatsForUsers(items.map((r) => r.userId));

    const enriched = items.map((r) => ({
      ...this.formatRequest(r)!,
      user: {
        ...r.user,
        rating: ratingMap[r.userId] ?? { avgStars: null, reviewCount: 0, noResponseCount: 0 },
      },
    }));

    return toPaginatedResult(enriched, total, page, limit);
  }

  async locationsForSeller(user: { country: Country; role: UserRole }) {
    this.assertSellerRole(user.role);

    const fromDb = await this.prisma.request.findMany({
      where: { active: true, country: user.country },
      select: { location: true },
      distinct: ['location'],
    });

    const predefined = citiesForCountry(user.country);
    const merged = [...new Set([...predefined, ...fromDb.map((r) => r.location)])];
    return merged.sort((a, b) => a.localeCompare(b));
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

  async getOne(
    id: string,
    viewer?: { id: string; country: Country; role: UserRole },
  ) {
    const req = await this.findByIdRaw(id);
    if (!req || !req.active) throw new NotFoundException('Solicitud no encontrada');

    if (viewer && viewer.role !== UserRole.BUYER && req.country !== viewer.country) {
      throw new NotFoundException('Solicitud no encontrada');
    }
    if (viewer && req.userId === viewer.id) {
      throw new NotFoundException('Solicitud no encontrada');
    }

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
