// src/prescriptions/dto/create-prescription.dto.ts
import {
  IsString,
  IsArray,
  IsOptional,
  ValidateNested,
  ArrayMinSize,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMedicineDto {
  @IsString()
  name: string;

  @IsString()
  dosage: string; // e.g. "500mg"

  @IsString()
  frequency: string; // e.g. "Twice daily"

  @IsString()
  duration: string; // e.g. "5 days"

  @IsOptional()
  @IsString()
  notes?: string; // special instructions for this medicine
}

export class CreatePrescriptionDto {
  @IsString()
  patientId: string;

  @IsString()
  diagnosis: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1, { message: 'At least one medicine is required' })
  @Type(() => CreateMedicineDto)
  medicines: CreateMedicineDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  labTests?: string[];

  @IsOptional()
  @IsString()
  appointmentId?: string;

  // FIXED: Added notes and followUpDate — exist in schema, were missing from DTO
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  followUpDate?: string; // ISO date string, converted to Date in service
}
