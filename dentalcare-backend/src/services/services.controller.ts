// src/services/services.controller.ts
// GET /api/services       — public (no auth required — used by public booking page)
// POST/PUT/DELETE         — admin only
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  /**
   * GET /api/services?search=&category=&activeOnly=true
   * Public — used by the booking page and appointment modal doctor dropdown.
   * No auth required so patients can browse services.
   */
  @Get()
  findAll(
    @Query('search')     search?: string,
    @Query('category')   category?: string,
    @Query('activeOnly') activeOnly?: string,
    @Query('clinicId')   clinicId?: string,
  ) {
    // For public access without JWT, clinicId must be provided as query param.
    // For authenticated requests the clinicId comes from JWT — handled by the
    // admin-scoped endpoints below.  This endpoint accepts either.
    const cid = clinicId ?? '';
    return this.servicesService.findAll(cid, {
      activeOnly: activeOnly === 'true',
      category,
      search,
    });
  }

  /**
   * GET /api/services/clinic — authenticated: uses JWT clinicId
   */
  @UseGuards(JwtAuthGuard)
  @Get('clinic')
  findAllForClinic(
    @Request() req,
    @Query('search')     search?: string,
    @Query('category')   category?: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    return this.servicesService.findAll(req.user.clinicId, {
      activeOnly: activeOnly === 'true',
      category,
      search,
    });
  }

  /**
   * GET /api/services/:id
   */
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.servicesService.findOne(id, req.user.clinicId);
  }

  /**
   * POST /api/services — admin only
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post()
  create(@Body() dto: CreateServiceDto, @Request() req) {
    return this.servicesService.create(dto, req.user.clinicId);
  }

  /**
   * PUT /api/services/:id — admin only
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateServiceDto,
    @Request() req,
  ) {
    return this.servicesService.update(id, dto, req.user.clinicId);
  }

  /**
   * DELETE /api/services/:id — admin only
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.servicesService.remove(id, req.user.clinicId);
  }
}
