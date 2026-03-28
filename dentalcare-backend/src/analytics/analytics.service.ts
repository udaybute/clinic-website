// src/analytics/analytics.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BillStatus }    from '@prisma/client';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  // ── All-roles dashboard data (used by main dashboard page) ────────────────
  async getDashboardData(user: { id: string; role: string; clinicId: string }) {
    const { id: userId, role, clinicId } = user;
    const now        = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd   = new Date(todayStart.getTime() + 86_400_000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const apptWhere: any = { clinicId };
    if (role === 'doctor') apptWhere.doctorId = userId;

    const todayAppts = await this.prisma.appointment.findMany({
      where: { ...apptWhere, date: { gte: todayStart, lt: todayEnd } },
      include: {
        patient: { select: { id: true, name: true } },
        doctor:  { select: { id: true, name: true } },
        service: { select: { id: true, name: true } },
      },
      orderBy: { time: 'asc' },
      take: 10,
    });

    const [totalPatients, totalAppointments, monthlyAppointments, pendingToday, completedToday] =
      await Promise.all([
        this.prisma.patient.count({ where: { clinicId } }),
        this.prisma.appointment.count({ where: apptWhere }),
        this.prisma.appointment.count({ where: { ...apptWhere, date: { gte: monthStart } } }),
        this.prisma.appointment.count({ where: { ...apptWhere, date: { gte: todayStart, lt: todayEnd }, status: 'pending' } }),
        this.prisma.appointment.count({ where: { ...apptWhere, date: { gte: todayStart, lt: todayEnd }, status: 'completed' } }),
      ]);

    const recentPatients = await this.prisma.patient.findMany({
      where:   { clinicId },
      select:  { id: true, name: true, phone: true, lastVisit: true, totalVisits: true },
      orderBy: { lastVisit: 'desc' },
      take:    5,
    });

    let revenueStats: any = null;
    if (role === 'admin') {
      const [monthly, today] = await Promise.all([
        this.prisma.bill.aggregate({
          where: { clinicId, createdAt: { gte: monthStart }, status: { not: BillStatus.cancelled } },
          _sum:  { total: true, paid: true },
        }),
        this.prisma.bill.aggregate({
          where: { clinicId, createdAt: { gte: todayStart, lt: todayEnd }, status: { not: BillStatus.cancelled } },
          _sum:  { total: true, paid: true },
        }),
      ]);
      revenueStats = {
        monthlyBilled:    monthly._sum.total ?? 0,
        monthlyCollected: monthly._sum.paid  ?? 0,
        todayBilled:      today._sum.total   ?? 0,
        todayCollected:   today._sum.paid    ?? 0,
      };
    }

    return {
      stats: { totalPatients, totalAppointments, monthlyAppointments, pendingToday, completedToday, todayTotal: todayAppts.length },
      todayAppointments: todayAppts,
      recentPatients,
      revenue: revenueStats,
    };
  }

  // ── Admin full analytics page data — single endpoint ──────────────────────
  // Returns everything the analytics page needs in one call
  async getFullAnalytics(clinicId: string, months = 6) {
    const now        = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const yearStart  = new Date(now.getFullYear(), 0, 1);

    // ── KPI: current month vs last month ──────────────────────────────────
    const [
      currentMonthRevenue,
      lastMonthRevenue,
      currentMonthAppts,
      lastMonthAppts,
      currentMonthPatients,
      lastMonthPatients,
      totalPatients,
      outstandingBalance,
    ] = await Promise.all([
      this.prisma.bill.aggregate({
        where: { clinicId, createdAt: { gte: monthStart }, status: { not: BillStatus.cancelled } },
        _sum:  { total: true, paid: true },
      }),
      this.prisma.bill.aggregate({
        where: { clinicId, createdAt: { gte: prevMonthStart, lt: monthStart }, status: { not: BillStatus.cancelled } },
        _sum:  { total: true },
      }),
      this.prisma.appointment.count({
        where: { clinicId, date: { gte: monthStart } },
      }),
      this.prisma.appointment.count({
        where: { clinicId, date: { gte: prevMonthStart, lt: monthStart } },
      }),
      this.prisma.patient.count({
        where: { clinicId, createdAt: { gte: monthStart } },
      }),
      this.prisma.patient.count({
        where: { clinicId, createdAt: { gte: prevMonthStart, lt: monthStart } },
      }),
      this.prisma.patient.count({ where: { clinicId } }),
      this.prisma.bill.aggregate({
        where: { clinicId, status: { in: [BillStatus.pending, BillStatus.partial] } },
        _sum:  { balance: true },
      }),
    ]);

    const calcGrowth = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 100);
    };

    const kpis = {
      revenue: {
        current:    currentMonthRevenue._sum.total ?? 0,
        collected:  currentMonthRevenue._sum.paid  ?? 0,
        growth:     calcGrowth(currentMonthRevenue._sum.total ?? 0, lastMonthRevenue._sum.total ?? 0),
        outstanding: outstandingBalance._sum.balance ?? 0,
      },
      appointments: {
        current: currentMonthAppts,
        growth:  calcGrowth(currentMonthAppts, lastMonthAppts),
      },
      patients: {
        total:  totalPatients,
        newThisMonth: currentMonthPatients,
        growth: calcGrowth(currentMonthPatients, lastMonthPatients),
      },
    };

    // ── Revenue trend (monthly, last N months) ────────────────────────────
    const revenueTrend: { month: string; billed: number; collected: number; appointments: number }[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end   = new Date(start.getFullYear(), start.getMonth() + 1, 1);

      const [billAgg, apptCount] = await Promise.all([
        this.prisma.bill.aggregate({
          where: { clinicId, createdAt: { gte: start, lt: end }, status: { not: BillStatus.cancelled } },
          _sum:  { total: true, paid: true },
        }),
        this.prisma.appointment.count({
          where: { clinicId, date: { gte: start, lt: end } },
        }),
      ]);

      revenueTrend.push({
        month:        start.toLocaleString('default', { month: 'short', year: '2-digit' }),
        billed:       billAgg._sum.total ?? 0,
        collected:    billAgg._sum.paid  ?? 0,
        appointments: apptCount,
      });
    }

    // ── Appointment status breakdown ──────────────────────────────────────
    const allStatuses = ['pending', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show'];
    const statusCounts = await Promise.all(
      allStatuses.map(s => this.prisma.appointment.count({ where: { clinicId, status: s as any } })),
    );
    const appointmentStats = allStatuses.reduce(
      (acc, s, i) => ({ ...acc, [s]: statusCounts[i] }),
      {} as Record<string, number>,
    );

    // ── Service breakdown — from bills (services billed = services performed) ─
    const bills = await this.prisma.bill.findMany({
      where:   { clinicId, status: { not: BillStatus.cancelled } },
      include: { appointment: { include: { service: { select: { name: true } } } } },
    });
    const serviceMap: Record<string, { count: number; revenue: number }> = {};
    for (const bill of bills) {
      const name = bill.appointment?.service?.name ?? 'General';
      if (!serviceMap[name]) serviceMap[name] = { count: 0, revenue: 0 };
      serviceMap[name].count   += 1;
      serviceMap[name].revenue += bill.total;
    }
    const serviceBreakdown = Object.entries(serviceMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);

    // ── Doctor performance (appointments + revenue this month) ────────────
    const doctors = await this.prisma.user.findMany({
      where:  { clinicId, role: 'doctor', isActive: true },
      select: { id: true, name: true, specialty: true },
    });

    const doctorPerf = await Promise.all(
      doctors.map(async doc => {
        const [apptCount, revenue] = await Promise.all([
          this.prisma.appointment.count({
            where: { clinicId, doctorId: doc.id, date: { gte: monthStart } },
          }),
          this.prisma.bill.aggregate({
            where: {
              clinicId,
              appointment: { doctorId: doc.id },
              createdAt:   { gte: monthStart },
              status:      { not: BillStatus.cancelled },
            },
            _sum: { total: true, paid: true },
          }),
        ]);
        return {
          id:           doc.id,
          name:         doc.name,
          specialty:    doc.specialty ?? '—',
          appointments: apptCount,
          revenue:      revenue._sum.total ?? 0,
          collected:    revenue._sum.paid  ?? 0,
        };
      }),
    );

    doctorPerf.sort((a, b) => b.appointments - a.appointments);

    // ── Recent bills ──────────────────────────────────────────────────────
    const recentBills = await this.prisma.bill.findMany({
      where:   { clinicId, status: { not: BillStatus.cancelled } },
      include: { patient: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take:    5,
    });

    return {
      kpis,
      revenueTrend,
      appointmentStats,
      serviceBreakdown,
      doctorPerformance: doctorPerf,
      recentBills: recentBills.map(b => ({
        id:      b.id,
        patient: b.patient.name,
        total:   b.total,
        paid:    b.paid,
        balance: b.balance,
        status:  b.status,
        date:    b.createdAt,
      })),
    };
  }

  // ── Individual endpoints (kept for backward compatibility) ────────────────
  async getDashboardStats(clinicId: string) {
    const now        = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const [totalPatients, totalAppointments, monthlyAppointments, pendingAppointments, revenue] =
      await Promise.all([
        this.prisma.patient.count({ where: { clinicId } }),
        this.prisma.appointment.count({ where: { clinicId } }),
        this.prisma.appointment.count({ where: { clinicId, createdAt: { gte: monthStart } } }),
        this.prisma.appointment.count({ where: { clinicId, status: 'pending' } }),
        this.prisma.bill.aggregate({
          where: { clinicId, status: { not: BillStatus.cancelled } },
          _sum:  { total: true, paid: true },
        }),
      ]);
    return { totalPatients, totalAppointments, monthlyAppointments, pendingAppointments, totalRevenue: revenue._sum.total ?? 0, collectedRevenue: revenue._sum.paid ?? 0 };
  }

  async getRevenueTrend(clinicId: string, months = 6) {
    const trend: { month: string; billed: number; collected: number; appointments: number }[] = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end   = new Date(start.getFullYear(), start.getMonth() + 1, 1);
      const [result, apptCount] = await Promise.all([
        this.prisma.bill.aggregate({
          where: { clinicId, createdAt: { gte: start, lt: end }, status: { not: BillStatus.cancelled } },
          _sum:  { total: true, paid: true },
        }),
        this.prisma.appointment.count({ where: { clinicId, date: { gte: start, lt: end } } }),
      ]);
      trend.push({
        month:        start.toLocaleString('default', { month: 'short', year: '2-digit' }),
        billed:       result._sum.total ?? 0,
        collected:    result._sum.paid  ?? 0,
        appointments: apptCount,
      });
    }
    return trend;
  }

  async getAppointmentStats(clinicId: string) {
    const statuses = ['pending', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show'];
    const counts = await Promise.all(
      statuses.map(s => this.prisma.appointment.count({ where: { clinicId, status: s as any } })),
    );
    return statuses.reduce((acc, s, i) => ({ ...acc, [s]: counts[i] }), {} as Record<string, number>);
  }

  async getTopDoctors(clinicId: string) {
    const now        = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const doctors    = await this.prisma.user.findMany({
      where:  { clinicId, role: 'doctor', isActive: true },
      select: { id: true, name: true, specialty: true, _count: { select: { appointments: true } } },
    });
    const withRevenue = await Promise.all(
      doctors.map(async doc => {
        const rev = await this.prisma.bill.aggregate({
          where: { clinicId, appointment: { doctorId: doc.id }, createdAt: { gte: monthStart }, status: { not: BillStatus.cancelled } },
          _sum:  { total: true },
        });
        return { ...doc, monthlyRevenue: rev._sum.total ?? 0 };
      }),
    );
    return withRevenue.sort((a, b) => b._count.appointments - a._count.appointments).slice(0, 5);
  }
}