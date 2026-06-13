import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, RequestCategory } from '@prisma/client';
import { parseSellerFiltersJson } from '@buyseekk/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSavedSearchDto, UpdateSavedSearchDto } from './saved-searches.dto';

function sanitizeFilters(raw: Record<string, unknown>) {
  const parsed = parseSellerFiltersJson(raw);
  if (!parsed) throw new BadRequestException('Filtros inválidos');
  return parsed as unknown as Prisma.InputJsonValue;
}

@Injectable()
export class SavedSearchesService {
  constructor(private prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.savedSearch.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  async create(userId: string, dto: CreateSavedSearchDto) {
    const filters = sanitizeFilters(dto.filters);
    const existing = await this.prisma.savedSearch.findFirst({
      where: { userId, filters: { equals: filters } },
    });
    if (existing) throw new ConflictException('Ya tenés una búsqueda con estos filtros');

    if (dto.isDefault) {
      await this.prisma.savedSearch.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    try {
      return await this.prisma.savedSearch.create({
        data: {
          userId,
          name: dto.name.trim(),
          category: dto.category ?? null,
          filters,
          isDefault: dto.isDefault ?? false,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Ya existe una búsqueda con ese nombre');
      }
      throw e;
    }
  }

  async update(userId: string, id: string, dto: UpdateSavedSearchDto) {
    const row = await this.prisma.savedSearch.findFirst({ where: { id, userId } });
    if (!row) throw new NotFoundException('Búsqueda no encontrada');

    if (dto.isDefault) {
      await this.prisma.savedSearch.updateMany({
        where: { userId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const filters = dto.filters ? sanitizeFilters(dto.filters) : undefined;

    try {
      return await this.prisma.savedSearch.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          category: dto.category,
          filters,
          isDefault: dto.isDefault,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Ya existe una búsqueda con ese nombre');
      }
      throw e;
    }
  }

  async remove(userId: string, id: string) {
    const row = await this.prisma.savedSearch.findFirst({ where: { id, userId } });
    if (!row) throw new NotFoundException('Búsqueda no encontrada');
    await this.prisma.savedSearch.delete({ where: { id } });
    return { ok: true };
  }

  async setDefault(userId: string, id: string) {
    const row = await this.prisma.savedSearch.findFirst({ where: { id, userId } });
    if (!row) throw new NotFoundException('Búsqueda no encontrada');
    await this.prisma.$transaction([
      this.prisma.savedSearch.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      }),
      this.prisma.savedSearch.update({
        where: { id },
        data: { isDefault: true },
      }),
    ]);
    return this.prisma.savedSearch.findUnique({ where: { id } });
  }
}
