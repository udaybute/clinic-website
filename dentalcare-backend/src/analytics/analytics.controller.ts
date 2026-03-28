// src/analytics/analytics.controller.ts
import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard }     from '../common/guards/jwt-auth.guard';
import { RolesGuard }       from '../common/guards/roles.guard';
import { Roles }            from '../common/decorators/roles.decorator';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * GET /api/analytics/dashboard — ALL roles
   * Role-scoped stats for the main dashboard page
   */
  @Get('dashboard')
  @Roles('admin', 'doctor', 'receptionist')
  getDashboard(@Request() req) {
    return this.analyticsService.getDashboardData(req.user);
  }

  /**
   * GET /api/analytics/full?months=6 — ADMIN ONLY
   * Single endpoint that returns everything the analytics page needs:
   * KPIs, revenue trend, appointment stats, service breakdown, doctor perf
   */
  @Get('full')
  @Roles('admin')
  getFullAnalytics(@Request() req, @Query('months') months?: string) {
    return this.analyticsService.getFullAnalytics(
      req.user.clinicId,
      months ? parseInt(months, 10) : 6,
    );
  }

  /**
   * GET /api/analytics/stats — ADMIN ONLY
   */
  @Get('stats')
  @Roles('admin')
  getDashboardStats(@Request() req) {
    return this.analyticsService.getDashboardStats(req.user.clinicId);
  }

  /**
   * GET /api/analytics/revenue?months=6 — ADMIN ONLY
   */
  @Get('revenue')
  @Roles('admin')
  getRevenueTrend(@Request() req, @Query('months') months?: string) {
    return this.analyticsService.getRevenueTrend(
      req.user.clinicId,
      months ? parseInt(months, 10) : 6,
    );
  }

  /**
   * GET /api/analytics/appointments — ADMIN ONLY
   */
  @Get('appointments')
  @Roles('admin')
  getAppointmentStats(@Request() req) {
    return this.analyticsService.getAppointmentStats(req.user.clinicId);
  }

  /**
   * GET /api/analytics/doctors — ADMIN ONLY
   */
  @Get('doctors')
  @Roles('admin')
  getTopDoctors(@Request() req) {
    return this.analyticsService.getTopDoctors(req.user.clinicId);
  }
}