// src/services/dto/update-service.dto.ts
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  Min,
  MaxLength,
} from 'class-validator';

export class UpdateServiceDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(5)
  duration?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsBoolean()
  popular?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  icon?: string;
}
