// src/services/dto/create-service.dto.ts
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateServiceDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsString()
  @MaxLength(500)
  description: string;

  @IsNumber()
  @Min(5)
  duration: number; // minutes

  @IsNumber()
  @Min(0)
  price: number; // INR

  @IsString()
  category: string; // e.g. "Cosmetic", "General", "Surgical"

  @IsOptional()
  @IsBoolean()
  popular?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  icon?: string; // emoji or icon name
}
