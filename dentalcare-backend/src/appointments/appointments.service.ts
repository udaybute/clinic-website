// src/appointments/appointments.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

// Valid status transitions — prevents nonsensical state changes
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['checked_in', 'cancelled'],
  checked_in: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [], // terminal
  cancelled: [], // terminal
  no_show: [], // terminal
};

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

  // ── List with search + date filter + pagination ────────────────────────────
  async findAll(
    clinicId: string,
    role: string,
    userId: string,
    opts: {
      search?: string;
      status?: string;
      dateRange?: 'today' | 'tomorrow' | 'week' | 'month' | 'all';
      page?: number;
      limit?: number;
    } = {},
  ) {
    const { search, status, dateRange = 'all', page = 1, limit = 25 } = opts;
    const skip = (page - 1) * limit;

    // ── Date range filter ──────────────────────────────────────────────────
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const todayEnd = new Date(todayStart.getTime() + 86_400_000);

    let dateFilter: any = {};
    if (dateRange === 'today') {
      dateFilter = { date: { gte: todayStart, lt: todayEnd } };
    } else if (dateRange === 'tomorrow') {
      const tomorrowStart = new Date(todayStart.getTime() + 86_400_000);
      const tomorrowEnd = new Date(tomorrowStart.getTime() + 86_400_000);
      dateFilter = { date: { gte: tomorrowStart, lt: tomorrowEnd } };
    } else if (dateRange === 'week') {
      const weekEnd = new Date(todayStart.getTime() + 7 * 86_400_000);
      dateFilter = { date: { gte: todayStart, lt: weekEnd } };
    } else if (dateRange === 'month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      dateFilter = { date: { gte: monthStart, lt: monthEnd } };
    }

    // ── Base where ─────────────────────────────────────────────────────────
    const where: any = {
      clinicId,
      ...dateFilter,
    };

    // Doctors only see their own appointments
    if (role === 'doctor') where.doctorId = userId;

    // Status filter
    if (status && status !== 'all') where.status = status;

    // Search — across patient name (requires join; use nested OR)
    if (search?.trim()) {
      where.OR = [
        { patient: { name: { contains: search, mode: 'insensitive' } } },
        { doctor: { name: { contains: search, mode: 'insensitive' } } },
        { service: { name: { contains: search, mode: 'insensitive' } } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [appointments, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        include: {
          patient: { select: { id: true, name: true, phone: true } },
          doctor: { select: { id: true, name: true } },
          service: { select: { id: true, name: true } },
        },
        orderBy: [{ date: 'desc' }, { time: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.appointment.count({ where }),
    ]);

    // ── Status counts for filter tabs (same date/search scope, ignoring status) ──
    const countWhere = { ...where };
    delete countWhere.status;

    const statuses = [
      'pending',
      'confirmed',
      'checked_in',
      'in_progress',
      'completed',
      'cancelled',
      'no_show',
    ];
    const counts = await Promise.all(
      statuses.map((s) =>
        this.prisma.appointment.count({ where: { ...countWhere, status: s } }),
      ),
    );
    const statusCounts = statuses.reduce(
      (acc, s, i) => ({ ...acc, [s]: counts[i] }),
      {} as Record<string, number>,
    );
    statusCounts.all = total;

    return {
      appointments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      statusCounts,
    };
  }

  // ── Single appointment — verify clinic ownership ───────────────────────────
  async findOne(id: string, clinicId: string) {
    const appt = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, name: true, phone: true, email: true } },
        doctor: { select: { id: true, name: true, specialty: true } },
        service: {
          select: { id: true, name: true, duration: true, price: true },
        },
        consultation: true,
        bill: { select: { id: true, total: true, paid: true, status: true } },
      },
    });

    if (!appt) throw new NotFoundException('Appointment not found');
    if (appt.clinicId !== clinicId)
      throw new NotFoundException('Appointment not found');

    return appt;
  }

  // ── Create ─────────────────────────────────────────────────────────────────
  async create(dto: CreateAppointmentDto, clinicId: string) {
    // Check for conflicting appointment (same doctor, same date+time)
    const conflict = await this.prisma.appointment.findFirst({
      where: {
        clinicId,
        doctorId: dto.doctorId,
        date: new Date(dto.date),
        time: dto.time,
        status: { notIn: ['cancelled', 'no_show'] },
      },
    });
    if (conflict) {
      throw new BadRequestException(
        `Dr. has an existing appointment at ${dto.time} on this date`,
      );
    }

    return this.prisma.appointment.create({
      data: {
        clinicId,
        patientId: dto.patientId,
        doctorId: dto.doctorId,
        serviceId: dto.serviceId,
        date: new Date(dto.date),
        time: dto.time,
        duration: dto.duration ?? 30,
        amount: dto.amount,
        notes: dto.notes,
        status: 'pending',
      },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        doctor: { select: { id: true, name: true } },
        service: { select: { id: true, name: true } },
      },
    });
  }

  // ── Update — with status transition validation ────────────────────────────
  async update(
    id: string,
    clinicId: string,
    dto: UpdateAppointmentDto,
    role: string,
  ) {
    const appt = await this.prisma.appointment.findUnique({ where: { id } });
    if (!appt || appt.clinicId !== clinicId)
      throw new NotFoundException('Appointment not found');

    // Validate status transition
    if (dto.status && dto.status !== appt.status) {
      const allowed = VALID_TRANSITIONS[appt.status] ?? [];
      if (!allowed.includes(dto.status)) {
        throw new BadRequestException(
          `Cannot change status from "${appt.status}" to "${dto.status}"`,
        );
      }
    }

    // Build update payload — strip clinicalNotes for non-doctors
    const updateData: any = {};
    if (dto.status) updateData.status = dto.status;
    if (dto.date) updateData.date = new Date(dto.date);
    if (dto.time) updateData.time = dto.time;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.duration !== undefined) updateData.duration = dto.duration;
    if (dto.amount !== undefined) updateData.amount = dto.amount;
    // clinicalNotes — doctors only
    if (dto.clinicalNotes !== undefined && role === 'doctor') {
      updateData.clinicalNotes = dto.clinicalNotes;
    }

    return this.prisma.appointment.update({
      where: { id },
      data: updateData,
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        doctor: { select: { id: true, name: true } },
        service: { select: { id: true, name: true } },
      },
    });
  }

  // ── Cancel / Delete ────────────────────────────────────────────────────────
  async remove(id: string, clinicId: string) {
    const appt = await this.prisma.appointment.findUnique({ where: { id } });
    if (!appt || appt.clinicId !== clinicId)
      throw new NotFoundException('Appointment not found');

    // If appointment has a linked bill, soft-delete by cancelling instead
    const hasBill = await this.prisma.bill.findUnique({
      where: { appointmentId: id },
    });
    if (hasBill) {
      return this.prisma.appointment.update({
        where: { id },
        data: { status: 'cancelled' },
      });
    }

    return this.prisma.appointment.delete({ where: { id } });
  }
}
