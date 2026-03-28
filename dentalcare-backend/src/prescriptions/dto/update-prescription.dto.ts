// src/prescriptions/dto/update-prescription.dto.ts
import {
  IsString,
  IsArray,
  IsOptional,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateMedicineDto } from './create-prescription.dto';

export class UpdatePrescriptionDto {
  @IsOptional()
  @IsString()
  diagnosis?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMedicineDto)
  medicines?: CreateMedicineDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  labTests?: string[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  followUpDate?: string;
}
