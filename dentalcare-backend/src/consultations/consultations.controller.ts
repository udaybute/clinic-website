// src/consultations/consultations.controller.ts
// ALL routes are DOCTOR ONLY — enforced at class level via @Roles('doctor')

import {
  Controller, Get, Post, Put, Delete,
  Param, Body, Request, Query, UseGuards,
} from '@nestjs/common';
import { ConsultationsService }  from './consultations.service';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { UpdateConsultationDto } from './dto/update-consultation.dto';
import { JwtAuthGuard }          from '../common/guards/jwt-auth.guard';
import { RolesGuard }            from '../common/guards/roles.guard';
import { Roles }                 from '../common/decorators/roles.decorator';

@Controller('consultations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('doctor')
export class ConsultationsController {
  constructor(private readonly consultationsService: ConsultationsService) {}

  /**
   * GET /api/consultations/queue
   * Today's appointment queue for the logged-in doctor.
   * Used to populate the patient list panel on the consultations page.
   */
  @Get('queue')
  getTodaysQueue(@Request() req) {
    return this.consultationsService.getTodaysQueue(
      req.user.id,
      req.user.clinicId,
    );
  }

  /**
   * GET /api/consultations?page=&limit=
   * All consultations written by this doctor (paginated).
   */
  @Get()
  findAll(
    @Request() req,
    @Query('page')  page?:  string,
    @Query('limit') limit?: string,
  ) {
    return this.consultationsService.findAll(
      req.user.id,
      req.user.clinicId,
      page  ? parseInt(page,  10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  /**
   * GET /api/consultations/patient/:patientId
   * Consultation history for a specific patient by this doctor.
   */
  @Get('patient/:patientId')
  findByPatient(@Param('patientId') patientId: string, @Request() req) {
    return this.consultationsService.findByPatient(
      patientId,
      req.user.id,
      req.user.clinicId,
    );
  }

  /**
   * GET /api/consultations/:id
   */
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.consultationsService.findOne(id, req.user);
  }

  /**
   * POST /api/consultations
   */
  @Post()
  create(@Body() dto: CreateConsultationDto, @Request() req) {
    return this.consultationsService.create(dto, req.user);
  }

  /**
   * PUT /api/consultations/:id
   */
  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateConsultationDto,
    @Request() req,
  ) {
    return this.consultationsService.update(id, dto, req.user);
  }

  /**
   * DELETE /api/consultations/:id
   */
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.consultationsService.remove(id, req.user);
  }
}