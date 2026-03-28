// src/billing/dto/create-bill.dto.ts
import {
  IsString, IsNumber, IsArray, IsOptional,
  ValidateNested, Min, IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BillItemDto {
  @IsString()
  description: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  rate: number;

  @IsNumber()
  @Min(0)
  amount: number;  // should equal quantity × rate (validated client-side)
}

export class CreateBillDto {
  @IsString()
  patientId: string;

  @IsString()
  appointmentId: string; // @unique in schema — one bill per appointment

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BillItemDto)
  items: BillItemDto[];

  // Optional — service defaults to 0
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  // Tax as a percentage, e.g. 18 = 18%
  @IsOptional()
  @IsNumber()
  @Min(0)
  tax?: number;

  @IsOptional()
  @IsEnum(['cash', 'card', 'upi', 'insurance'])
  paymentMethod?: string;
}