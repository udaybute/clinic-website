// src/audit/audit.controller.ts
// GET /api/audit — admin only
import {
  Controller,
  Get,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * GET /api/audit?page=&limit=&resource=&userId=&from=&to=
   */
  @Get()
  findAll(
    @Request() req,
    @Query('page')     page?: string,
    @Query('limit')    limit?: string,
    @Query('resource') resource?: string,
    @Query('userId')   userId?: string,
    @Query('from')     from?: string,
    @Query('to')       to?: string,
  ) {
    return this.auditService.findAll(req.user.clinicId, {
      page:  page  ? parseInt(page, 10)  : 1,
      limit: limit ? parseInt(limit, 10) : 50,
      resource,
      userId,
      from,
      to,
    });
  }
}
