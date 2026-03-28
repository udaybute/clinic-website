// src/patients/dto/update-patient.dto.ts
// All fields optional for partial updates
import {
  IsString, IsOptional, IsEmail,
  IsEnum, IsArray, MaxLength, Matches,
} from 'class-validator';

export class UpdatePatientDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @Matches(/^[+\d\s\-()]{7,15}$/)
  phone?: string;

  @IsOptional()
  @IsString()
  dob?: string;

  @IsOptional()
  @IsEnum(['male', 'female', 'other'])
  gender?: 'male' | 'female' | 'other';

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @IsOptional()
  @IsString()
  insurance?: string;

  // Medical — stripped for non-doctors in controller
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