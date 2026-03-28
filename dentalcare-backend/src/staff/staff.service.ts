// src/staff/staff.service.ts
//
// ⚠️  IMPORTANT — TWO-PHASE SERVICE:
//
//  Phase 1 (RIGHT NOW — before migration):
//    This file works immediately. Doctor-specific fields (experience,
//    qualifications, consultationFee, availability) are commented out.
//    The service compiles and all routes work.
//
//  Phase 2 (AFTER running the migration):
//    Run: npx prisma migrate dev --name add_doctor_fields
//    Then uncomment the DOCTOR FIELDS blocks below.
//    The full doctor profile feature will be available.

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStaffDto, UpdateStaffDto } from './dto/create-staff.dto';
import * as bcrypt from 'bcryptjs';

// ── Fields that exist in the schema RIGHT NOW ─────────────────────────────────
// After running the migration, add the DOCTOR FIELDS block back in.
const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  isActive: true,
  specialty: true,
  avatar: true,
  createdAt: true,
  updatedAt: true,

  // ── DOCTOR FIELDS — uncomment after: npx prisma migrate dev --name add_doctor_fields ──
  // experience:      true,
  // qualifications:  true,
  // consultationFee: true,
  // availability:    true,
} as const;

@Injectable()
export class StaffService {
  constructor(private prisma: PrismaService) {}

  // ── List staff with search + role filter + pagination ─────────────────────
  async findAll(
    clinicId: string,
    opts: {
      role?: string;
      search?: string;
      active?: boolean;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const { role, search, active, page = 1, limit = 20 } = opts;
    const skip = (page - 1) * limit;

    const where: any = { clinicId };
    if (role && role !== 'all') where.role = role;
    if (active !== undefined) where.isActive = active;
    if (search?.trim()) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { specialty: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: { ...USER_SELECT, _count: { select: { appointments: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    const [adminCount, doctorCount, receptionistCount] = await Promise.all([
      this.prisma.user.count({ where: { clinicId, role: 'admin' } }),
      this.prisma.user.count({ where: { clinicId, role: 'doctor' } }),
      this.prisma.user.count({ where: { clinicId, role: 'receptionist' } }),
    ]);

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      counts: {
        all: total,
        admin: adminCount,
        doctor: doctorCount,
        receptionist: receptionistCount,
      },
    };
  }

  // ── Single staff member ────────────────────────────────────────────────────
  async findOne(id: string, clinicId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { ...USER_SELECT, _count: { select: { appointments: true } } },
    });
    if (!user) throw new NotFoundException('Staff member not found');
    return user;
  }

  // ── Create ─────────────────────────────────────────────────────────────────
  async create(dto: CreateStaffDto, clinicId: string) {
    const existing = await this.prisma.user.findFirst({
      where: { email: dto.email },
    });
    if (existing)
      throw new ConflictException(`Email ${dto.email} is already registered`);

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    return this.prisma.user.create({
      data: {
        clinicId,
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
        role: dto.role as any,
        phone: dto.phone || undefined,
        specialty: dto.specialty || undefined,
        isActive: true,

        // ── DOCTOR FIELDS — uncomment after migration ──
        // experience:      dto.experience      ?? undefined,
        // qualifications:  dto.qualifications  || undefined,
        // consultationFee: dto.consultationFee ?? undefined,
        // availability:    dto.availability    ?? [],
      },
      select: USER_SELECT,
    });
  }

  // ── Update ─────────────────────────────────────────────────────────────────
  async update(id: string, clinicId: string, dto: UpdateStaffDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || user.clinicId !== clinicId)
      throw new NotFoundException('Staff member not found');

    if (dto.email && dto.email !== user.email) {
      const conflict = await this.prisma.user.findFirst({
        where: { email: dto.email, NOT: { id } },
      });
      if (conflict)
        throw new ConflictException(`Email ${dto.email} is already in use`);
    }

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.specialty !== undefined) data.specialty = dto.specialty;
    if (dto.password) data.password = await bcrypt.hash(dto.password, 12);

    // ── DOCTOR FIELDS — uncomment after migration ──
    // if (dto.experience      !== undefined) data.experience      = dto.experience;
    // if (dto.qualifications  !== undefined) data.qualifications  = dto.qualifications;
    // if (dto.consultationFee !== undefined) data.consultationFee = dto.consultationFee;
    // if (dto.availability    !== undefined) data.availability    = dto.availability;

    return this.prisma.user.update({
      where: { id },
      data,
      select: USER_SELECT,
    });
  }

  // ── Toggle active ──────────────────────────────────────────────────────────
  async toggleActive(id: string, clinicId: string, isActive: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || user.clinicId !== clinicId)
      throw new NotFoundException('Staff member not found');
    return this.prisma.user.update({
      where: { id },
      data: { isActive },
      select: { id: true, name: true, isActive: true, role: true },
    });
  }

  // ── Delete (deactivates if appointment history exists) ─────────────────────
  async remove(id: string, clinicId: string, requesterId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || user.clinicId !== clinicId)
      throw new NotFoundException('Staff member not found');
    if (id === requesterId)
      throw new BadRequestException('You cannot delete your own account');

    const apptCount = await this.prisma.appointment.count({
      where: { doctorId: id },
    });
    if (apptCount > 0) {
      return this.prisma.user.update({
        where: { id },
        data: { isActive: false },
        select: { id: true, name: true, isActive: true },
      });
    }
    return this.prisma.user.delete({ where: { id } });
  }
}
