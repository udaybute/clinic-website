// src/staff/staff.controller.ts
// ALL routes are ADMIN ONLY

import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Request,
  Query,
  UseGuards,
} from '@nestjs/common';
import { StaffService } from './staff.service';
import { CreateStaffDto, UpdateStaffDto } from './dto/create-staff.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('staff')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  /**
   * GET /api/staff
   *   ?role=    admin|receptionist|doctor|all
   *   ?search=  name / email / specialty
   *   ?active=  true|false
   *   ?page=    default 1
   *   ?limit=   default 20
   */
  @Get()
  findAll(
    @Request() req,
    @Query('role') role?: string,
    @Query('search') search?: string,
    @Query('active') active?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.staffService.findAll(req.user.clinicId, {
      role,
      search,
      active: active === 'true' ? true : active === 'false' ? false : undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  /**
   * GET /api/staff/:id
   */
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.staffService.findOne(id, req.user.clinicId);
  }

  /**
   * POST /api/staff — create new staff member or doctor
   */
  @Post()
  create(@Body() dto: CreateStaffDto, @Request() req) {
    return this.staffService.create(dto, req.user.clinicId);
  }

  /**
   * PUT /api/staff/:id — update staff details
   */
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateStaffDto, @Request() req) {
    return this.staffService.update(id, req.user.clinicId, dto);
  }

  /**
   * PATCH /api/staff/:id/status — toggle active/inactive
   */
  @Patch(':id/status')
  toggleStatus(
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
    @Request() req,
  ) {
    return this.staffService.toggleActive(id, req.user.clinicId, isActive);
  }

  /**
   * DELETE /api/staff/:id
   * Auto-deactivates instead of hard-deleting if appointment history exists
   */
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.staffService.remove(id, req.user.clinicId, req.user.id);
  }
}
