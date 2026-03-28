// src/booking/booking.controller.ts
// ⚠️  INTENTIONALLY NO @UseGuards — these are public endpoints.
// Patients book without logging in. No sensitive data is exposed:
//   - Services: only public fields (name, price, duration, icon)
//   - Doctors:  only public fields (name, specialty, avatar) — no email/password
//   - Patient:  created with minimal data, no medical history
//   - Appointment: created as 'pending', clinicId from server (not client)

import {
  Controller,
  Get,
  Post,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { BookingService } from './booking.service';
import {
  IsString, IsEmail, IsOptional, IsDateString,
  MinLength, Matches, IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

// ── Inline DTOs — keeps this module self-contained ────────────────────────────

class CreatePatientDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @Matches(/^[+\d\s\-()]{7,15}$/, { message: 'Invalid phone number' })
  phone: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

class CreateBookingDto {
  @IsString()
  patientId: string;   // UUID from POST /booking/patient

  @IsString()
  doctorId: string;

  @IsOptional()
  @IsString()
  serviceId?: string;

  @IsDateString()
  date: string;        // "YYYY-MM-DD"

  @IsString()
  time: string;        // "09:00"

  @IsOptional()
  @IsString()
  notes?: string;
}

// ── Controller ────────────────────────────────────────────────────────────────
@Controller('booking')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  /**
   * GET /api/booking/services
   * Public — returns active clinic services for the service selection step.
   */
  @Get('services')
  getServices() {
    return this.bookingService.getServices();
  }

  /**
   * GET /api/booking/doctors
   * Public — returns active doctors (public-safe fields only).
   */
  @Get('doctors')
  getDoctors() {
    return this.bookingService.getDoctors();
  }

  /**
   * POST /api/booking/patient
   * Public — finds or creates a patient record by phone number.
   * Returns { id, name, email, phone } — id is needed for the next step.
   */
  @Post('patient')
  createPatient(@Body() dto: CreatePatientDto) {
    if (!dto.name?.trim())  throw new BadRequestException('Name is required');
    if (!dto.phone?.trim()) throw new BadRequestException('Phone is required');
    return this.bookingService.findOrCreatePatient(dto);
  }

  /**
   * POST /api/booking/appointment
   * Public — creates the appointment using patientId from the previous step.
   * Appointment is created as 'pending' — staff confirm it in the dashboard.
   */
  @Post('appointment')
  createAppointment(@Body() dto: CreateBookingDto) {
    return this.bookingService.createAppointment(dto);
  }
}
