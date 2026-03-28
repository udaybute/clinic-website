import {
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  ValidateNested,
  Min,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BillItemDto {
  @IsString()
  description: string;

  @IsNumber()
  quantity: number; // required in schema

  @IsNumber()
  @Min(0)
  rate: number; // required in schema

  @IsNumber()
  @Min(0)
  amount: number;
}

export class CreateBillDto {
  @IsString()
  patientId: string;

  @IsString()
  appointmentId: string; // required @unique in schema — every bill needs one

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BillItemDto)
  items: BillItemDto[];

  @IsNumber()
  @Min(0)
  discount: number;

  @IsNumber()
  @Min(0)
  tax: number;

  @IsOptional()
  @IsEnum(['cash', 'card', 'upi', 'insurance'])
  paymentMethod?: string;
}

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
