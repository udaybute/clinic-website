// src/consultations/dto/update-consultation.dto.ts
import {
  IsString, IsArray, IsOptional,
  IsDateString, IsObject, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { VitalsDto } from './create-consultation.dto';

export class UpdateConsultationDto {
  @IsOptional() @IsString() chiefComplaint?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) symptoms?:   string[];
  @IsOptional() @IsString() examination?:  string;
  @IsOptional() @IsString() diagnosis?:    string;
  @IsOptional() @IsString() treatment?:    string;
  @IsOptional() @IsString() notes?:        string;
  @IsOptional() @IsDateString()            followUpDate?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => VitalsDto)
  vitals?: VitalsDto;
}