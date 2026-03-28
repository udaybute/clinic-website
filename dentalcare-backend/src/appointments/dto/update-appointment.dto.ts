// src/appointments/dto/update-appointment.dto.ts
// Separated from create-appointment.dto.ts — cleaner and avoids accidental field leaks
import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsDateString,
  Min,
} from 'class-validator';

export class UpdateAppointmentDto {
  @IsOptional()
  @IsEnum(
    [
      'pending',
      'confirmed',
      'checked_in',
      'in_progress',
      'completed',
      'cancelled',
      'no_show',
    ],
    { message: 'Invalid appointment status' },
  )
  status?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  time?: string;

  @IsOptional()
  @IsNumber()
  @Min(15)
  duration?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  clinicalNotes?: string; // DOCTOR ONLY — stripped in service for other roles
}
