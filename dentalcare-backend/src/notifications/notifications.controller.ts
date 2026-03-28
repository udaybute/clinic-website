// src/notifications/notifications.controller.ts
// GET /api/notifications       — full notification list (staff)
// GET /api/notifications/count — badge count only (staff)

import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}

  @Get('count')
  count(@Request() req: any) {
    return this.svc.getCount(req.user.clinicId);
  }

  @Get()
  findAll(@Request() req: any) {
    return this.svc.getAll(req.user.clinicId);
  }
}
