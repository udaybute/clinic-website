// src/billing/billing.controller.ts
// CRITICAL FIX: 'reports' route MUST be defined BEFORE ':id' route.
// NestJS matches routes top-to-bottom — if ':id' is first, "reports" gets
// treated as an ID param and the reports route is never reached (404).

import {
  Controller, Get, Post, Put, Delete,
  Param, Body, Request, Query, UseGuards,
} from '@nestjs/common';
import { BillingService }  from './billing.service';
import { CreateBillDto }   from './dto/create-bill.dto';
import { UpdateBillDto }   from './dto/update-bill.dto';
import { JwtAuthGuard }    from '../common/guards/jwt-auth.guard';
import { RolesGuard }      from '../common/guards/roles.guard';
import { Roles }           from '../common/decorators/roles.decorator';

@Controller('bills')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  /**
   * GET /api/bills
   *   ?search=   patient name
   *   ?status=   pending|partial|paid|cancelled|all
   *   ?page=     default 1
   *   ?limit=    default 25
   */
  @Get()
  @Roles('admin', 'receptionist', 'doctor')
  findAll(
    @Request() req,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page')   page?:   string,
    @Query('limit')  limit?:  string,
  ) {
    return this.billingService.findAll(req.user.clinicId, {
      search,
      status,
      page:  page  ? parseInt(page,  10) : 1,
      limit: limit ? parseInt(limit, 10) : 25,
    });
  }

  /**
   * GET /api/bills/reports — MUST be before /:id
   * Admin only — revenue summary
   */
  @Get('reports')
  @Roles('admin')
  getReports(@Request() req) {
    return this.billingService.getRevenueSummary(req.user.clinicId);
  }

  /**
   * GET /api/bills/patient/:patientId
   */
  @Get('patient/:patientId')
  @Roles('admin', 'receptionist', 'doctor')
  findByPatient(@Param('patientId') patientId: string, @Request() req) {
    return this.billingService.findByPatient(patientId, req.user.clinicId);
  }

  /**
   * GET /api/bills/:id
   */
  @Get(':id')
  @Roles('admin', 'receptionist', 'doctor')
  findOne(@Param('id') id: string, @Request() req) {
    return this.billingService.findOne(id, req.user.clinicId);
  }

  /**
   * POST /api/bills — admin + receptionist only
   */
  @Post()
  @Roles('admin', 'receptionist')
  create(@Body() dto: CreateBillDto, @Request() req) {
    return this.billingService.create(dto, req.user.clinicId);
  }

  /**
   * PUT /api/bills/:id — record payment / update status
   * Admin + receptionist only
   */
  @Put(':id')
  @Roles('admin', 'receptionist')
  update(@Param('id') id: string, @Body() dto: UpdateBillDto, @Request() req) {
    return this.billingService.update(id, req.user.clinicId, dto);
  }

  /**
   * DELETE /api/bills/:id — admin only
   * Blocked if the bill has received any payment
   */
  @Delete(':id')
  @Roles('admin')
  remove(@Param('id') id: string, @Request() req) {
    return this.billingService.remove(id, req.user.clinicId);
  }
}