// src/checkin/checkin.service.ts
//
// Built entirely on the existing Appointment model — no new DB table needed.
// Uses the AppStatus enum: pending → confirmed → checked_in → in_progress → completed
//
// CHECK-IN FLOW:
//   confirmed  →  checked_in  (patient arrives)
//   checked_in →  in_progress (doctor calls patient)
//   in_progress → completed   (consultation done)
//
// WALK-IN FLOW:
//   Creates a new appointment with status = checked_in directly

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// ── Valid forward-only transitions for this module ────────────────────────────
const CHECKIN_TRANSITIONS: Record<string, string[]> = {
  confirmed:   ['checked_in', 'cancelled'],
  checked_in:  ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
};

// ── Appointment include shape reused across queries ───────────────────────────
const QUEUE_INCLUDE = {
  patient: { select: { id: true, name: true, phone: true, dob: true, bloodGroup: true, allergies: true } },
  doctor:  { select: { id: true, name: true, specialty: true } },
  service: { select: { id: true, name: true } },
} as const;

@Injectable()
export class CheckinService {
  constructor(private prisma: PrismaService) {}

  // ── Today's full queue — all active statuses ──────────────────────────────
  async getTodaysQueue(clinicId: string, doctorId?: string) {
    const now        = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd   = new Date(todayStart.getTime() + 86_400_000);

    const where: any = {
      clinicId,
      date:   { gte: todayStart, lt: todayEnd },
      status: { in: ['confirmed', 'checked_in', 'in_progress', 'pending'] },
    };
    if (doctorId) where.doctorId = doctorId;

    const appointments = await this.prisma.appointment.findMany({
      where,
      include: QUEUE_INCLUDE,
      orderBy: [{ status: 'asc' }, { time: 'asc' }],
    });

    // Summary counts
    const summary = {
      total:      appointments.length,
      pending:    appointments.filter(a => a.status === 'pending').length,
      confirmed:  appointments.filter(a => a.status === 'confirmed').length,
      checkedIn:  appointments.filter(a => a.status === 'checked_in').length,
      inProgress: appointments.filter(a => a.status === 'in_progress').length,
    };

    // Estimate wait: each in_progress slot ~30 min, then 15 min per checked_in ahead
    const checked = appointments.filter(a => a.status === 'checked_in');
    const withWait = appointments.map(appt => {
      let estimatedWait: number | null = null;
      if (appt.status === 'checked_in') {
        const pos = checked.indexOf(appt as any);
        estimatedWait = pos * 20; // 20 min per patient ahead
      }
      return { ...appt, estimatedWait };
    });

    return { queue: withWait, summary };
  }

  // ── Waitlist — checked_in patients sorted by time ─────────────────────────
  async getWaitlist(clinicId: string) {
    const now        = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd   = new Date(todayStart.getTime() + 86_400_000);

    const waitlist = await this.prisma.appointment.findMany({
      where: {
        clinicId,
        date:   { gte: todayStart, lt: todayEnd },
        status: 'checked_in',
      },
      include: QUEUE_INCLUDE,
      orderBy: { time: 'asc' },
    });

    return waitlist.map((appt, index) => ({
      ...appt,
      position:      index + 1,
      estimatedWait: index * 20, // minutes
    }));
  }

  // ── Check-in an existing appointment ─────────────────────────────────────
  async checkIn(appointmentId: string, clinicId: string, notes?: string) {
    const appt = await this.prisma.appointment.findUnique({
      where:   { id: appointmentId },
      include: QUEUE_INCLUDE,
    });

    if (!appt || appt.clinicId !== clinicId) {
      throw new NotFoundException('Appointment not found');
    }

    if (!['confirmed', 'pending'].includes(appt.status)) {
      throw new BadRequestException(
        `Cannot check in an appointment with status "${appt.status}"`,
      );
    }

    return this.prisma.appointment.update({
      where:   { id: appointmentId },
      data:    { status: 'checked_in', notes: notes ?? appt.notes ?? undefined },
      include: QUEUE_INCLUDE,
    });
  }

