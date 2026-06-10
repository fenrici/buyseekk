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
import { toPaginatedResponse } from '../common/utils/paginated-response';
import { CreateRequestDto } from './requests.dto';
import { ListRequestsQueryDto } from './list-requests.query.dto';
import { MineRequestsQueryDto } from './mine-requests.query.dto';
import { UpdateRequestDto } from './update-request.dto';

const LIMITED_EDIT_FIELDS = new Set([
  'title',
  'requirements',
  'budget',
  'budgetPeriod',
  'negotiable',
  'imageUrls',
]);

const STRUCTURAL_FIELDS = new Set([
  'location',
  'zone',
  'operation',
  'currency',
  'carBrand',
  'carModel',
  'carColor',
  'maxMileage',
  'bedrooms',
  'minSqm',
  'maxSqm',
]);

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
        operation: dto.category === RequestCategory.AUTOS ? 'COMPRA' : dto.operation ?? 'COMPRA',
        title,
        requirements: dto.requirements,
        budget: dto.budget,
        budgetPeriod: dto.budgetPeriod,
        negotiable: dto.negotiable ?? true,
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

  /** Listado público (sin auth): solo solicitudes activas con datos sanitizados. */
  async listPublic(filters: {
    page?: number;
    limit?: number;
    category?: RequestCategory;
    country?: Country;
    location?: string;
  }) {
    const { page, limit, skip } = parsePagination(filters.page, filters.limit);

    const where: Record<string, unknown> = { active: true };
    if (filters.category) where.category = filters.category;
    if (filters.country) where.country = filters.country;
    if (filters.location) where.location = filters.location;

    const [items, total] = await Promise.all([
      this.prisma.request.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true } },
          offers: { select: { id: true } },
        },
      }),
      this.prisma.request.count({ where }),
    ]);

    const sanitized = items.map((r) => ({
      id: r.id,
      category: r.category,
      operation: r.operation,
      title: r.title,
      requirements: r.requirements,
      budget: r.budget,
      budgetPeriod: r.budgetPeriod,
      negotiable: r.negotiable,
      currency: r.currency,
      location: r.location,
      zone: r.zone,
      country: r.country,
      bedrooms: r.bedrooms,
      minSqm: r.minSqm,
      maxSqm: r.maxSqm,
      carBrand: r.carBrand,
      carModel: r.carModel,
      carColor: r.carColor,
      maxMileage: r.maxMileage,
      imageUrls: r.imageUrls,
      createdAt: r.createdAt,
      offersCount: r.offers.length,
      buyerInitials: r.user.name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
    }));

    return toPaginatedResult(sanitized, total, page, limit);
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

  async mine(userId: string, query: MineRequestsQueryDto) {
    const { page, limit, skip } = parsePagination(query.page, query.limit);
    const where: { userId: string; active?: boolean } = { userId };
    if (query.active !== undefined) where.active = query.active;

    const [items, total] = await Promise.all([
      this.prisma.request.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, country: true, currency: true } },
          offers: { select: { id: true, status: true, sellerId: true, price: true } },
        },
      }),
      this.prisma.request.count({ where }),
    ]);

    return toPaginatedResponse(
      items.map((r) => this.formatRequest(r)!),
      total,
      page,
      limit,
    );
  }

  async update(userId: string, id: string, dto: UpdateRequestDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ForbiddenException();
    if (!isBuyerCapable(user.role)) {
      throw new ForbiddenException('Solo compradores pueden editar solicitudes');
    }

    const provided = Object.entries(dto).filter(([, v]) => v !== undefined);
    if (!provided.length) {
      throw new BadRequestException('No hay campos para actualizar');
    }

    const req = await this.prisma.request.findUnique({
      where: { id },
      include: { offers: { select: { id: true, status: true } } },
    });
    if (!req || !req.active) throw new NotFoundException('Solicitud no encontrada');
    if (req.userId !== userId) throw new ForbiddenException();

    const hasAccepted = req.offers.some((o) => o.status === OfferStatus.ACEPTADA);
    if (hasAccepted) {
      throw new BadRequestException('No podés editar una solicitud con una oferta aceptada');
    }

    const hasPending = req.offers.some((o) => o.status === OfferStatus.PENDIENTE);
    if (hasPending) {
      const blocked = provided.filter(([key]) => STRUCTURAL_FIELDS.has(key));
      if (blocked.length) {
        throw new BadRequestException(
          'Con ofertas pendientes solo podés editar título, requisitos, presupuesto, negociación e imágenes',
        );
      }
      const invalid = provided.filter(([key]) => !LIMITED_EDIT_FIELDS.has(key));
      if (invalid.length) {
        throw new BadRequestException(
          'Con ofertas pendientes solo podés editar título, requisitos, presupuesto, negociación e imágenes',
        );
      }
    }

    if (dto.imageUrls !== undefined) validateImageUrls(dto.imageUrls);

    const location = dto.location ?? req.location;
    if (dto.location !== undefined) {
      const allowedCities = citiesForCountry(user.country);
      if (!allowedCities.includes(dto.location)) {
        throw new BadRequestException('Ciudad no válida para tu país');
      }
    }

    if (req.category === RequestCategory.AUTOS) {
      const carBrand = dto.carBrand ?? req.carBrand;
      const carModel = dto.carModel ?? req.carModel;
      const carColor = dto.carColor ?? req.carColor;
      const maxMileage = dto.maxMileage ?? req.maxMileage;
      const zone = dto.zone ?? req.zone;

      if (!hasPending) {
        if (dto.carBrand !== undefined && !isValidBrand(dto.carBrand)) {
          throw new BadRequestException('Marca no válida');
        }
        if (dto.carModel !== undefined && carBrand && !isValidModel(carBrand, dto.carModel)) {
          throw new BadRequestException('Modelo no válido');
        }
        if (dto.carColor !== undefined && !isValidColor(dto.carColor)) {
          throw new BadRequestException('Color no válido');
        }
        if (dto.maxMileage !== undefined && (dto.maxMileage < 0 || dto.maxMileage > 500000)) {
          throw new BadRequestException('Millaje no válido');
        }
        if (dto.zone !== undefined) {
          const autoZones = zonesForCountryAndCity(user.country, location);
          if (!autoZones.includes(dto.zone)) {
            throw new BadRequestException('Zona no válida para tu país y ciudad');
          }
        }
      }

      if (!carBrand || !carModel || !carColor || maxMileage == null || !zone) {
        throw new BadRequestException('Datos de auto incompletos');
      }
    } else if (req.category === RequestCategory.INMOBILIARIA) {
      const zone = dto.zone ?? req.zone;
      const bedrooms = dto.bedrooms ?? req.bedrooms;
      const minSqm = dto.minSqm !== undefined ? dto.minSqm : req.minSqm;
      const maxSqm = dto.maxSqm !== undefined ? dto.maxSqm : req.maxSqm;

      if (!hasPending) {
        if (dto.zone !== undefined) {
          const allowedZones = zonesForCountryAndCity(user.country, location);
          if (!allowedZones.includes(dto.zone)) {
            throw new BadRequestException('Zona no válida para tu país y ciudad');
          }
        }
        if (dto.bedrooms !== undefined && (dto.bedrooms < 1 || dto.bedrooms > 10)) {
          throw new BadRequestException('Cantidad de habitaciones no válida');
        }
        if (dto.minSqm != null && (dto.minSqm < 10 || dto.minSqm > 5000)) {
          throw new BadRequestException('Metros cuadrados mínimos no válidos');
        }
        if (dto.maxSqm != null && (dto.maxSqm < 10 || dto.maxSqm > 5000)) {
          throw new BadRequestException('Metros cuadrados máximos no válidos');
        }
        if (minSqm != null && maxSqm != null && minSqm > maxSqm) {
          throw new BadRequestException('El mínimo de m² no puede superar el máximo');
        }
        if (dto.carBrand || dto.carModel || dto.carColor || dto.maxMileage != null) {
          throw new BadRequestException('Los campos de auto solo aplican a solicitudes de autos');
        }
      }

      if (!zone || bedrooms == null) {
        throw new BadRequestException('Datos de inmueble incompletos');
      }
    }

    let title = req.title;
    if (dto.title !== undefined) {
      const trimmed = dto.title.trim();
      title =
        trimmed ||
        (req.category === RequestCategory.AUTOS && req.carBrand && req.carModel
          ? `Busco ${req.carBrand} ${req.carModel}`
          : req.title);
    }

    const updated = await this.prisma.request.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title } : {}),
        ...(dto.requirements !== undefined ? { requirements: dto.requirements } : {}),
        ...(dto.budget !== undefined ? { budget: dto.budget } : {}),
        ...(dto.budgetPeriod !== undefined ? { budgetPeriod: dto.budgetPeriod } : {}),
        ...(dto.negotiable !== undefined ? { negotiable: dto.negotiable } : {}),
        ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
        ...(dto.location !== undefined ? { location: dto.location } : {}),
        ...(dto.zone !== undefined ? { zone: dto.zone } : {}),
        ...(dto.operation !== undefined && req.category !== RequestCategory.AUTOS
          ? { operation: dto.operation }
          : {}),
        ...(dto.imageUrls !== undefined ? { imageUrls: dto.imageUrls } : {}),
        ...(dto.bedrooms !== undefined ? { bedrooms: dto.bedrooms } : {}),
        ...(dto.minSqm !== undefined ? { minSqm: dto.minSqm } : {}),
        ...(dto.maxSqm !== undefined ? { maxSqm: dto.maxSqm } : {}),
        ...(dto.carBrand !== undefined ? { carBrand: dto.carBrand } : {}),
        ...(dto.carModel !== undefined ? { carModel: dto.carModel } : {}),
        ...(dto.carColor !== undefined ? { carColor: dto.carColor } : {}),
        ...(dto.maxMileage !== undefined ? { maxMileage: dto.maxMileage } : {}),
      },
      include: {
        user: { select: { id: true, name: true, country: true, currency: true } },
        offers: { select: { id: true, status: true, sellerId: true, price: true } },
      },
    });

    return this.formatRequest(updated);
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
