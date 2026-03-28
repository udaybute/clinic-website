// src/lab/lab.controller.ts
// ALL routes are DOCTOR ONLY — enforced at class level via @Roles('doctor')

import {
  Controller, Get, Post, Put, Delete,
  Param, Body, Request, Query, UseGuards,
} from '@nestjs/common';
import { LabService }            from './lab.service';
import { CreateLabRequestDto,
         UpdateLabResultDto }    from './dto/lab.dto';
import { JwtAuthGuard }          from '../common/guards/jwt-auth.guard';
import { RolesGuard }            from '../common/guards/roles.guard';
import { Roles }                 from '../common/decorators/roles.decorator';

@Controller('lab')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('doctor')
export class LabController {
  constructor(private readonly labService: LabService) {}

  /**
   * GET /api/lab/summary
   * Quick counts for the summary panel — must be before /:id
   */
  @Get('summary')
  getSummary(@Request() req) {
    return this.labService.getSummary(req.user);
  }

  /**
   * GET /api/lab/patient/:patientId
   * All lab requests for a specific patient — must be before /:id
   */
  @Get('patient/:patientId')
  findByPatient(@Param('patientId') patientId: string, @Request() req) {
    return this.labService.findByPatient(patientId, req.user);
  }

  /**
   * GET /api/lab
   *   ?search=    patient name or test name
   *   ?status=    pending|in_progress|completed|all
   *   ?page=      default 1
   *   ?limit=     default 20
   */
  @Get()
  findAll(
    @Request() req,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page')   page?:   string,
    @Query('limit')  limit?:  string,
  ) {
    return this.labService.findAll(req.user, {
      search,
      status,
      page:  page  ? parseInt(page,  10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  /**
   * GET /api/lab/:id
   */
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.labService.findOne(id, req.user);
  }

  /**
   * POST /api/lab — request new lab test
   */
  @Post()
  create(@Body() dto: CreateLabRequestDto, @Request() req) {
    return this.labService.create(dto, req.user);
  }

  /**
   * PUT /api/lab/:id — enter result or update status
   */
  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLabResultDto,
    @Request() req,
  ) {
    return this.labService.update(id, dto, req.user);
  }

  /**
   * DELETE /api/lab/:id — only pending requests can be deleted
   */
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.labService.remove(id, req.user);
  }
}