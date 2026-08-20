import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CarCondition, Country, Currency, NegotiationEndedBy, OfferStatus, OperationType, RequestCategory, RequestStatus, UserRole } from '@prisma/client';
import {
  citiesForCountry,
  isValidBrand,
  isValidCarYear,
  isValidColor,
  isValidModel,
  MAX_ACTIVE_REQUESTS,
  parsePagination,
  toPaginatedResult,
  zonesForCountryAndCity,
  isValidUsAreaLocation,
  isValidUsRequestArea,
  parseUsAreaLocation,
  CAR_COLOR_NO_PREFERENCE,
  isValidAutoMileagePreference,
  isValidMileageValue,
} from '@buyseekk/shared';
import { REQUEST_BUYER_SELECT, withBuyerAvatar } from '../common/utils/account-avatars';
import { isBuyerCapable, isSellerCapable } from '../common/types/auth-user';
import { assertValidMoneyAmount } from '../common/utils/money-limits';
import { assertEmailVerified } from '../common/utils/assert-email-verified';
import { assertAccountActive } from '../common/utils/assert-not-blocked';
import { assertCleanPublicText, assertNoDuplicateRequest } from '../common/utils/spam-content';
import { validateImageUrls, assertOwnedImageUrls } from '../common/utils/image-urls';
import {
  REQUEST_HAS_ACTIVE_NEGOTIATIONS_CODE,
  REQUEST_HAS_ACTIVE_NEGOTIATIONS_MESSAGE,
} from './request-delete.constants';
import { RatingsService } from '../ratings/ratings.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageObjectsService } from '../storage/storage-objects.service';
import { toPaginatedResponse } from '../common/utils/paginated-response';
import { getLaunchCountry } from '../config/launch-country.config';
import { CreateRequestDto } from './requests.dto';
import { ListRequestsQueryDto } from './list-requests.query.dto';
import { MineRequestsQueryDto } from './mine-requests.query.dto';
import {
  archiveCutoff,
  confirmationCutoff,
  effectiveRequestStatus,
  inactiveAfterConfirmCutoff,
  countsTowardBuyerLimitWhere,
  isVisibleToSellers,
  sortRequestsForSeller,
  toLifecycleInput,
  visibleToSellersWhere,
} from './request-status';
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
  'carYearMin',
  'carCondition',
  'maxMileage',
  'bedrooms',
  'minSqm',
  'maxSqm',
]);

@Injectable()
export class RequestsService {
  private readonly logger = new Logger(RequestsService.name);

  constructor(
    private prisma: PrismaService,
    private ratings: RatingsService,
    private notifications: NotificationsService,
    private storageObjects: StorageObjectsService,
  ) {}

  private readonly offersForFormatSelect = {
    id: true,
    status: true,
    dealCompletedAt: true,
    negotiationEndedAt: true,
    chat: { select: { id: true } },
  } as const;

  private formatRequest(
    req:
      | (Parameters<typeof toLifecycleInput>[0] & {
          id: string;
          offers: Array<{
            id: string;
            status: OfferStatus;
            chat?: { id: string } | null;
            dealCompletedAt?: Date | null;
            negotiationEndedAt?: Date | null;
            sellerId?: string;
            price?: number;
          }>;
        })
      | null,
  ) {
    if (!req) return null;
    const pendingOffers = req.offers.filter((o) => o.status === OfferStatus.PENDIENTE).length;
    const lifecycle = toLifecycleInput(req);
    return {
      ...req,
      user: 'user' in req && req.user ? withBuyerAvatar(req.user) : undefined,
      status: effectiveRequestStatus(lifecycle),
      lastBuyerActivityAt: req.lastBuyerActivityAt,
      lastActivityAt: req.lastBuyerActivityAt,
      offersCount: req.offers.length,
      pendingOffersCount: pendingOffers,
      conversationsCount: req.offers.filter((o) => o.chat).length,
      hasOffers: req.offers.length > 0,
    };
  }

