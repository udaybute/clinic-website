// src/checkin/checkin.controller.ts
// Admin + Receptionist: full access
// Doctor: read-only (queue view)

import {
  Controller, Get, Post, Put,
  Param, Body, Request, Query, UseGuards,
} from '@nestjs/common';
import { CheckinService } from './checkin.service';
import { JwtAuthGuard }   from '../common/guards/jwt-auth.guard';
import { RolesGuard }     from '../common/guards/roles.guard';
import { Roles }          from '../common/decorators/roles.decorator';

@Controller('checkin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CheckinController {
  constructor(private readonly checkinService: CheckinService) {}

  // ── Queue & Waitlist reads — all roles ─────────────────────────────────────

  /**
   * GET /api/checkin/queue
   * Full today's queue (confirmed + checked_in + in_progress)
   * Doctor: filtered to their own appointments
   */
  @Get('queue')
  @Roles('admin', 'receptionist', 'doctor')
  getQueue(@Request() req, @Query('doctorId') doctorId?: string) {
    const filterDoctorId = req.user.role === 'doctor' ? req.user.id : doctorId;
    return this.checkinService.getTodaysQueue(req.user.clinicId, filterDoctorId);
  }

  /**
   * GET /api/checkin/waitlist
   * All checked_in patients in queue order
   */
  @Get('waitlist')
  @Roles('admin', 'receptionist', 'doctor')
  getWaitlist(@Request() req) {
    return this.checkinService.getWaitlist(req.user.clinicId);
  }

  /**
   * GET /api/checkin/completed
   * Completed appointments today
   */
  @Get('completed')
  @Roles('admin', 'receptionist', 'doctor')
  getCompleted(@Request() req) {
    return this.checkinService.getCompletedToday(req.user.clinicId);
  }

  /**
   * GET /api/checkin/search?q=
   * Patient search for check-in form
   */
  @Get('search')
  @Roles('admin', 'receptionist')
  searchPatients(@Request() req, @Query('q') q?: string) {
    return this.checkinService.searchPatients(req.user.clinicId, q ?? '');
  }

  /**
   * GET /api/checkin/patient/:patientId/appointments
   * Today's appointments for a patient
   */
  @Get('patient/:patientId/appointments')
  @Roles('admin', 'receptionist')
  getPatientAppointments(@Param('patientId') patientId: string, @Request() req) {
    return this.checkinService.getPatientTodayAppointments(patientId, req.user.clinicId);
  }

  // ── Write actions — Admin + Receptionist only ──────────────────────────────

  /**
   * POST /api/checkin/:appointmentId
   * Check in an existing appointment
   */
  @Post(':appointmentId')
  @Roles('admin', 'receptionist')
  checkIn(
    @Param('appointmentId') appointmentId: string,
    @Body('notes') notes: string | undefined,
    @Request() req,
  ) {
    return this.checkinService.checkIn(appointmentId, req.user.clinicId, notes);
  }

  /**
   * POST /api/checkin/walkin
   * Create walk-in (no prior appointment)
   * MUST be before /:appointmentId to avoid route conflict
   */
  @Post('walkin')
  @Roles('admin', 'receptionist')
  walkIn(@Body() body: any, @Request() req) {
    return this.checkinService.walkIn(req.user.clinicId, body);
  }

  /**
   * PUT /api/checkin/:appointmentId/status
   * Update appointment status (checked_in → in_progress → completed)
   */
  @Put(':appointmentId/status')
  @Roles('admin', 'receptionist', 'doctor')
  updateStatus(
    @Param('appointmentId') appointmentId: string,
    @Body('status') status: string,
    @Body('notes') notes: string | undefined,
    @Request() req,
  ) {
    return this.checkinService.updateStatus(appointmentId, req.user.clinicId, status, notes);
  }

  /**
   * POST /api/checkin/queue/next
   * Call next patient in waitlist → moves to in_progress
   */
  @Post('queue/next')
  @Roles('admin', 'receptionist', 'doctor')
  callNext(@Request() req, @Body('doctorId') doctorId?: string) {
    const filterDoctorId = req.user.role === 'doctor' ? req.user.id : doctorId;
    return this.checkinService.callNext(req.user.clinicId, filterDoctorId);
  }
}
