// src/patients/patients.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService }    from '../../prisma/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';

@Injectable()
export class PatientsService {
  constructor(private prisma: PrismaService) {}

  // ── List patients with search + pagination ─────────────────────────────────
  async findAll(
    clinicId: string,
    search?:  string,
    page  = 1,
    limit = 20,
  ) {
    const skip = (page - 1) * limit;

    const where: any = { clinicId };
    if (search?.trim()) {
      where.OR = [
        { name:  { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [patients, total] = await Promise.all([
      this.prisma.patient.findMany({
        where,
        orderBy:  { createdAt: 'desc' },
        skip,
        take:     limit,
        // Include only basic fields + appointment count
        // Medical fields are stripped by sanitizePatient() in controller
        select: {
          id:          true,
          clinicId:    true,
          name:        true,
          email:       true,
          phone:       true,
          dob:         true,
          gender:      true,
          address:     true,
          insurance:   true,
          totalVisits: true,
          lastVisit:   true,
          createdAt:   true,
          updatedAt:   true,
          // Medical fields — included here, stripped by controller for non-doctors
          bloodGroup:         true,
          medicalHistory:     true,
          allergies:          true,
          currentMedications: true,
          doctorNotes:        true,
          // Count upcoming appointments
          _count: { select: { appointments: true } },
        },
      }),
      this.prisma.patient.count({ where }),
    ]);

    return {
      patients,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ── Single patient — basic fields only (medical stripped by controller) ─────
  async findOne(id: string, clinicId: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
      select: {
        id:          true,
        clinicId:    true,
        name:        true,
        email:       true,
        phone:       true,
        dob:         true,
        gender:      true,
        address:     true,
        insurance:   true,
        totalVisits: true,
        lastVisit:   true,
        createdAt:   true,
        updatedAt:   true,
        bloodGroup:         true,
        medicalHistory:     true,
        allergies:          true,
        currentMedications: true,
        doctorNotes:        true,
        _count: { select: { appointments: true } },
      },
    });

    if (!patient)          throw new NotFoundException('Patient not found');
    if (patient.clinicId !== clinicId) throw new NotFoundException('Patient not found');

    return patient;
  }

  // ── Full medical record — DOCTOR ONLY ─────────────────────────────────────
  async findOneFull(id: string, clinicId: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
      include: {
        prescriptions: {
          include:  { medicines: true },
          orderBy:  { createdAt: 'desc' },
          take:     5,
        },
        consultations: {
          orderBy: { createdAt: 'desc' },
          take:    5,
        },
        labRequests: {
          orderBy: { date: 'desc' },
          take:    5,
        },
        appointments: {
          orderBy: { date: 'desc' },
          take:    5,
          include: {
            doctor:  { select: { id: true, name: true } },
            service: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!patient)          throw new NotFoundException('Patient not found');
    if (patient.clinicId !== clinicId) throw new NotFoundException('Patient not found');

    return patient;
  }

  // ── Create ─────────────────────────────────────────────────────────────────
  async create(dto: CreatePatientDto & { clinicId: string }) {
    // Prevent duplicate phone in same clinic
    const existing = await this.prisma.patient.findFirst({
      where: { clinicId: dto.clinicId, phone: dto.phone },
    });
    if (existing) {
      throw new BadRequestException(
        `A patient with phone ${dto.phone} already exists in this clinic`,
      );
    }

    return this.prisma.patient.create({
      data: {
        clinicId:           dto.clinicId,
        name:               dto.name,
        email:              dto.email,
        phone:              dto.phone,
        dob:                dto.dob ? new Date(dto.dob) : undefined,
        gender:             dto.gender,
        address:            dto.address,
        insurance:          dto.insurance,
        bloodGroup:         dto.bloodGroup,
        medicalHistory:     dto.medicalHistory,
        allergies:          dto.allergies          ?? [],
        currentMedications: dto.currentMedications ?? [],
      },
    });
  }

  // ── Update ─────────────────────────────────────────────────────────────────
  async update(id: string, clinicId: string, data: UpdatePatientDto) {
    // Verify patient belongs to this clinic
    const existing = await this.prisma.patient.findUnique({ where: { id } });
    if (!existing || existing.clinicId !== clinicId) {
      throw new NotFoundException('Patient not found');
    }

    return this.prisma.patient.update({
      where: { id },
      data: {
        ...data,
        dob: data.dob ? new Date(data.dob) : undefined,
      },
    });
  }

  // ── Delete (soft-style: admin only, checked in controller) ────────────────
  async remove(id: string, clinicId: string) {
    const existing = await this.prisma.patient.findUnique({ where: { id } });
    if (!existing || existing.clinicId !== clinicId) {
      throw new NotFoundException('Patient not found');
    }
    return this.prisma.patient.delete({ where: { id } });
  }
}