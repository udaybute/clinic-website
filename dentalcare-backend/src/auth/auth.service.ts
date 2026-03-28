// src/auth/auth.service.ts
// FIXED: Added explicit email validation before Prisma query.
// This prevents PrismaClientValidationError when email arrives as undefined.

import * as bcrypt from 'bcryptjs';
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    // ── Guard: validate inputs before hitting Prisma ──────────────────────────
    // Prisma throws PrismaClientValidationError if email is undefined/null.
    // This can happen if the request body is malformed or the DTO is wrong.
    if (!email || typeof email !== 'string' || !email.trim()) {
      throw new BadRequestException('Email is required');
    }
    if (!password || typeof password !== 'string') {
      throw new BadRequestException('Password is required');
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Use a single generic message to prevent user enumeration
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update lastLogin timestamp (non-blocking)
    this.prisma.user
      .update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      })
      .catch(() => {
        /* ignore — non-critical */
      });

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      clinicId: user.clinicId,
    };
    const access_token = this.jwtService.sign(payload);

    // Return the full envelope — ResponseInterceptor passes it through unchanged
    // because it detects the 'success' key
    return {
      success: true,
      message: 'Login successful',
      data: {
        access_token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          clinicId: user.clinicId,
          isActive: user.isActive,
          specialty: user.specialty ?? null,
          createdAt: user.createdAt,
        },
      },
    };
  }
}