  private async attachSellerMeta<T extends { id: string }>(
    items: T[],
    sellerId: string,
  ): Promise<
    (T & {
      isSaved: boolean;
      myOffer: { id: string; status: string; chatId: string | null } | null;
    })[]
  > {
    if (items.length === 0) return [];
    const ids = items.map((i) => i.id);
    const [savedRows, offerRows] = await Promise.all([
      this.prisma.savedRequest.findMany({
        where: { sellerId, requestId: { in: ids } },
        select: { requestId: true },
      }),
      this.prisma.offer.findMany({
        where: { sellerId, requestId: { in: ids } },
        select: { id: true, requestId: true, status: true, chat: { select: { id: true } } },
      }),
    ]);
    const savedSet = new Set(savedRows.map((r) => r.requestId));
    const offerMap = new Map(offerRows.map((o) => [o.requestId, o]));
    return items.map((item) => {
      const mine = offerMap.get(item.id);
      return {
        ...item,
        isSaved: savedSet.has(item.id),
        myOffer: mine
          ? { id: mine.id, status: mine.status, chatId: mine.chat?.id ?? null }
          : null,
      };
    });
  }

  /**
   * Pagina IDs del marketplace vendedor en DB respetando prioridad:
   * activas/negociando (actividad reciente) antes que inactivas, luego por fecha.
   */
  private async paginateSellerMarketplaceIds(
    where: Record<string, unknown>,
    skip: number,
    limit: number,
    now = Date.now(),
  ): Promise<string[]> {
    const confirmation = confirmationCutoff(now);
    const inactive = inactiveAfterConfirmCutoff(now);
    const archive = archiveCutoff(now);

    const tier0Where = { ...where, lastBuyerActivityAt: { gte: confirmation } };
    const tier1Where = { ...where, lastBuyerActivityAt: { lt: inactive, gte: archive } };

    const tier0Count = await this.prisma.request.count({ where: tier0Where });

    if (skip < tier0Count) {
      const take0 = Math.min(limit, tier0Count - skip);
      const tier0 = await this.prisma.request.findMany({
        where: tier0Where,
        select: { id: true },
        orderBy: { lastBuyerActivityAt: 'desc' },
        skip,
        take: take0,
      });
      const ids = tier0.map((r) => r.id);
      const remaining = limit - ids.length;
      if (remaining > 0) {
        const tier1 = await this.prisma.request.findMany({
          where: tier1Where,
          select: { id: true },
          orderBy: { lastBuyerActivityAt: 'desc' },
          take: remaining,
        });
        ids.push(...tier1.map((r) => r.id));
      }
      return ids;
    }

    const tier1 = await this.prisma.request.findMany({
      where: tier1Where,
      select: { id: true },
      orderBy: { lastBuyerActivityAt: 'desc' },
      skip: skip - tier0Count,
      take: limit,
    });
    return tier1.map((r) => r.id);
  }

  async formatManyForSeller(
    rows: Array<
      Parameters<typeof toLifecycleInput>[0] & {
        id: string;
        userId: string;
        user: { id: string; name: string; country: Country; currency: Currency; buyerAvatarUrl: string | null };
        offers: Array<{
          id: string;
          status: OfferStatus;
          chat?: { id: string } | null;
          dealCompletedAt?: Date | null;
          negotiationEndedAt?: Date | null;
        }>;
      }
    >,
    sellerId: string,
  ) {
    const ratingMap = await this.ratings.getStatsForUsers(rows.map((r) => r.userId));
    const formatted = rows.map((r) => ({
      ...this.formatRequest(r)!,
      user: {
        ...withBuyerAvatar(r.user),
        rating: ratingMap[r.userId] ?? { avgStars: null, reviewCount: 0, noResponseCount: 0 },
      },
    }));
    return this.attachSellerMeta(formatted, sellerId);
  }

