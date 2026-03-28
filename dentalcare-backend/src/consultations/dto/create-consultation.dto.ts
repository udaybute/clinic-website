// src/consultations/dto/create-consultation.dto.ts
import {
  IsString, IsArray, IsOptional,
  IsDateString, IsObject, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class VitalsDto {
  @IsOptional() @IsString() bp?:          string;
  @IsOptional() @IsString() pulse?:       string;
  @IsOptional() @IsString() temperature?: string;
  @IsOptional() @IsString() weight?:      string;
  @IsOptional() @IsString() height?:      string;
}

export class CreateConsultationDto {
  @IsString()
  patientId: string;

  @IsString()
  appointmentId: string;   // required — every consultation links to an appointment

  @IsString()
  chiefComplaint: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  symptoms?: string[];

  @IsOptional() @IsString() examination?: string;
  @IsOptional() @IsString() diagnosis?:   string;
  @IsOptional() @IsString() treatment?:   string;
  @IsOptional() @IsString() notes?:       string;

  // Vitals — passed as a flat object and spread into the Prisma data
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => VitalsDto)
  vitals?: VitalsDto;

  @IsOptional()
  @IsDateString()
  followUpDate?: string;
}