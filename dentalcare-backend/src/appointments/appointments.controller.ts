// src/appointments/appointments.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Request,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('appointments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  /**
   * GET /api/appointments
   *   ?search=    patient/doctor/service name
   *   ?status=    pending|confirmed|checked_in|in_progress|completed|cancelled|no_show|all
   *   ?dateRange= today|tomorrow|week|month|all
   *   ?page=      default 1
   *   ?limit=     default 25
   */
  @Get()
  @Roles('admin', 'doctor', 'receptionist')
  findAll(
    @Request() req,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('dateRange') dateRange?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.appointmentsService.findAll(
      req.user.clinicId,
      req.user.role,
      req.user.id,
      {
        search,
        status,
        dateRange: (dateRange as any) ?? 'all',
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 25,
      },
    );
  }

  /**
   * GET /api/appointments/:id
   */
  @Get(':id')
  @Roles('admin', 'doctor', 'receptionist')
  findOne(@Param('id') id: string, @Request() req) {
    return this.appointmentsService.findOne(id, req.user.clinicId);
  }

  /**
   * POST /api/appointments — admin + receptionist only
   */
  @Post()
  @Roles('admin', 'receptionist')
  create(@Body() dto: CreateAppointmentDto, @Request() req) {
    return this.appointmentsService.create(dto, req.user.clinicId);
  }

  /**
   * PUT /api/appointments/:id — all roles
   * Doctors can update clinicalNotes; others cannot.
   */
  @Put(':id')
  @Roles('admin', 'doctor', 'receptionist')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentDto,
    @Request() req,
  ) {
    return this.appointmentsService.update(
      id,
      req.user.clinicId,
      dto,
      req.user.role,
    );
  }

  /**
   * DELETE /api/appointments/:id — admin + receptionist
   * If a bill exists, cancels instead of hard-deletes.
   */
  @Delete(':id')
  @Roles('admin', 'receptionist')
  remove(@Param('id') id: string, @Request() req) {
    return this.appointmentsService.remove(id, req.user.clinicId);
  }
}
