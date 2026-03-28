// src/booking/booking.service.ts
// Handles all public-facing booking operations.
// No clinicId from JWT — uses the first active clinic (single-clinic mode).

import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BookingService {
  constructor(private prisma: PrismaService) {}

  // ── Helper: get the default clinic ───────────────────────────────────────
  private async getDefaultClinic() {
    const clinic = await this.prisma.clinic.findFirst({
      orderBy: { createdAt: 'asc' },
    });
    if (!clinic) throw new BadRequestException('No clinic configured');
    return clinic;
  }

  // ── GET /api/booking/services ─────────────────────────────────────────────
  async getServices() {
    const clinic = await this.getDefaultClinic();
    return this.prisma.service.findMany({
      where:   { clinicId: clinic.id, isActive: true },
      select:  {
        id:          true,
        name:        true,
        description: true,
        duration:    true,
        price:       true,
        category:    true,
        popular:     true,
        icon:        true,
      },
      orderBy: { popular: 'desc' },
    });
  }

  // ── GET /api/booking/doctors ──────────────────────────────────────────────
  async getDoctors() {
    const clinic = await this.getDefaultClinic();
    return this.prisma.user.findMany({
      where:   { clinicId: clinic.id, role: 'doctor', isActive: true },
      select:  {
        id:              true,
        name:            true,
        specialty:       true,
        avatar:          true,
        experience:      true,
        qualifications:  true,
        consultationFee: true,
        availability:    true,
      },
      orderBy: { name: 'asc' },
    });
  }

  // ── POST /api/booking/patient ─────────────────────────────────────────────
  async findOrCreatePatient(data: {
    name:   string;
    email?: string;
    phone:  string;
    notes?: string;
  }) {
    const clinic = await this.getDefaultClinic();

    const existing = await this.prisma.patient.findFirst({
      where:  { clinicId: clinic.id, phone: data.phone.trim() },
      select: { id: true, name: true, email: true, phone: true },
    });
    if (existing) return existing;

    return this.prisma.patient.create({
      data: {
        clinicId:    clinic.id,
        name:        data.name.trim(),
        email:       data.email?.trim() || undefined,
        phone:       data.phone.trim(),
        totalVisits: 0,
      },
      select: { id: true, name: true, email: true, phone: true },
    });
  }

  // ── POST /api/booking/appointment ─────────────────────────────────────────
  async createAppointment(data: {
    patientId:  string;
    doctorId:   string;
    serviceId?: string;
    date:       string;   // "YYYY-MM-DD"
    time:       string;   // "09:00"
    notes?:     string;
  }) {
    const clinic = await this.getDefaultClinic();

    // ── FIX: Validate serviceId actually exists in THIS clinic's services ────
    // The frontend may send a fallback static ID like "1" or "2" if the
    // backend returned no services (e.g. services table is empty).
    // Passing a non-existent serviceId causes P2003 foreign key violation.
    let validatedServiceId: string | undefined = undefined;
    let amount = 0;

    if (data.serviceId) {
      const service = await this.prisma.service.findFirst({
        where: {
          id:       data.serviceId,
          clinicId: clinic.id,    // must belong to THIS clinic
          isActive: true,
        },
        select: { id: true, price: true },
      });

      if (service) {
        // Service exists in DB — safe to use
        validatedServiceId = service.id;
        amount             = service.price ?? 0;
      }
      // If service doesn't exist (fake fallback ID), silently drop it.
      // Appointment will be created without a serviceId — still valid.
    }

    // ── FIX: Validate doctorId exists in THIS clinic ──────────────────────
    const doctor = await this.prisma.user.findFirst({
      where: {
        id:       data.doctorId,
        clinicId: clinic.id,
        role:     'doctor',
        isActive: true,
      },
      select: { id: true },
    });

    if (!doctor) {
      throw new BadRequestException(
        'Selected doctor not found. Please go back and choose a doctor.',
      );
    }

    // ── FIX: Validate patientId exists ────────────────────────────────────
    const patient = await this.prisma.patient.findFirst({
      where: { id: data.patientId, clinicId: clinic.id },
      select: { id: true },
    });

    if (!patient) {
      throw new BadRequestException(
        'Patient record not found. Please go back and re-enter your details.',
      );
    }

    // ── Double-booking check ──────────────────────────────────────────────
    const conflict = await this.prisma.appointment.findFirst({
      where: {
        clinicId: clinic.id,
        doctorId: data.doctorId,
        date:     new Date(data.date + 'T00:00:00'),
        time:     data.time,
        status:   { notIn: ['cancelled', 'no_show'] },
      },
    });
    if (conflict) {
      throw new BadRequestException(
        'This time slot is already booked. Please choose a different time.',
      );
    }

    // ── Create appointment ────────────────────────────────────────────────
    return this.prisma.appointment.create({
      data: {
        clinicId:  clinic.id,
        patientId: data.patientId,
        doctorId:  data.doctorId,
        serviceId: validatedServiceId,   // undefined if fallback/invalid — no FK violation
        date:      new Date(data.date + 'T00:00:00'),
        time:      data.time,
        duration:  30,
        amount,
        notes:     data.notes ?? undefined,
        status:    'pending',
      },
      include: {
        patient: { select: { id: true, name: true, email: true, phone: true } },
        doctor:  { select: { id: true, name: true, specialty: true } },
        service: { select: { id: true, name: true } },
      },
    });
  }
}