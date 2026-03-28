// src/consultations/consultations.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService }          from '../../prisma/prisma.service';
import { CreateConsultationDto }  from './dto/create-consultation.dto';
import { UpdateConsultationDto }  from './dto/update-consultation.dto';

@Injectable()
export class ConsultationsService {
  constructor(private prisma: PrismaService) {}

  // ── Today's appointments queue for the doctor ──────────────────────────────
  // Used to populate the patient list on the left panel of the consultations page
  async getTodaysQueue(doctorId: string, clinicId: string) {
    const now        = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd   = new Date(todayStart.getTime() + 86_400_000);

    return this.prisma.appointment.findMany({
      where: {
        clinicId,
        doctorId,
        date:   { gte: todayStart, lt: todayEnd },
        status: { in: ['confirmed', 'checked_in', 'in_progress', 'pending'] },
      },
      include: {
        patient:      { select: { id: true, name: true, dob: true, phone: true, bloodGroup: true, allergies: true } },
        service:      { select: { id: true, name: true } },
        consultation: true,   // to know if consultation already exists
      },
      orderBy: { time: 'asc' },
    });
  }

  // ── All consultations by this doctor (paginated) ───────────────────────────
  async findAll(doctorId: string, clinicId: string, page = 1, limit = 20) {
    const skip  = (page - 1) * limit;
    const where = { clinicId, doctorId };

    const [consultations, total] = await Promise.all([
      this.prisma.consultation.findMany({
        where,
        include: {
          patient: { select: { id: true, name: true, dob: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.consultation.count({ where }),
    ]);

    return { consultations, total, page, totalPages: Math.ceil(total / limit) };
  }

  // ── Consultation history for a specific patient ────────────────────────────
  async findByPatient(patientId: string, doctorId: string, clinicId: string) {
    return this.prisma.consultation.findMany({
      where:   { patientId, doctorId, clinicId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Single consultation ────────────────────────────────────────────────────
  async findOne(id: string, user: { id: string; clinicId: string }) {
    const c = await this.prisma.consultation.findUnique({
      where:   { id },
      include: {
        patient:     { select: { id: true, name: true, dob: true, phone: true } },
        appointment: { select: { id: true, date: true, time: true, service: { select: { name: true } } } },
      },
    });
    if (!c)                        throw new NotFoundException('Consultation not found');
    if (c.clinicId !== user.clinicId) throw new NotFoundException('Consultation not found');
    if (c.doctorId !== user.id)       throw new ForbiddenException('Access denied');
    return c;
  }

  // ── Create ─────────────────────────────────────────────────────────────────
  async create(dto: CreateConsultationDto, user: { id: string; clinicId: string }) {
    // Verify appointment exists and belongs to this doctor + clinic
    const appt = await this.prisma.appointment.findUnique({
      where: { id: dto.appointmentId },
    });
    if (!appt || appt.clinicId !== user.clinicId) {
      throw new NotFoundException('Appointment not found');
    }
    if (appt.doctorId !== user.id) {
      throw new ForbiddenException('This appointment is not assigned to you');
    }

    // Prevent duplicate consultation for the same appointment
    const existing = await this.prisma.consultation.findUnique({
      where: { appointmentId: dto.appointmentId },
    });
    if (existing) {
      throw new BadRequestException(
        'A consultation already exists for this appointment. Use PUT to update it.',
      );
    }

    // Flatten vitals into top-level fields (schema stores them as separate columns)
    const vitals = dto.vitals ?? {};

    const consultation = await this.prisma.consultation.create({
      data: {
        clinicId:       user.clinicId,
        patientId:      dto.patientId,
        doctorId:       user.id,
        appointmentId:  dto.appointmentId,
        chiefComplaint: dto.chiefComplaint,
        symptoms:       dto.symptoms       ?? [],
        examination:    dto.examination    ?? undefined,
        diagnosis:      dto.diagnosis      ?? undefined,
        treatment:      dto.treatment      ?? undefined,
        notes:          dto.notes          ?? undefined,
        bp:             vitals.bp          ?? undefined,
        pulse:          vitals.pulse       ?? undefined,
        temperature:    vitals.temperature ?? undefined,
        weight:         vitals.weight      ?? undefined,
        height:         vitals.height      ?? undefined,
        followUpDate:   dto.followUpDate ? new Date(dto.followUpDate) : undefined,
      },
      include: {
        patient: { select: { id: true, name: true, dob: true } },
      },
    });

    // Update appointment status to 'completed' automatically
    await this.prisma.appointment.update({
      where: { id: dto.appointmentId },
      data:  { status: 'completed', clinicalNotes: dto.diagnosis ?? undefined },
    });

    return consultation;
  }

  // ── Update ─────────────────────────────────────────────────────────────────
  async update(id: string, dto: UpdateConsultationDto, user: { id: string; clinicId: string }) {
    const c = await this.prisma.consultation.findUnique({ where: { id } });
    if (!c)                        throw new NotFoundException('Consultation not found');
    if (c.clinicId !== user.clinicId) throw new NotFoundException('Consultation not found');
    if (c.doctorId !== user.id)       throw new ForbiddenException('Access denied');

    const vitals = dto.vitals ?? {};

    return this.prisma.consultation.update({
      where: { id },
      data:  {
        chiefComplaint: dto.chiefComplaint ?? undefined,
        symptoms:       dto.symptoms       ?? undefined,
        examination:    dto.examination    ?? undefined,
        diagnosis:      dto.diagnosis      ?? undefined,
        treatment:      dto.treatment      ?? undefined,
        notes:          dto.notes          ?? undefined,
        bp:             vitals.bp          ?? undefined,
        pulse:          vitals.pulse       ?? undefined,
        temperature:    vitals.temperature ?? undefined,
        weight:         vitals.weight      ?? undefined,
        height:         vitals.height      ?? undefined,
        followUpDate:   dto.followUpDate ? new Date(dto.followUpDate) : undefined,
      },
      include: {
        patient: { select: { id: true, name: true } },
      },
    });
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async remove(id: string, user: { id: string; clinicId: string }) {
    const c = await this.prisma.consultation.findUnique({ where: { id } });
    if (!c)                        throw new NotFoundException('Consultation not found');
    if (c.clinicId !== user.clinicId) throw new NotFoundException('Consultation not found');
    if (c.doctorId !== user.id)       throw new ForbiddenException('Access denied');
    return this.prisma.consultation.delete({ where: { id } });
  }
}