  private async findByIdRaw(id: string) {
    return this.prisma.request.findUnique({
      where: { id },
      include: {
        user: { select: REQUEST_BUYER_SELECT },
        offers: {
          select: {
            ...this.offersForFormatSelect,
            sellerId: true,
            price: true,
          },
        },
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
    assertAccountActive(user);
    assertEmailVerified(user);
    validateImageUrls(dto.imageUrls);
    assertOwnedImageUrls(dto.imageUrls, userId);
    assertCleanPublicText(dto.requirements, 'los requisitos');
    assertCleanPublicText(dto.title, 'el título');
    await assertNoDuplicateRequest(this.prisma, userId, dto.requirements, dto.title);
    assertValidMoneyAmount(
      dto.budget,
      dto.currency,
      'presupuesto',
      dto.operation === 'ALQUILER' || dto.budgetPeriod != null,
    );

    if (dto.country !== user.country) {
      throw new BadRequestException('Solo podés publicar solicitudes en tu país');
    }

    if (user.country === Country.US) {
      if (!isValidUsAreaLocation(dto.location)) {
        throw new BadRequestException('Ciudad no válida');
      }
    } else {
      const allowedCities = citiesForCountry(user.country);
      if (!allowedCities.includes(dto.location)) {
        throw new BadRequestException('Ciudad no válida para tu país');
      }
    }

    let resolvedState: string | null = null;
    if (user.country === Country.US) {
      const parsed = parseUsAreaLocation(dto.location);
      resolvedState = parsed?.state ?? null;
      const zoneValue = dto.zone?.trim() || null;
      if (parsed && zoneValue && !isValidUsRequestArea(parsed.state, parsed.area, zoneValue)) {
        throw new BadRequestException('Zona no válida para la ciudad seleccionada');
      }
      dto.zone = zoneValue ?? undefined;
    }

    if (dto.category === RequestCategory.AUTOS) {
      if (!dto.carBrand || !dto.carModel || !dto.carColor || dto.carYearMin == null) {
        throw new BadRequestException('Marca, modelo, color y año son obligatorios para autos');
      }
      if (user.country !== Country.US) {
        if (!dto.zone) throw new BadRequestException('Zona obligatoria para autos');
        const autoZones = zonesForCountryAndCity(user.country, dto.location);
        if (!autoZones.includes(dto.zone)) {
          throw new BadRequestException('Zona no válida para tu país y ciudad');
        }
      }
      if (!isValidBrand(dto.carBrand)) throw new BadRequestException('Marca no válida');
      if (!isValidModel(dto.carBrand, dto.carModel)) throw new BadRequestException('Modelo no válido');
      if (!isValidColor(dto.carColor)) throw new BadRequestException('Color no válido');
      if (!isValidCarYear(dto.carYearMin)) throw new BadRequestException('Año no válido');
      if (!isValidAutoMileagePreference(dto.carCondition ?? null, dto.maxMileage ?? null)) {
        throw new BadRequestException('Preferencia de millaje no válida');
      }
      if (dto.maxMileage != null && !isValidMileageValue(dto.maxMileage)) {
        throw new BadRequestException('Millaje no válido');
      }
    } else if (dto.category === RequestCategory.INMOBILIARIA) {
      if (!dto.title?.trim()) throw new BadRequestException('Título obligatorio');
      if (user.country !== Country.US) {
        if (!dto.zone) throw new BadRequestException('Zona obligatoria para inmuebles');
        const allowedZones = zonesForCountryAndCity(user.country, dto.location);
        if (!allowedZones.includes(dto.zone)) {
          throw new BadRequestException('Zona no válida para tu país y ciudad');
        }
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
      if (dto.carBrand || dto.carModel || dto.carColor || dto.carYearMin != null || dto.carCondition != null || dto.maxMileage != null) {
        throw new BadRequestException('Los campos de auto solo aplican a solicitudes de autos');
      }
    } else {
      throw new BadRequestException('Categoría no válida');
    }

    const activeCount = await this.prisma.request.count({
      where: { userId, ...countsTowardBuyerLimitWhere() },
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

    const req = await this.storageObjects.withCreateCompensation(dto.imageUrls, userId, () =>
      this.prisma.request.create({
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
          state: resolvedState,
          zone: dto.zone ?? null,
          bedrooms: dto.category === RequestCategory.INMOBILIARIA ? dto.bedrooms! : null,
          minSqm: dto.category === RequestCategory.INMOBILIARIA ? dto.minSqm ?? null : null,
          maxSqm: dto.category === RequestCategory.INMOBILIARIA ? dto.maxSqm ?? null : null,
          country: dto.country,
          imageUrls: dto.imageUrls ?? [],
          carBrand: dto.category === RequestCategory.AUTOS ? dto.carBrand : null,
          carModel: dto.category === RequestCategory.AUTOS ? dto.carModel : null,
          carColor: dto.category === RequestCategory.AUTOS ? dto.carColor! : null,
          carYearMin: dto.category === RequestCategory.AUTOS ? dto.carYearMin! : null,
          carCondition:
            dto.category === RequestCategory.AUTOS && dto.carCondition === CarCondition.NEW
              ? CarCondition.NEW
              : null,
          maxMileage: dto.category === RequestCategory.AUTOS ? dto.maxMileage ?? null : null,
        },
        include: {
          user: { select: REQUEST_BUYER_SELECT },
          offers: { select: this.offersForFormatSelect },
        },
      }),
    );

    try {
      await this.notifications.processMatchingRequestAlerts(req.id);
    } catch (err) {
      this.logger.error(`Alertas de solicitud compatible fallaron para ${req.id}`, err);
    }

    return this.formatRequest(req);
  }

  async listForSeller(
    user: {
      id: string;
      country: Country;
      role: UserRole;
      sellerCategory?: RequestCategory | null;
    },
    filters: ListRequestsQueryDto,
  ) {
    this.assertSellerRole(user.role);

    const hasAutoFilter = !!(
      filters.carBrand ||
      filters.carModel ||
      filters.carColor ||
      filters.carYearMin != null ||
      filters.carCondition ||
      filters.maxMileage
    );
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
      hiddenByModeration: false,
      ...visibleToSellersWhere(),
      NOT: { offers: { some: { sellerId: user.id } } },
    };

    if (user.sellerCategory) {
      where.category = user.sellerCategory;
    } else if (filters.category) {
      where.category = filters.category;
    } else if (hasAutoFilter && !hasEstateFilter && !hasZoneFilter) {
      where.category = RequestCategory.AUTOS;
    } else if (hasEstateFilter && !hasAutoFilter && !hasZoneFilter) {
      where.category = RequestCategory.INMOBILIARIA;
    }

    if (filters.operation) where.operation = filters.operation;
    if (filters.location) where.location = filters.location;

    const extraFilters: Record<string, unknown>[] = [];
    if (filters.state && user.country === Country.US) {
      extraFilters.push({ state: filters.state });
    }
    if (filters.zone) {
      if (user.country === Country.US) {
        // Any-area soft match only when the seller also scoped a market/city.
        if (filters.location) {
          extraFilters.push({ OR: [{ zone: filters.zone }, { zone: null }] });
        } else {
          extraFilters.push({ zone: filters.zone });
        }
      } else {
        extraFilters.push({ zone: filters.zone });
      }
    }
    if (filters.bedrooms) where.bedrooms = filters.bedrooms;
    if (filters.carBrand) where.carBrand = filters.carBrand;
    if (filters.carModel) where.carModel = filters.carModel;
    if (filters.carColor) {
      extraFilters.push({
        OR: [{ carColor: filters.carColor }, { carColor: CAR_COLOR_NO_PREFERENCE }],
      });
    }

    const rangeFilters: Record<string, unknown>[] = [];
    if (filters.carYearMin != null) {
      rangeFilters.push({
        OR: [{ carYearMin: null }, { carYearMin: { lte: filters.carYearMin } }],
      });
    }
    if (filters.carCondition) {
      extraFilters.push({ carCondition: filters.carCondition });
    }
    if (filters.maxMileage != null) {
      rangeFilters.push({
        OR: [
          { AND: [{ maxMileage: null }, { carCondition: null }] },
          { carCondition: CarCondition.NEW },
          { maxMileage: { lte: filters.maxMileage } },
        ],
      });
    }
    if (filters.minSqm != null) {
      rangeFilters.push({ OR: [{ minSqm: null }, { minSqm: { lte: filters.minSqm } }] });
    }
    if (filters.maxSqm != null) {
      rangeFilters.push({ OR: [{ maxSqm: null }, { maxSqm: { gte: filters.maxSqm } }] });
    }
    if (rangeFilters.length) extraFilters.push(...rangeFilters);
    if (extraFilters.length) {
      where.AND = extraFilters;
    }

    const { page, limit, skip } = parsePagination(filters.page, filters.limit);

    const [total, pageIds] = await Promise.all([
      this.prisma.request.count({ where }),
      this.paginateSellerMarketplaceIds(where, skip, limit),
    ]);

    const items =
      pageIds.length === 0
        ? []
        : await this.prisma.request.findMany({
            where: { id: { in: pageIds } },
            include: {
              user: { select: REQUEST_BUYER_SELECT },
              offers: { select: this.offersForFormatSelect },
            },
          });

    const orderMap = new Map(pageIds.map((id, index) => [id, index]));
    items.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));

    const ratingMap = await this.ratings.getStatsForUsers(items.map((r) => r.userId));

    const enriched = items.map((r) => ({
      ...this.formatRequest(r)!,
      user: {
        ...withBuyerAvatar(r.user),
        rating: ratingMap[r.userId] ?? { avgStars: null, reviewCount: 0, noResponseCount: 0 },
      },
    }));

    return toPaginatedResult(await this.attachSellerMeta(enriched, user.id), total, page, limit);
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

    const where: Record<string, unknown> = {
      active: true,
      hiddenByModeration: false,
      ...visibleToSellersWhere(),
    };
    if (filters.category) where.category = filters.category;
    const launchCountry = getLaunchCountry();
    if (launchCountry) {
      where.country = launchCountry;
    } else if (filters.country) {
      where.country = filters.country;
    }
    if (filters.location) where.location = filters.location;

    const [items, total] = await Promise.all([
      this.prisma.request.findMany({
        where,
        skip,
        take: limit,
        orderBy: { lastBuyerActivityAt: 'desc' },
        include: {
          user: { select: { name: true } },
          offers: { select: { id: true, chat: { select: { id: true } } } },
        },
      }),
      this.prisma.request.count({ where }),
    ]);

    const sorted = sortRequestsForSeller(items);

    const sanitized = sorted.map((r) => this.sanitizePublic(r));

    return toPaginatedResult(sanitized, total, page, limit);
  }

  /** Forma sanitizada de una solicitud pública (sin datos sensibles del comprador). */
  private sanitizePublic(r: {
    id: string;
    status: RequestStatus;
    lastBuyerActivityAt: Date;
    pausedAt: Date | null;
    category: RequestCategory;
    operation: OperationType;
    title: string;
    requirements: string;
    budget: number;
    budgetPeriod: string | null;
    negotiable: boolean;
    currency: Currency;
    location: string;
    zone: string | null;
    state: string | null;
    country: Country;
    bedrooms: number | null;
    minSqm: number | null;
    maxSqm: number | null;
    carBrand: string | null;
    carModel: string | null;
    carColor: string | null;
    carYearMin: number | null;
    maxMileage: number | null;
    imageUrls: string[];
    createdAt: Date;
    offers: { id: string; chat: { id: string } | null }[];
    user: { name: string };
  }) {
    return {
      id: r.id,
      status: effectiveRequestStatus(toLifecycleInput(r)),
      lastActivityAt: r.lastBuyerActivityAt,
      lastBuyerActivityAt: r.lastBuyerActivityAt,
      conversationsCount: r.offers.filter((o) => o.chat).length,
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
      carYearMin: r.carYearMin,
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
    };
  }

  /** Detalle público (sin auth) de una solicitud visible. */
  async getPublicOne(id: string) {
    const req = await this.prisma.request.findUnique({
      where: { id },
      include: {
        user: { select: { name: true } },
        offers: { select: { id: true, chat: { select: { id: true } } } },
      },
    });
    if (
      !req ||
      !req.active ||
      req.hiddenByModeration ||
      !isVisibleToSellers(toLifecycleInput(req))
    ) {
      throw new NotFoundException('Solicitud no encontrada');
    }
    const launchCountry = getLaunchCountry();
    if (launchCountry && req.country !== launchCountry) {
      throw new NotFoundException('Solicitud no encontrada');
    }
    return this.sanitizePublic(req);
  }

  async locationsForSeller(user: {
    country: Country;
    role: UserRole;
    sellerCategory?: RequestCategory | null;
  }) {
    this.assertSellerRole(user.role);

    const where: Record<string, unknown> = {
      active: true,
      country: user.country,
      hiddenByModeration: false,
      ...visibleToSellersWhere(),
    };
    if (user.sellerCategory) where.category = user.sellerCategory;

    const fromDb = await this.prisma.request.findMany({
      where,
      select: { location: true },
      distinct: ['location'],
    });

    const predefined = citiesForCountry(user.country);
    const merged = [...new Set([...predefined, ...fromDb.map((r) => r.location)])];
    return merged.sort((a, b) => a.localeCompare(b));
  }

  async mine(userId: string, query: MineRequestsQueryDto) {
    const { page, limit, skip } = parsePagination(query.page, query.limit);
    const where: Record<string, unknown> = { userId };
    if (query.active !== undefined) where.active = query.active;

    if (query.scope === 'open') {
      where.active = true;
      where.status = { not: RequestStatus.CERRADA };
      where.OR = [{ pausedAt: { not: null } }, { lastBuyerActivityAt: { gte: archiveCutoff() } }];
    } else if (query.scope === 'closed') {
      where.active = true;
      where.status = RequestStatus.CERRADA;
    } else if (query.scope === 'archived') {
      where.active = true;
      where.status = { not: RequestStatus.CERRADA };
      where.pausedAt = null;
      where.lastBuyerActivityAt = { lt: archiveCutoff() };
    }

    const [items, total] = await Promise.all([
      this.prisma.request.findMany({
        where,
        skip,
        take: limit,
        orderBy: { lastBuyerActivityAt: 'desc' },
        include: {
          user: { select: REQUEST_BUYER_SELECT },
          offers: {
            select: {
              id: true,
              status: true,
              sellerId: true,
              price: true,
              dealCompletedAt: true,
              negotiationEndedAt: true,
              chat: { select: { id: true } },
            },
          },
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
      include: {
        offers: {
          select: {
            id: true,
            status: true,
            dealCompletedAt: true,
            negotiationEndedAt: true,
          },
        },
      },
    });
    if (!req || !req.active) throw new NotFoundException('Solicitud no encontrada');
    if (req.userId !== userId) throw new ForbiddenException();
    if (req.status === RequestStatus.CERRADA) {
      throw new BadRequestException('No podés editar una solicitud cerrada');
    }
    if (req.status === RequestStatus.NEGOCIANDO) {
      throw new BadRequestException('No podés editar una solicitud en negociación');
    }

    const hasActiveNegotiation = req.offers.some(
      (o) =>
        o.status === OfferStatus.ACEPTADA &&
        o.dealCompletedAt == null &&
        o.negotiationEndedAt == null,
    );
    if (hasActiveNegotiation) {
      throw new BadRequestException('No podés editar una solicitud con una negociación activa');
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

    if (dto.imageUrls !== undefined) {
      validateImageUrls(dto.imageUrls);
      assertOwnedImageUrls(dto.imageUrls, userId, req.imageUrls);
    }
    if (dto.requirements !== undefined) assertCleanPublicText(dto.requirements, 'los requisitos');
    if (dto.title !== undefined) assertCleanPublicText(dto.title, 'el título');
    if (dto.requirements !== undefined || dto.title !== undefined) {
      await assertNoDuplicateRequest(
        this.prisma,
        userId,
        dto.requirements ?? req.requirements,
        dto.title ?? req.title,
        id,
      );
    }
    if (dto.budget !== undefined) {
      const currency = dto.currency ?? req.currency;
      const isRent = (dto.operation ?? req.operation) === 'ALQUILER' || (dto.budgetPeriod ?? req.budgetPeriod) != null;
      assertValidMoneyAmount(dto.budget, currency, 'presupuesto', isRent);
    }

    const location = dto.location ?? req.location;
    let nextState = req.state;
    let clearIncompatibleZone = false;
    if (dto.location !== undefined) {
      if (user.country === Country.US) {
        if (!isValidUsAreaLocation(dto.location)) {
          throw new BadRequestException('Ciudad no válida');
        }
      } else {
        const allowedCities = citiesForCountry(user.country);
        if (!allowedCities.includes(dto.location)) {
          throw new BadRequestException('Ciudad no válida para tu país');
        }
      }
    }
    if (user.country === Country.US) {
      const parsed = parseUsAreaLocation(location);
      nextState = parsed?.state ?? null;
      if (dto.zone !== undefined) {
        const zoneValue = dto.zone.trim() || null;
        if (parsed && zoneValue && !isValidUsRequestArea(parsed.state, parsed.area, zoneValue)) {
          throw new BadRequestException('Zona no válida para la ciudad seleccionada');
        }
      } else if (dto.location !== undefined && req.zone && parsed && !isValidUsRequestArea(parsed.state, parsed.area, req.zone)) {
        clearIncompatibleZone = true;
      }
    }

    if (req.category === RequestCategory.AUTOS) {
      const carBrand = dto.carBrand ?? req.carBrand;
      const carModel = dto.carModel ?? req.carModel;
      const carColor = dto.carColor ?? req.carColor;
      const carYearMin = dto.carYearMin ?? req.carYearMin;
      const carCondition = dto.carCondition !== undefined ? dto.carCondition : req.carCondition;
      const maxMileage = dto.maxMileage !== undefined ? dto.maxMileage : req.maxMileage;
      const zone = dto.zone ?? req.zone;
      const usAuto = user.country === Country.US;

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
        if (dto.carYearMin !== undefined && !isValidCarYear(dto.carYearMin)) {
          throw new BadRequestException('Año no válido');
        }
        if (
          (dto.carCondition !== undefined || dto.maxMileage !== undefined) &&
          !isValidAutoMileagePreference(carCondition, maxMileage)
        ) {
          throw new BadRequestException('Preferencia de millaje no válida');
        }
        if (dto.maxMileage !== undefined && dto.maxMileage != null && !isValidMileageValue(dto.maxMileage)) {
          throw new BadRequestException('Millaje no válido');
        }
        if (!usAuto && dto.zone !== undefined) {
          const autoZones = zonesForCountryAndCity(user.country, location);
          if (!autoZones.includes(dto.zone)) {
            throw new BadRequestException('Zona no válida para tu país y ciudad');
          }
        }
      }

      if (!carBrand || !carModel || !carColor || carYearMin == null) {
        throw new BadRequestException('Datos de auto incompletos');
      }
      if (!usAuto && !zone) {
        throw new BadRequestException('Datos de auto incompletos');
      }
    } else if (req.category === RequestCategory.INMOBILIARIA) {
      const zone = dto.zone ?? req.zone;
      const bedrooms = dto.bedrooms ?? req.bedrooms;
      const minSqm = dto.minSqm !== undefined ? dto.minSqm : req.minSqm;
      const maxSqm = dto.maxSqm !== undefined ? dto.maxSqm : req.maxSqm;

      if (!hasPending) {
        if (dto.zone !== undefined) {
          if (user.country !== Country.US) {
            const allowedZones = zonesForCountryAndCity(user.country, location);
            if (!allowedZones.includes(dto.zone)) {
              throw new BadRequestException('Zona no válida para tu país y ciudad');
            }
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
        if (dto.carBrand || dto.carModel || dto.carColor || dto.carYearMin != null || dto.carCondition != null || dto.maxMileage != null) {
          throw new BadRequestException('Los campos de auto solo aplican a solicitudes de autos');
        }
      }

      if (bedrooms == null) {
        throw new BadRequestException('Datos de inmueble incompletos');
      }
      if (user.country !== Country.US && !zone) {
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

    await this.prisma.request.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title } : {}),
        ...(dto.requirements !== undefined ? { requirements: dto.requirements } : {}),
        ...(dto.budget !== undefined ? { budget: dto.budget } : {}),
        ...(dto.budgetPeriod !== undefined ? { budgetPeriod: dto.budgetPeriod } : {}),
        ...(dto.negotiable !== undefined ? { negotiable: dto.negotiable } : {}),
        ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
        ...(dto.location !== undefined ? { location: dto.location } : {}),
        ...(user.country === Country.US && (dto.location !== undefined || dto.zone !== undefined)
          ? { state: nextState }
          : {}),
        ...(dto.zone !== undefined ? { zone: dto.zone.trim() ? dto.zone.trim() : null } : {}),
        ...(clearIncompatibleZone ? { zone: null } : {}),
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
        ...(dto.carYearMin !== undefined ? { carYearMin: dto.carYearMin } : {}),
        ...(dto.carCondition !== undefined
          ? {
              carCondition: dto.carCondition === CarCondition.NEW ? CarCondition.NEW : null,
              ...(dto.carCondition === CarCondition.NEW ? { maxMileage: null } : {}),
            }
          : {}),
        ...(dto.maxMileage !== undefined
          ? {
              maxMileage: dto.maxMileage,
              ...(dto.maxMileage != null ? { carCondition: null } : {}),
            }
          : {}),
        lastBuyerActivityAt: new Date(),
        lastActivityAt: new Date(),
      },
    });

    if (dto.imageUrls !== undefined) {
      await this.storageObjects.deleteRemovedBestEffort(req.imageUrls, dto.imageUrls, userId);
    }

    return this.formatRequest(await this.findByIdRaw(id));
  }

  async getOne(
    id: string,
    viewer?: {
      id: string;
      country: Country;
      role: UserRole;
      sellerCategory?: RequestCategory | null;
    },
  ) {
    const req = await this.findByIdRaw(id);
    if (!req || !req.active) throw new NotFoundException('Solicitud no encontrada');

    // Oculta por moderación: deja de ser visible para vendedores (sigue visible para el dueño,
    // que accede por su propio listado, no por este endpoint de vendedor).
    if (viewer && req.hiddenByModeration && req.userId !== viewer.id) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    // Cerradas, pausadas, archivadas y pendientes: no visibles para vendedores (salvo si las guardó)
    if (viewer && !isVisibleToSellers(toLifecycleInput(req))) {
      const saved = await this.prisma.savedRequest.findUnique({
        where: { sellerId_requestId: { sellerId: viewer.id, requestId: id } },
      });
      if (!saved) throw new NotFoundException('Solicitud no encontrada');
    }

    if (viewer && viewer.role !== UserRole.BUYER && req.country !== viewer.country) {
      throw new NotFoundException('Solicitud no encontrada');
    }
    if (
      viewer &&
      viewer.sellerCategory &&
      req.category !== viewer.sellerCategory
    ) {
      throw new NotFoundException('Solicitud no encontrada');
    }
    if (viewer && req.userId === viewer.id) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    const formatted = this.formatRequest(req)!;
    if (viewer && isSellerCapable(viewer.role)) {
      const rating = await this.ratings.getStatsForUsers([req.userId]);
      const withUser = {
        ...formatted,
        user: {
          ...req.user,
          rating: rating[req.userId] ?? { avgStars: null, reviewCount: 0, noResponseCount: 0 },
        },
      };
      const [enriched] = await this.attachSellerMeta([withUser], viewer.id);
      return enriched;
    }

    return formatted;
  }

  /** Cierre manual del comprador: deja de aceptar ofertas, visible en su historial. */
  async close(userId: string, id: string) {
    const req = await this.prisma.request.findUnique({ where: { id } });
    if (!req || !req.active) throw new NotFoundException('Solicitud no encontrada');
    if (req.userId !== userId) throw new ForbiddenException();
    if (req.status === RequestStatus.CERRADA) {
      return this.formatRequest(await this.findByIdRaw(id));
    }

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.offer.updateMany({
        where: {
          requestId: id,
          status: OfferStatus.ACEPTADA,
          dealCompletedAt: null,
          negotiationEndedAt: null,
        },
        data: {
          negotiationEndedAt: now,
          negotiationEndedBy: NegotiationEndedBy.BUYER,
        },
      });
      await tx.request.update({
        where: { id },
        data: {
          status: RequestStatus.CERRADA,
          closedAt: now,
          lastBuyerActivityAt: now,
          lastActivityAt: now,
          pausedAt: null,
        },
      });
    });

    const buyer = await this.prisma.user.findUnique({ where: { id: userId }, select: { locale: true } });
    if (buyer) {
      try {
        await this.notifications.notifyRequestClosed(userId, buyer.locale, id, req.title);
      } catch (err) {
        this.logger.error(
          `Post-commit REQUEST_CLOSED notification failed requestId=${id} userId=${userId}`,
          err instanceof Error ? err.stack : err,
        );
      }
    }

    return this.formatRequest(await this.findByIdRaw(id));
  }

  /** "Seguir buscando": renueva actividad del comprador y reabre Activa/Negociando. */
  async renew(userId: string, id: string) {
    const req = await this.prisma.request.findUnique({ where: { id } });
    if (!req || !req.active) throw new NotFoundException('Solicitud no encontrada');
    if (req.userId !== userId) throw new ForbiddenException();
    if (req.status === RequestStatus.CERRADA) {
      throw new BadRequestException('La solicitud está cerrada');
    }

    const now = new Date();
    await this.prisma.request.update({
      where: { id },
      data: { lastBuyerActivityAt: now, lastActivityAt: now, pausedAt: null },
    });
    return this.formatRequest(await this.findByIdRaw(id));
  }

  /** Pausar búsqueda: oculta a vendedores sin archivar ni alterar actividad. */
  async pause(userId: string, id: string) {
    const req = await this.prisma.request.findUnique({ where: { id } });
    if (!req || !req.active) throw new NotFoundException('Solicitud no encontrada');
    if (req.userId !== userId) throw new ForbiddenException();
    if (req.status === RequestStatus.CERRADA) {
      throw new BadRequestException('La solicitud está cerrada');
    }

    if (!req.pausedAt) {
      await this.prisma.request.update({
        where: { id },
        data: { pausedAt: new Date() },
      });
    }
    return this.formatRequest(await this.findByIdRaw(id));
  }

  async remove(userId: string, id: string) {
    const req = await this.prisma.request.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Solicitud no encontrada');
    if (req.userId !== userId) throw new ForbiddenException();

    const activeNegotiations = await this.prisma.offer.count({
      where: {
        requestId: id,
        status: OfferStatus.ACEPTADA,
        dealCompletedAt: null,
        negotiationEndedAt: null,
      },
    });
    if (activeNegotiations > 0 && req.status !== RequestStatus.CERRADA) {
      throw new ConflictException({
        message: REQUEST_HAS_ACTIVE_NEGOTIATIONS_MESSAGE,
        code: REQUEST_HAS_ACTIVE_NEGOTIATIONS_CODE,
      });
    }

    await this.prisma.request.update({
      where: { id },
      data: { active: false },
    });
    return { ok: true };
  }
}
