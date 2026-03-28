// src/lab/dto/lab.dto.ts

import {
  IsString, IsOptional, IsEnum,
  IsArray, MinLength,
} from 'class-validator';

// ── Request a new lab test ─────────────────────────────────────────────────
export class CreateLabRequestDto {
  @IsString()
  patientId: string;

  @IsString()
  @MinLength(2)
  testName: string;

  @IsOptional()
  @IsString()
  testType?: string;   // e.g. "Blood", "Imaging", "Biopsy"

  @IsOptional()
  @IsString()
  normalRange?: string;

  @IsOptional()
  @IsString()
  doctorNotes?: string;  // instructions to lab technician
}

// ── Update result / status ─────────────────────────────────────────────────
export class UpdateLabResultDto {
  @IsOptional()
  @IsEnum(['pending', 'in_progress', 'completed'], {
    message: 'Status must be pending, in_progress, or completed',
  })
  status?: string;

  @IsOptional()
  @IsString()
  result?: string;       // lab result text / values

  @IsOptional()
  @IsString()
  normalRange?: string;

  @IsOptional()
  @IsString()
  notes?: string;        // mapped to doctorNotes in DB
}