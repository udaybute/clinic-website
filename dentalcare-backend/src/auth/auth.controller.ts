// src/auth/auth.controller.ts
// FIXED: LoginDto now uses class-validator decorators so ValidationPipe
// rejects the request with a 400 before it reaches auth.service if
// email or password are missing — prevents the Prisma undefined error.

import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Request,
} from '@nestjs/common';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

class LoginDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @IsString()
  @MinLength(1, { message: 'Password is required' })
  password: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** POST /api/auth/login */
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  /** GET /api/auth/me */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Request() req) {
    return req.user;
  }

  /** POST /api/auth/logout */
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout() {
    return { success: true, message: 'Logged out' };
  }
}
