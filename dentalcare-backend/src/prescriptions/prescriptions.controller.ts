// src/prescriptions/prescriptions.controller.ts
// ALL routes are DOCTOR ONLY — enforced at class level via @Roles('doctor')

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Request,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PrescriptionsService } from './prescriptions.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { UpdatePrescriptionDto } from './dto/update-prescription.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('prescriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('doctor') // ← class-level guard — applies to every route below
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  /**
   * GET /api/prescriptions?page=&limit=
   * Doctor sees only their own prescriptions.
   */
  @Get()
  findAll(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.prescriptionsService.findAll(
      req.user,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  /**
   * GET /api/prescriptions/patient/:patientId
   * All prescriptions this doctor wrote for a specific patient.
   */
  @Get('patient/:patientId')
  findByPatient(@Param('patientId') patientId: string, @Request() req) {
    return this.prescriptionsService.findByPatient(
      patientId,
      req.user.id,
      req.user.clinicId,
    );
  }

  /**
   * GET /api/prescriptions/:id
   */
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.prescriptionsService.findOne(id, req.user);
  }

  /**
   * POST /api/prescriptions
   */
  @Post()
  create(@Body() dto: CreatePrescriptionDto, @Request() req) {
    return this.prescriptionsService.create(dto, req.user);
  }

  /**
   * PUT /api/prescriptions/:id
   * Update diagnosis, medicines, labTests, notes, or followUpDate.
   * Medicines list is replaced entirely (delete + re-create).
   */
  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePrescriptionDto,
    @Request() req,
  ) {
    return this.prescriptionsService.update(id, dto, req.user);
  }

  /**
   * DELETE /api/prescriptions/:id
   */
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.prescriptionsService.remove(id, req.user);
  }
}
