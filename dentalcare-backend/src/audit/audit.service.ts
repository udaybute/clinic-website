// src/audit/audit.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    clinicId: string,
    opts: {
      page?: number;
      limit?: number;
      resource?: string;
      userId?: string;
      from?: string;
      to?: string;
    } = {},
  ) {
    const page  = opts.page  ?? 1;
    const limit = opts.limit ?? 50;
    const skip  = (page - 1) * limit;

    const where: any = { clinicId };
    if (opts.resource) where.resource = { contains: opts.resource, mode: 'insensitive' };
    if (opts.userId)   where.userId   = opts.userId;
    if (opts.from || opts.to) {
      where.createdAt = {};
      if (opts.from) where.createdAt.gte = new Date(opts.from);
      if (opts.to)   where.createdAt.lte = new Date(opts.to);
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { logs, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ── Helper — called from other services to log security events ────────────
  async log(data: {
    clinicId:   string;
    userId:     string;
    userEmail:  string;
    action:     string;  // e.g. LOGIN, CREATE, UPDATE, DELETE
    resource:   string;  // e.g. User, Patient, Appointment
    resourceId?: string;
    details?:   Record<string, any>;
    ip?:        string;
  }) {
    return this.prisma.auditLog.create({ data });
  }
}
