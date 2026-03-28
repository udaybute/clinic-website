// src/lab/lab.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService }       from '../../prisma/prisma.service';
import { CreateLabRequestDto } from './dto/lab.dto';
import { UpdateLabResultDto }  from './dto/lab.dto';

@Injectable()
export class LabService {
  constructor(private prisma: PrismaService) {}

  // ── List lab requests — doctor sees only their own, with pagination ────────
  async findAll(
    user:  { id: string; clinicId: string },
    opts: {
      search?:  string;
      status?:  string;
      page?:    number;
      limit?:   number;
    } = {},
  ) {
    const { search, status, page = 1, limit = 20 } = opts;
    const skip = (page - 1) * limit;

    const where: any = {
      clinicId: user.clinicId,
      doctorId: user.id,        // doctors see only their own requests
    };

    if (status && status !== 'all') where.status = status;

    if (search?.trim()) {
      where.OR = [
        { testName:  { contains: search, mode: 'insensitive' } },
        { patient:   { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [labRequests, total] = await Promise.all([
      this.prisma.labRequest.findMany({
        where,
        include: {
          patient: { select: { id: true, name: true, phone: true, dob: true } },
          doctor:  { select: { id: true, name: true } },
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.labRequest.count({ where }),
    ]);

    // Status counts for filter tabs
    const statusList = ['pending', 'in_progress', 'completed'];
    const counts = await Promise.all(
      statusList.map(s =>
        this.prisma.labRequest.count({
          where: { clinicId: user.clinicId, doctorId: user.id, status: s },
        }),
      ),
    );
    const statusCounts = statusList.reduce(
      (acc, s, i) => ({ ...acc, [s]: counts[i] }),
      { all: total } as Record<string, number>,
    );

    return {
      labRequests,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      statusCounts,
    };
  }

  // ── Lab requests for a specific patient ───────────────────────────────────
  async findByPatient(patientId: string, user: { id: string; clinicId: string }) {
    return this.prisma.labRequest.findMany({
      where:   { patientId, clinicId: user.clinicId, doctorId: user.id },
      include: { patient: { select: { id: true, name: true } } },
      orderBy: { date: 'desc' },
    });
  }

  // ── Single lab request ────────────────────────────────────────────────────
  async findOne(id: string, user: { id: string; clinicId: string }) {
    const lab = await this.prisma.labRequest.findUnique({
      where:   { id },
      include: {
        patient: { select: { id: true, name: true, dob: true, phone: true } },
        doctor:  { select: { id: true, name: true } },
      },
    });

    if (!lab)                        throw new NotFoundException('Lab request not found');
    if (lab.clinicId !== user.clinicId) throw new NotFoundException('Lab request not found');
    if (lab.doctorId !== user.id)       throw new ForbiddenException('Access denied');

    return lab;
  }

  // ── Create / Request new lab test ─────────────────────────────────────────
  async create(dto: CreateLabRequestDto, user: { id: string; clinicId: string }) {
    // Verify patient belongs to same clinic
    const patient = await this.prisma.patient.findUnique({
      where: { id: dto.patientId },
    });
    if (!patient || patient.clinicId !== user.clinicId) {
      throw new NotFoundException('Patient not found');
    }

    return this.prisma.labRequest.create({
      data: {
        clinicId:    user.clinicId,
        patientId:   dto.patientId,
        doctorId:    user.id,
        testName:    dto.testName,
        normalRange: dto.normalRange   ?? undefined,
        doctorNotes: dto.doctorNotes   ?? undefined,
        status:      'pending',
      },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        doctor:  { select: { id: true, name: true } },
      },
    });
  }

  // ── Update result / status ────────────────────────────────────────────────
  async update(
    id:   string,
    dto:  UpdateLabResultDto,
    user: { id: string; clinicId: string },
  ) {
    const lab = await this.prisma.labRequest.findUnique({ where: { id } });

    if (!lab)                        throw new NotFoundException('Lab request not found');
    if (lab.clinicId !== user.clinicId) throw new NotFoundException('Lab request not found');
    if (lab.doctorId !== user.id)       throw new ForbiddenException('Access denied');

    const updateData: any = {};
    if (dto.status      !== undefined) updateData.status      = dto.status;
    if (dto.result      !== undefined) updateData.result      = dto.result;
    if (dto.normalRange !== undefined) updateData.normalRange = dto.normalRange;
    if (dto.notes       !== undefined) updateData.doctorNotes = dto.notes;  // maps to doctorNotes

    // Auto-complete when result is entered
    if (dto.result && !dto.status) updateData.status = 'completed';

    return this.prisma.labRequest.update({
      where:   { id },
      data:    updateData,
      include: {
        patient: { select: { id: true, name: true } },
      },
    });
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async remove(id: string, user: { id: string; clinicId: string }) {
    const lab = await this.prisma.labRequest.findUnique({ where: { id } });

    if (!lab)                        throw new NotFoundException('Lab request not found');
    if (lab.clinicId !== user.clinicId) throw new NotFoundException('Lab request not found');
    if (lab.doctorId !== user.id)       throw new ForbiddenException('Access denied');

    // Only allow deletion of pending requests
    if (lab.status !== 'pending') {
      throw new ForbiddenException(
        'Only pending lab requests can be deleted. Completed results must be retained.',
      );
    }

    return this.prisma.labRequest.delete({ where: { id } });
  }

  // ── Stats summary for the dashboard panel ─────────────────────────────────
  async getSummary(user: { id: string; clinicId: string }) {
    const where = { clinicId: user.clinicId, doctorId: user.id };

    const [total, pending, inProgress, completed] = await Promise.all([
      this.prisma.labRequest.count({ where }),
      this.prisma.labRequest.count({ where: { ...where, status: 'pending'     } }),
      this.prisma.labRequest.count({ where: { ...where, status: 'in_progress' } }),
      this.prisma.labRequest.count({ where: { ...where, status: 'completed'   } }),
    ]);

    return { total, pending, inProgress, completed };
  }
}