// src/settings/settings.controller.ts

import {
  Controller, Get, Put,
  Body, Request, UseGuards,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard }    from '../common/guards/jwt-auth.guard';
import { RolesGuard }      from '../common/guards/roles.guard';
import { Roles }           from '../common/decorators/roles.decorator';

@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // ── Clinic settings — ADMIN ONLY ──────────────────────────────────────────

  /**
   * GET /api/settings/clinic
   * Returns full clinic config including parsed working hours
   */
  @Get('clinic')
  @Roles('admin')
  getClinicSettings(@Request() req) {
    return this.settingsService.getClinicSettings(req.user.clinicId);
  }

  /**
   * GET /api/settings/clinic/stats
   * Clinic usage stats for the settings header card
   */
  @Get('clinic/stats')
  @Roles('admin')
  getClinicStats(@Request() req) {
    return this.settingsService.getClinicStats(req.user.clinicId);
  }

  /**
   * PUT /api/settings/clinic
   * Update clinic name, contact, address, working hours, etc.
   */
  @Put('clinic')
  @Roles('admin')
  updateClinicSettings(@Body() body: any, @Request() req) {
    return this.settingsService.updateClinicSettings(req.user.clinicId, body);
  }

  // ── User / profile settings — ALL roles ──────────────────────────────────

  /**
   * GET /api/settings/profile
   * Get current user's own profile
   */
  @Get('profile')
  @Roles('admin', 'doctor', 'receptionist')
  getUserProfile(@Request() req) {
    return this.settingsService.getUserProfile(req.user.id);
  }

  /**
   * PUT /api/settings/profile
   * Update current user's own profile (name, phone, password, etc.)
   */
  @Put('profile')
  @Roles('admin', 'doctor', 'receptionist')
  updateUserProfile(@Body() body: any, @Request() req) {
    return this.settingsService.updateUserProfile(req.user.id, body);
  }
}
