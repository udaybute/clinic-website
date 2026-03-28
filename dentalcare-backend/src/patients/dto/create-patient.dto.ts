// src/patients/dto/create-patient.dto.ts
import {
  IsString, IsOptional, IsEmail,
  IsEnum, IsArray, MinLength, MaxLength, Matches,
} from 'class-validator';

export class CreatePatientDto {
  @IsString()
  @MinLength(2,  { message: 'Name must be at least 2 characters' })
  @MaxLength(100, { message: 'Name must be at most 100 characters' })
  name: string;

  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email?: string;

  @IsString()
  @Matches(/^[+\d\s\-()]{7,15}$/, { message: 'Please provide a valid phone number' })
  phone: string;

  @IsOptional()
  @IsString()
  dob?: string; // ISO date string e.g. "1990-05-15"

  @IsOptional()
  @IsEnum(['male', 'female', 'other'], {
    message: 'Gender must be male, female, or other',
  })
  gender?: 'male' | 'female' | 'other';

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @IsOptional()
  @IsString()
  insurance?: string;

  // ── Medical fields — only sent by doctor role ─────────────────────────────
  // Backend strips these for non-doctors via MEDICAL_ONLY_FIELDS in controller

  @IsOptional()
  @IsString()
  bloodGroup?: string;

  @IsOptional()
  @IsString()
  medicalHistory?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergies?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  currentMedications?: string[];

  @IsOptional()
  @IsString()
  doctorNotes?: string;
}