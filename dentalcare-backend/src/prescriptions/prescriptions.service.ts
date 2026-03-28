// src/prescriptions/prescriptions.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
// FIXED: 'prisma/prisma.service' → '../../prisma/prisma.service'
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { UpdatePrescriptionDto } from './dto/update-prescription.dto';

@Injectable()
export class PrescriptionsService {
  constructor(private prisma: PrismaService) {}

  // ── List — doctor sees only their own, with pagination ────────────────────
  async findAll(
    user: { id: string; role: string; clinicId: string },
    page = 1,
    limit = 20,
  ) {
    const skip = (page - 1) * limit;
    const where = { clinicId: user.clinicId, doctorId: user.id };

    const [prescriptions, total] = await Promise.all([
      this.prisma.prescription.findMany({
        where,
        include: {
          medicines: true,
          patient: { select: { id: true, name: true, dob: true, phone: true } },
          doctor: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.prescription.count({ where }),
    ]);

    return {
      prescriptions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ── Prescriptions for a specific patient (doctor only) ────────────────────
  async findByPatient(patientId: string, doctorId: string, clinicId: string) {
    return this.prisma.prescription.findMany({
      where: { patientId, doctorId, clinicId },
      include: { medicines: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Single prescription — verify ownership ────────────────────────────────
  async findOne(id: string, user: { id: string; clinicId: string }) {
    const rx = await this.prisma.prescription.findUnique({
      where: { id },
      include: {
        medicines: true,
        patient: { select: { id: true, name: true, dob: true, phone: true } },
        doctor: { select: { id: true, name: true } },
      },
    });
    if (!rx) throw new NotFoundException('Prescription not found');
    if (rx.clinicId !== user.clinicId)
      throw new NotFoundException('Prescription not found');
    if (rx.doctorId !== user.id) throw new ForbiddenException('Access denied');
    return rx;
  }

  // ── Create ─────────────────────────────────────────────────────────────────
  async create(
    dto: CreatePrescriptionDto,
    user: { id: string; clinicId: string },
  ) {
    const { medicines, ...rest } = dto;

    return this.prisma.prescription.create({
      data: {
        patientId: rest.patientId,
        diagnosis: rest.diagnosis,
        clinicId: user.clinicId,
        doctorId: user.id,
        appointmentId: rest.appointmentId ?? undefined,
        labTests: rest.labTests ?? [],
        notes: rest.notes ?? undefined,
        followUpDate: rest.followUpDate
          ? new Date(rest.followUpDate)
          : undefined,
        medicines: { create: medicines },
      },
      include: {
        medicines: true,
        patient: { select: { id: true, name: true, dob: true } },
        doctor: { select: { id: true, name: true } },
      },
    });
  }

  // ── Update — replaces medicines list entirely ──────────────────────────────
  async update(
    id: string,
    dto: UpdatePrescriptionDto,
    user: { id: string; clinicId: string },
  ) {
    const rx = await this.prisma.prescription.findUnique({ where: { id } });
    if (!rx) throw new NotFoundException('Prescription not found');
    if (rx.clinicId !== user.clinicId) throw new NotFoundException('Prescription not found');
    if (rx.doctorId !== user.id) throw new ForbiddenException('Access denied');

    const { medicines, ...rest } = dto;

    return this.prisma.$transaction(async (tx) => {
      if (medicines !== undefined) {
        await tx.medicine.deleteMany({ where: { prescriptionId: id } });
      }

      return tx.prescription.update({
        where: { id },
        data: {
          ...(rest.diagnosis    !== undefined && { diagnosis:    rest.diagnosis }),
          ...(rest.labTests     !== undefined && { labTests:     rest.labTests }),
          ...(rest.notes        !== undefined && { notes:        rest.notes }),
          ...(rest.followUpDate !== undefined && {
            followUpDate: rest.followUpDate ? new Date(rest.followUpDate) : null,
          }),
          ...(medicines !== undefined && {
            medicines: { create: medicines },
          }),
        },
        include: {
          medicines: true,
          patient: { select: { id: true, name: true, dob: true } },
          doctor:  { select: { id: true, name: true } },
        },
      });
    });
  }

  // ── Delete — schema has onDelete: Cascade so medicines auto-delete ────────
  async remove(id: string, user: { id: string; clinicId: string }) {
    const rx = await this.prisma.prescription.findUnique({ where: { id } });
    if (!rx) throw new NotFoundException('Prescription not found');
    if (rx.clinicId !== user.clinicId)
      throw new NotFoundException('Prescription not found');
    if (rx.doctorId !== user.id) throw new ForbiddenException('Access denied');

    // Medicines cascade-delete via schema onDelete: Cascade — no manual delete needed
    return this.prisma.prescription.delete({ where: { id } });
  }
}
