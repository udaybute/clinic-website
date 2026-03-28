// src/notifications/notifications.service.ts
// Generates live notification alerts from existing clinic data.
// No separate Notification model needed — derives alerts from:
//   - Pending appointments today
//   - Lab requests with status "pending"
//   - Unpaid bills overdue by 7+ days

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface NotificationItem {
  id:      string;
  type:    'appointment_pending' | 'lab_pending' | 'bill_overdue';
  title:   string;
  message: string;
  time:    string;
  href:    string;
}

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  private todayRange() {
    const now        = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd   = new Date(todayStart.getTime() + 86_400_000);
    return { todayStart, todayEnd };
  }

  async getCount(clinicId: string): Promise<{ count: number }> {
    const { todayStart, todayEnd } = this.todayRange();

    const [pendingAppts, pendingLabs, overdueBills] = await Promise.all([
      this.prisma.appointment.count({
        where: { clinicId, status: 'pending', date: { gte: todayStart, lt: todayEnd } },
      }),
      this.prisma.labRequest.count({
        where: { clinicId, status: 'pending' },
      }),
      this.prisma.bill.count({
        where: {
          clinicId,
          status: { in: ['pending', 'partial'] },
          createdAt: { lte: new Date(Date.now() - 7 * 86_400_000) },
        },
      }),
    ]);

    return { count: pendingAppts + pendingLabs + overdueBills };
  }

  async getAll(clinicId: string): Promise<NotificationItem[]> {
    const { todayStart, todayEnd } = this.todayRange();

    const [pendingAppts, pendingLabs, overdueBills] = await Promise.all([
      this.prisma.appointment.findMany({
        where:   { clinicId, status: 'pending', date: { gte: todayStart, lt: todayEnd } },
        include: { patient: { select: { name: true } }, service: { select: { name: true } } },
        orderBy: { time: 'asc' },
        take:    10,
      }),
      this.prisma.labRequest.findMany({
        where:   { clinicId, status: 'pending' },
        include: { patient: { select: { name: true } } },
        orderBy: { date: 'desc' },
        take:    5,
      }),
      this.prisma.bill.findMany({
        where: {
          clinicId,
          status:    { in: ['pending', 'partial'] },
          createdAt: { lte: new Date(Date.now() - 7 * 86_400_000) },
        },
        include: { patient: { select: { name: true } } },
        orderBy: { createdAt: 'asc' },
        take:    5,
      }),
    ]);

    const items: NotificationItem[] = [];

    for (const a of pendingAppts) {
      items.push({
        id:      `appt-${a.id}`,
        type:    'appointment_pending',
        title:   `Pending appointment`,
        message: `${a.patient.name} — ${a.service?.name ?? 'Appointment'} at ${a.time}`,
        time:    a.time,
        href:    '/dashboard/appointments',
      });
    }

    for (const l of pendingLabs) {
      items.push({
        id:      `lab-${l.id}`,
        type:    'lab_pending',
        title:   `Lab result pending`,
        message: `${l.patient.name} — ${l.testName ?? 'Lab test'} awaiting results`,
        time:    new Date(l.date).toLocaleDateString('en-IN'),
        href:    '/dashboard/lab',
      });
    }

    for (const b of overdueBills) {
      const days = Math.floor(
        (Date.now() - new Date(b.createdAt).getTime()) / 86_400_000,
      );
      items.push({
        id:      `bill-${b.id}`,
        type:    'bill_overdue',
        title:   `Overdue bill`,
        message: `${b.patient.name} — ₹${b.balance?.toFixed(2) ?? b.total.toFixed(2)} unpaid (${days}d)`,
        time:    new Date(b.createdAt).toLocaleDateString('en-IN'),
        href:    '/dashboard/billing',
      });
    }

    return items;
  }
}
