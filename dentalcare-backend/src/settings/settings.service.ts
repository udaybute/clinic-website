// src/settings/settings.service.ts
//
// Clinic settings → updates the existing Clinic record (no new table)
// User profile    → updates the existing User record (name, phone, specialty, password)
// Working hours   → stored as JSON string in Clinic.openingHours

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

export interface WorkingDay {
  day:     string
  open:    boolean
  start:   string   // "09:00"
  end:     string   // "18:00"
}

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  // ── Clinic settings ────────────────────────────────────────────────────────
  async getClinicSettings(clinicId: string) {
    const clinic = await this.prisma.clinic.findUnique({ where: { id: clinicId } });
    if (!clinic) throw new NotFoundException('Clinic not found');

    // Parse working hours JSON — fallback to default schedule
    let workingHours: WorkingDay[] = this.defaultWorkingHours();
    try {
      if (clinic.openingHours) {
        const parsed = JSON.parse(clinic.openingHours);
        if (Array.isArray(parsed)) workingHours = parsed;
      }
    } catch { /* keep default */ }

    return { ...clinic, workingHours };
  }

  async updateClinicSettings(
    clinicId: string,
    dto: {
      name?:         string
      email?:        string
      phone?:        string
      address?:      string
      website?:      string
      logoUrl?:      string
      plan?:         string
      workingHours?: WorkingDay[]
    },
  ) {
    const clinic = await this.prisma.clinic.findUnique({ where: { id: clinicId } });
    if (!clinic) throw new NotFoundException('Clinic not found');

    const updateData: any = {};
    if (dto.name    !== undefined) updateData.name    = dto.name;
    if (dto.email   !== undefined) updateData.email   = dto.email;
    if (dto.phone   !== undefined) updateData.phone   = dto.phone;
    if (dto.address !== undefined) updateData.address = dto.address;
    if (dto.website !== undefined) updateData.website = dto.website;
    if (dto.logoUrl !== undefined) updateData.logoUrl = dto.logoUrl;

    // Serialise working hours to JSON string (fits existing String column)
    if (dto.workingHours !== undefined) {
      updateData.openingHours = JSON.stringify(dto.workingHours);
    }

    const updated = await this.prisma.clinic.update({
      where: { id: clinicId },
      data:  updateData,
    });

    return this.getClinicSettings(clinicId); // return enriched response
  }

  // ── User / profile settings ────────────────────────────────────────────────
  async getUserProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where:  { id: userId },
      select: {
        id:              true,
        name:            true,
        email:           true,
        phone:           true,
        role:            true,
        specialty:       true,
        avatar:          true,
        isActive:        true,
        createdAt:       true,
        experience:      true,
        qualifications:  true,
        consultationFee: true,
        availability:    true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateUserProfile(
    userId: string,
    dto: {
      name?:           string
      phone?:          string
      specialty?:      string
      qualifications?: string
      consultationFee?: number
      availability?:   string[]
      currentPassword?: string
      newPassword?:     string
    },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const data: any = {};
    if (dto.name            !== undefined) data.name            = dto.name;
    if (dto.phone           !== undefined) data.phone           = dto.phone;
    if (dto.specialty       !== undefined) data.specialty       = dto.specialty;
    if (dto.qualifications  !== undefined) data.qualifications  = dto.qualifications;
    if (dto.consultationFee !== undefined) data.consultationFee = dto.consultationFee;
    if (dto.availability    !== undefined) data.availability    = dto.availability;

    // Password change with current password verification
    if (dto.newPassword) {
      if (!dto.currentPassword) {
        throw new BadRequestException('Current password is required to set a new password');
      }
      const valid = await bcrypt.compare(dto.currentPassword, user.password);
      if (!valid) throw new BadRequestException('Current password is incorrect');
      if (dto.newPassword.length < 8) {
        throw new BadRequestException('New password must be at least 8 characters');
      }
      data.password = await bcrypt.hash(dto.newPassword, 12);
    }

    return this.prisma.user.update({
      where:  { id: userId },
      data,
      select: {
        id: true, name: true, email: true, phone: true,
        role: true, specialty: true, avatar: true,
        experience: true, qualifications: true,
        consultationFee: true, availability: true,
      },
    });
  }

  // ── Clinic stats for settings header ──────────────────────────────────────
  async getClinicStats(clinicId: string) {
    const [patients, appointments, staff, services] = await Promise.all([
      this.prisma.patient.count({ where: { clinicId } }),
      this.prisma.appointment.count({ where: { clinicId } }),
      this.prisma.user.count({ where: { clinicId, isActive: true } }),
      this.prisma.service.count({ where: { clinicId, isActive: true } }),
    ]);
    return { patients, appointments, staff, services };
  }

  // ── Default 6-day schedule ─────────────────────────────────────────────────
  private defaultWorkingHours(): WorkingDay[] {
    const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
    return days.map(day => ({
      day,
      open:  day !== 'Sunday',
      start: '09:00',
      end:   day === 'Saturday' ? '14:00' : '18:00',
    }));
  }
}
