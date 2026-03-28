// src/services/services.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServicesService {
  constructor(private prisma: PrismaService) {}

  // ── List — public or internal, filtered by clinicId ───────────────────────
  async findAll(
    clinicId: string,
    opts: { activeOnly?: boolean; category?: string; search?: string } = {},
  ) {
    const where: any = { clinicId };
    if (opts.activeOnly) where.isActive = true;
    if (opts.category)   where.category = opts.category;
    if (opts.search) {
      where.OR = [
        { name:        { contains: opts.search, mode: 'insensitive' } },
        { description: { contains: opts.search, mode: 'insensitive' } },
        { category:    { contains: opts.search, mode: 'insensitive' } },
      ];
    }

    const services = await this.prisma.service.findMany({
      where,
      orderBy: [{ popular: 'desc' }, { name: 'asc' }],
    });

    return { services, total: services.length };
  }

  // ── Single ─────────────────────────────────────────────────────────────────
  async findOne(id: string, clinicId: string) {
    const service = await this.prisma.service.findUnique({ where: { id } });
    if (!service || service.clinicId !== clinicId)
      throw new NotFoundException('Service not found');
    return service;
  }

  // ── Create ─────────────────────────────────────────────────────────────────
  async create(dto: CreateServiceDto, clinicId: string) {
    return this.prisma.service.create({
      data: {
        ...dto,
        clinicId,
        popular:  dto.popular  ?? false,
        isActive: dto.isActive ?? true,
      },
    });
  }

  // ── Update ─────────────────────────────────────────────────────────────────
  async update(id: string, dto: UpdateServiceDto, clinicId: string) {
    await this.findOne(id, clinicId); // verify ownership
    return this.prisma.service.update({ where: { id }, data: dto });
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async remove(id: string, clinicId: string) {
    await this.findOne(id, clinicId); // verify ownership
    return this.prisma.service.delete({ where: { id } });
  }
}
