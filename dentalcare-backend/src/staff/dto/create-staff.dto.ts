// src/staff/dto/create-staff.dto.ts
import {
  IsString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsNumber,
  IsArray,
  IsBoolean,
  MinLength,
  MaxLength,
  Min,
  Max,
  Matches,
} from 'class-validator';

export class CreateStaffDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password: string;

  @IsEnum(['admin', 'receptionist', 'doctor'], {
    message: 'Role must be admin, receptionist, or doctor',
  })
  role: 'admin' | 'receptionist' | 'doctor';

  @IsOptional()
  @IsString()
  @Matches(/^[+\d\s\-()]{7,15}$/, { message: 'Invalid phone number' })
  phone?: string;

  // Doctor-specific fields
  @IsOptional()
  @IsString()
  specialty?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(60)
  experience?: number;

  @IsOptional()
  @IsString()
  qualifications?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  consultationFee?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  availability?: string[]; // e.g. ["Mon 09:00-17:00", "Tue 09:00-17:00"]
}

export class UpdateStaffDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // Doctor-specific
  @IsOptional()
  @IsString()
  specialty?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  experience?: number;

  @IsOptional()
  @IsString()
  qualifications?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  consultationFee?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  availability?: string[];
}