  // ── Walk-in check-in (no prior appointment) ───────────────────────────────
  async walkIn(
    clinicId: string,
    data: {
      patientId: string;
      doctorId:  string;
      serviceId?: string;
      time:      string;
      amount:    number;
      notes?:    string;
    },
  ) {
    // Verify patient belongs to clinic
    const patient = await this.prisma.patient.findUnique({ where: { id: data.patientId } });
    if (!patient || patient.clinicId !== clinicId) throw new NotFoundException('Patient not found');

    return this.prisma.appointment.create({
      data: {
        clinicId,
        patientId:  data.patientId,
        doctorId:   data.doctorId,
        serviceId:  data.serviceId  ?? undefined,
        date:       new Date(),
        time:       data.time,
        duration:   30,
        amount:     data.amount,
        notes:      data.notes      ?? undefined,
        status:     'checked_in',   // walk-ins go straight to waitlist
      },
      include: QUEUE_INCLUDE,
    });
  }

  // ── Update appointment status (checked_in → in_progress → completed) ──────
  async updateStatus(
    appointmentId: string,
    clinicId:      string,
    newStatus:     string,
    notes?:        string,
  ) {
    const appt = await this.prisma.appointment.findUnique({ where: { id: appointmentId } });
    if (!appt || appt.clinicId !== clinicId) throw new NotFoundException('Appointment not found');

    const allowed = CHECKIN_TRANSITIONS[appt.status] ?? [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot change status from "${appt.status}" to "${newStatus}"`,
      );
    }

    return this.prisma.appointment.update({
      where:   { id: appointmentId },
      data:    {
        status: newStatus as any,
        ...(notes !== undefined && { notes }),
        // Record clinical notes if completing
        ...(newStatus === 'completed' && notes && { clinicalNotes: notes }),
      },
      include: QUEUE_INCLUDE,
    });
  }

  // ── Call next patient (moves first checked_in → in_progress) ─────────────
  async callNext(clinicId: string, doctorId?: string) {
    const now        = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd   = new Date(todayStart.getTime() + 86_400_000);

    const where: any = {
      clinicId,
      date:   { gte: todayStart, lt: todayEnd },
      status: 'checked_in',
    };
    if (doctorId) where.doctorId = doctorId;

    const next = await this.prisma.appointment.findFirst({
      where,
      include: QUEUE_INCLUDE,
      orderBy: { time: 'asc' },
    });

    if (!next) throw new NotFoundException('No patients waiting in the queue');

    return this.prisma.appointment.update({
      where:   { id: next.id },
      data:    { status: 'in_progress' },
      include: QUEUE_INCLUDE,
    });
  }

  // ── Search patients for quick check-in ────────────────────────────────────
  async searchPatients(clinicId: string, q: string) {
    if (!q.trim()) return [];
    return this.prisma.patient.findMany({
      where: {
        clinicId,
        OR: [
          { name:  { contains: q, mode: 'insensitive' } },
          { phone: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, phone: true, dob: true },
      take: 8,
    });
  }

  // ── Today's appointments for a patient (to check them in) ─────────────────
  async getPatientTodayAppointments(patientId: string, clinicId: string) {
    const now        = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd   = new Date(todayStart.getTime() + 86_400_000);

    return this.prisma.appointment.findMany({
      where: {
        patientId,
        clinicId,
        date:   { gte: todayStart, lt: todayEnd },
        status: { in: ['pending', 'confirmed'] },
      },
      include: {
        doctor:  { select: { id: true, name: true } },
        service: { select: { id: true, name: true } },
      },
      orderBy: { time: 'asc' },
    });
  }

  // ── Completed today ────────────────────────────────────────────────────────
  async getCompletedToday(clinicId: string) {
    const now        = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd   = new Date(todayStart.getTime() + 86_400_000);

    return this.prisma.appointment.findMany({
      where: {
        clinicId,
        date:   { gte: todayStart, lt: todayEnd },
        status: 'completed',
      },
      include: QUEUE_INCLUDE,
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });
  }
}
