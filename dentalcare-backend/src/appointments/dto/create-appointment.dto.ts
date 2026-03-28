// src/appointments/dto/create-appointment.dto.ts
import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsDateString,
  Min,
} from 'class-validator';

export class CreateAppointmentDto {
  @IsString()
  patientId: string;

  @IsString()
  doctorId: string;

  @IsOptional()
  @IsString()
  serviceId?: string;

  @IsDateString()
  date: string; // ISO date string e.g. "2026-03-25"

  @IsString()
  time: string; // e.g. "10:00 AM"

  @IsOptional()
  @IsNumber()
  @Min(15)
  duration?: number; // minutes, defaults to 30

  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
