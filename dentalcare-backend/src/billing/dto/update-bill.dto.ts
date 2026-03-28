// src/billing/dto/update-bill.dto.ts
import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateBillDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  paid?: number;

  @IsOptional()
  @IsEnum(['pending', 'paid', 'partial', 'cancelled'])
  status?: string;

  @IsOptional()
  @IsEnum(['cash', 'card', 'upi', 'insurance'])
  paymentMethod?: string;
}