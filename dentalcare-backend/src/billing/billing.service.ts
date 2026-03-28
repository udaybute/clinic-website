// src/billing/billing.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBillDto }  from './dto/create-bill.dto';
import { UpdateBillDto }  from './dto/update-bill.dto';
import { BillStatus }     from '@prisma/client';

@Injectable()
export class BillingService {
  constructor(private prisma: PrismaService) {}

  // ── List bills with search + status filter + pagination ───────────────────
  async findAll(
    clinicId: string,
    opts: {
      search?: string;
      status?: string;
      page?:   number;
      limit?:  number;
    } = {},
  ) {
    const { search, status, page = 1, limit = 25 } = opts;
    const skip = (page - 1) * limit;

    const where: any = { clinicId };

    if (status && status !== 'all') {
      where.status = status as BillStatus;
    }

    if (search?.trim()) {
      where.patient = {
        name: { contains: search, mode: 'insensitive' },
      };
    }

    const [bills, total] = await Promise.all([
      this.prisma.bill.findMany({
        where,
        include: {
          items:   true,
          patient: { select: { id: true, name: true, phone: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.bill.count({ where }),
    ]);

    // Status counts for filter tabs
    const statusList = ['pending', 'partial', 'paid', 'cancelled'];
    const counts = await Promise.all(
      statusList.map(s =>
        this.prisma.bill.count({ where: { clinicId, status: s as BillStatus } }),
      ),
    );
    const statusCounts = statusList.reduce(
      (acc, s, i) => ({ ...acc, [s]: counts[i] }),
      {} as Record<string, number>,
    );

    return {
      bills,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      statusCounts,
    };
  }

  // ── Single bill — verify clinic ownership ─────────────────────────────────
  async findOne(id: string, clinicId: string) {
    const bill = await this.prisma.bill.findUnique({
      where: { id },
      include: {
        items:   true,
        patient: { select: { id: true, name: true, email: true, phone: true } },
        appointment: {
          select: {
            id: true, date: true, time: true,
            doctor:  { select: { id: true, name: true } },
            service: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!bill)                      throw new NotFoundException('Bill not found');
    if (bill.clinicId !== clinicId) throw new NotFoundException('Bill not found');
    return bill;
  }

  // ── Bills for a specific patient ──────────────────────────────────────────
  async findByPatient(patientId: string, clinicId: string) {
    return this.prisma.bill.findMany({
      where:   { patientId, clinicId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Create ─────────────────────────────────────────────────────────────────
  async create(dto: CreateBillDto, clinicId: string) {
    // Prevent duplicate bill for the same appointment
    const existing = await this.prisma.bill.findUnique({
      where: { appointmentId: dto.appointmentId },
    });
    if (existing) {
      throw new BadRequestException(
        'A bill already exists for this appointment',
      );
    }

    const discount = dto.discount ?? 0;
    const tax      = dto.tax      ?? 0;
    const subtotal = dto.items.reduce((sum, item) => sum + item.amount, 0);
    // Total = (subtotal - discount) + tax% of subtotal
    const total    = Math.round((subtotal - discount + (subtotal * tax) / 100) * 100) / 100;

    return this.prisma.bill.create({
      data: {
        clinicId,
        patientId:     dto.patientId,
        appointmentId: dto.appointmentId,
        subtotal,
        discount,
        tax,
        total,
        paid:          0,
        balance:       total,
        status:        BillStatus.pending,
        paymentMethod: dto.paymentMethod as any ?? null,
        items:         { create: dto.items },
      },
      include: {
        items:   true,
        patient: { select: { id: true, name: true, phone: true } },
      },
    });
  }

  // ── Record payment / update status ────────────────────────────────────────
  async update(id: string, clinicId: string, dto: UpdateBillDto) {
    const bill = await this.prisma.bill.findUnique({ where: { id } });
    if (!bill || bill.clinicId !== clinicId) throw new NotFoundException('Bill not found');

    // Validate payment amount
    if (dto.paid !== undefined && dto.paid > bill.total) {
      throw new BadRequestException(
        `Payment amount ₹${dto.paid} exceeds bill total ₹${bill.total}`,
      );
    }

    const paid    = dto.paid ?? bill.paid;
    const balance = Math.round((bill.total - paid) * 100) / 100;

    // Auto-compute status unless explicitly provided
    const status: BillStatus =
      (dto.status as BillStatus) ??
      (balance <= 0
        ? BillStatus.paid
        : paid > 0
          ? BillStatus.partial
          : BillStatus.pending);

    const updateData: any = { paid, balance, status };
    if (dto.paymentMethod) updateData.paymentMethod = dto.paymentMethod;

    return this.prisma.bill.update({
      where:   { id },
      data:    updateData,
      include: { items: true, patient: { select: { id: true, name: true } } },
    });
  }

  // ── Safe delete — prevents deleting bills with partial/full payments ──────
  async remove(id: string, clinicId: string) {
    const bill = await this.prisma.bill.findUnique({ where: { id } });
    if (!bill || bill.clinicId !== clinicId) throw new NotFoundException('Bill not found');

    // Protect bills that have received any payment
    if (bill.paid > 0) {
      throw new BadRequestException(
        'Cannot delete a bill that has received payments. Cancel it instead.',
      );
    }

    await this.prisma.billItem.deleteMany({ where: { billId: id } });
    return this.prisma.bill.delete({ where: { id } });
  }

  // ── Revenue summary — admin only ─────────────────────────────────────────
  async getRevenueSummary(clinicId: string) {
    const now        = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart  = new Date(now.getFullYear(), 0, 1);

    const [today, monthly, yearly, outstanding] = await Promise.all([
      this.prisma.bill.aggregate({
        where: { clinicId, createdAt: { gte: todayStart }, status: { not: BillStatus.cancelled } },
        _sum:  { total: true, paid: true },
      }),
      this.prisma.bill.aggregate({
        where: { clinicId, createdAt: { gte: monthStart }, status: { not: BillStatus.cancelled } },
        _sum:  { total: true, paid: true },
      }),
      this.prisma.bill.aggregate({
        where: { clinicId, createdAt: { gte: yearStart }, status: { not: BillStatus.cancelled } },
        _sum:  { total: true, paid: true },
      }),
      this.prisma.bill.aggregate({
        where: { clinicId, status: { in: [BillStatus.pending, BillStatus.partial] } },
        _sum:  { balance: true },
      }),
    ]);

    return {
      today:    { billed: today._sum.total ?? 0,   collected: today._sum.paid ?? 0   },
      monthly:  { billed: monthly._sum.total ?? 0, collected: monthly._sum.paid ?? 0 },
      yearly:   { billed: yearly._sum.total ?? 0,  collected: yearly._sum.paid ?? 0  },
      outstanding: outstanding._sum.balance ?? 0,
    };
  }
}