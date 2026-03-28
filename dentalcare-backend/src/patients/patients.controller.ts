// src/patients/patients.controller.ts
import {
  Controller, UseGuards, Get, Post, Put, Delete,
  Param, Body, Request, Query,
} from '@nestjs/common';
import { PatientsService }   from './patients.service';
import { CreatePatientDto }  from './dto/create-patient.dto';
import { UpdatePatientDto }  from './dto/update-patient.dto';
import { JwtAuthGuard }      from '../common/guards/jwt-auth.guard';
import { RolesGuard }        from '../common/guards/roles.guard';
import { Roles }             from '../common/decorators/roles.decorator';
import { sanitizePatients, sanitizePatient, MEDICAL_ONLY_FIELDS } from '../common/utils/sanitize-patient';

@Controller('patients')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  /**
   * GET /api/patients?search=&page=1&limit=20
   * All roles — medical fields stripped for non-doctors
   */
  @Get()
  @Roles('admin', 'doctor', 'receptionist')
  async findAll(
    @Request() req,
    @Query('search') search?: string,
    @Query('page')   page?:   string,
    @Query('limit')  limit?:  string,
  ) {
    const result = await this.patientsService.findAll(
      req.user.clinicId,
      search,
      page  ? parseInt(page,  10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );

    return {
      ...result,
      patients: sanitizePatients(result.patients, req.user.role),
    };
  }

  /**
   * GET /api/patients/:id
   * All roles — medical fields stripped for non-doctors
   */
  @Get(':id')
  @Roles('admin', 'doctor', 'receptionist')
  async findOne(@Param('id') id: string, @Request() req) {
    const patient = await this.patientsService.findOne(id, req.user.clinicId);
    return sanitizePatient(patient, req.user.role);
  }

  /**
   * GET /api/patients/:id/medical
   * DOCTOR ONLY — full medical record with prescriptions, consultations, labs
   */
  @Get(':id/medical')
  @Roles('doctor')
  async getMedical(@Param('id') id: string, @Request() req) {
    return this.patientsService.findOneFull(id, req.user.clinicId);
  }

  /**
   * POST /api/patients
   * Admin + Receptionist only
   */
  @Post()
  @Roles('admin', 'receptionist')
  create(@Body() dto: CreatePatientDto, @Request() req) {
    return this.patientsService.create({ ...dto, clinicId: req.user.clinicId });
  }

  /**
   * PUT /api/patients/:id
   * All roles — medical fields stripped for non-doctors
   */
  @Put(':id')
  @Roles('admin', 'doctor', 'receptionist')
  async update(@Param('id') id: string, @Body() dto: UpdatePatientDto, @Request() req) {
    // Strip medical fields if non-doctor tries to update them
    let safeDto: any = dto;
    if (req.user.role !== 'doctor') {
      safeDto = Object.fromEntries(
        Object.entries(dto).filter(
          ([k]) => !(MEDICAL_ONLY_FIELDS as readonly string[]).includes(k),
        ),
      );
    }
    return this.patientsService.update(id, req.user.clinicId, safeDto);
  }

  /**
   * DELETE /api/patients/:id
   * Admin only
   */
  @Delete(':id')
  @Roles('admin')
  remove(@Param('id') id: string, @Request() req) {
    return this.patientsService.remove(id, req.user.clinicId);
  }
}