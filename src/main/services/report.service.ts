import { Decimal } from 'decimal.js';
import { prisma } from '../database/prisma';
import { DailyCollectionSummary, ReportFilterDto } from '../../shared/types';
import { InvoiceStatus, PaymentMethod } from '../../shared/constants/enums';

export class ReportService {
  /**
   * Daily collection summary by payment method and cashier
   */
  static async getDailyCollection(dateStr?: string): Promise<DailyCollectionSummary> {
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const [invoices, payments] = await Promise.all([
      prisma.invoice.findMany({
        where: {
          createdAt: { gte: startOfDay, lte: endOfDay },
          status: { not: InvoiceStatus.VOIDED },
        },
      }),
      prisma.payment.findMany({
        where: {
          receivedAt: { gte: startOfDay, lte: endOfDay },
        },
      }),
    ]);

    let totalRevenue = new Decimal(0);
    let totalDiscount = new Decimal(0);
    let totalBalance = new Decimal(0);

    invoices.forEach((inv) => {
      totalRevenue = totalRevenue.plus(inv.netTotal);
      totalDiscount = totalDiscount.plus(inv.discountTotal);
      totalBalance = totalBalance.plus(inv.balanceTotal);
    });

    let totalCollected = new Decimal(0);
    const paymentMethodBreakdown: Record<string, number> = {};
    const cashierBreakdown: Record<string, number> = {};

    payments.forEach((p) => {
      const amt = new Decimal(p.amount);
      totalCollected = totalCollected.plus(amt);

      const method = p.paymentMethod;
      paymentMethodBreakdown[method] = (paymentMethodBreakdown[method] || 0) + amt.toNumber();

      const cashier = p.receivedById;
      cashierBreakdown[cashier] = (cashierBreakdown[cashier] || 0) + amt.toNumber();
    });

    return {
      totalRevenue: totalRevenue.toNumber(),
      totalCollected: totalCollected.toNumber(),
      totalDiscount: totalDiscount.toNumber(),
      totalBalance: totalBalance.toNumber(),
      paymentMethodBreakdown,
      cashierBreakdown,
      invoiceCount: invoices.length,
      paidCount: invoices.filter((i) => i.status === InvoiceStatus.PAID).length,
    };
  }

  /**
   * Doctor-wise patient visits & consultation revenue
   */
  static async getDoctorWiseStats(filters: ReportFilterDto) {
    const where: any = {};
    if (filters.startDate || filters.endDate) {
      where.visitDateTime = {};
      if (filters.startDate) where.visitDateTime.gte = new Date(filters.startDate);
      if (filters.endDate) where.visitDateTime.lte = new Date(filters.endDate);
    }
    if (filters.doctorId) where.doctorId = filters.doctorId;
    if (filters.departmentId) where.departmentId = filters.departmentId;

    const visits = await prisma.visit.findMany({
      where,
      include: {
        doctor: { include: { department: true } },
        invoices: {
          where: { status: { not: InvoiceStatus.VOIDED } },
          include: { payments: true },
        },
      },
    });

    const docMap = new Map<string, any>();

    visits.forEach((v) => {
      const docId = v.doctorId;
      if (!docMap.has(docId)) {
        docMap.set(docId, {
          doctorId: docId,
          doctorName: v.doctor.name,
          specialty: v.doctor.specialty,
          department: v.doctor.department.name,
          totalVisits: 0,
          completedVisits: 0,
          newVisits: 0,
          followUpVisits: 0,
          billedAmount: 0,
          collectedAmount: 0,
        });
      }

      const item = docMap.get(docId);
      item.totalVisits += 1;
      if (v.status === 'COMPLETED' || v.status === 'CONSULTATION_COMPLETED') item.completedVisits += 1;
      if (v.visitType === 'NEW_CONSULTATION') item.newVisits += 1;
      if (v.visitType === 'FOLLOW_UP') item.followUpVisits += 1;

      v.invoices.forEach((inv) => {
        item.billedAmount += Number(inv.netTotal);
        item.collectedAmount += Number(inv.paidTotal);
      });
    });

    return Array.from(docMap.values());
  }

  /**
   * Department-wise patient volume
   */
  static async getDepartmentWiseStats(filters: ReportFilterDto) {
    const where: any = {};
    if (filters.startDate || filters.endDate) {
      where.visitDateTime = {};
      if (filters.startDate) where.visitDateTime.gte = new Date(filters.startDate);
      if (filters.endDate) where.visitDateTime.lte = new Date(filters.endDate);
    }

    const visits = await prisma.visit.findMany({
      where,
      include: { department: true },
    });

    const deptMap = new Map<string, any>();

    visits.forEach((v) => {
      const deptId = v.departmentId;
      if (!deptMap.has(deptId)) {
        deptMap.set(deptId, {
          departmentId: deptId,
          departmentCode: v.department.code,
          departmentName: v.department.name,
          visitCount: 0,
        });
      }
      deptMap.get(deptId).visitCount += 1;
    });

    return Array.from(deptMap.values());
  }

  /**
   * Panel / Corporate client receivable ledger
   */
  static async getPanelClientBilling(filters: ReportFilterDto) {
    const where: any = {
      panelClientId: { not: null },
      status: { not: InvoiceStatus.VOIDED },
    };

    if (filters.panelClientId) where.panelClientId = filters.panelClientId;
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        panelClient: true,
        patient: true,
        doctor: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return invoices.map((inv) => ({
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      date: inv.createdAt.toISOString(),
      panelClientName: inv.panelClient?.name,
      patientName: inv.patient.fullName,
      mrn: inv.patient.mrn,
      employeeId: inv.patient.employeeId,
      panelClaimNo: inv.panelClaimNo,
      netTotal: Number(inv.netTotal),
      paidTotal: Number(inv.paidTotal),
      balanceTotal: Number(inv.balanceTotal),
      status: inv.status,
    }));
  }

  /**
   * Top requested investigations frequency
   */
  static async getInvestigationStats(filters: ReportFilterDto) {
    const where: any = {};
    if (filters.startDate || filters.endDate) {
      where.prescription = {
        createdAt: {},
      };
      if (filters.startDate) where.prescription.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.prescription.createdAt.lte = new Date(filters.endDate);
    }

    const items = await prisma.prescriptionInvestigation.findMany({
      where,
      include: {
        investigation: true,
      },
    });

    const countMap = new Map<string, { name: string; category?: string; count: number }>();

    items.forEach((it) => {
      const name = it.investigationName;
      if (!countMap.has(name)) {
        countMap.set(name, {
          name,
          category: it.investigation?.category || 'General',
          count: 0,
        });
      }
      countMap.get(name)!.count += 1;
    });

    return Array.from(countMap.values()).sort((a, b) => b.count - a.count);
  }

  /**
   * Comprehensive time-series analytics and trend data for graphs
   */
  static async getAnalyticsTrends(filters: {
    granularity?: 'daily' | 'monthly' | 'yearly';
    startDate?: string;
    endDate?: string;
    departmentId?: string;
    doctorId?: string;
    paymentMethod?: string;
  }) {
    const granularity = filters.granularity || 'daily';

    // 1. Calculate date boundaries
    const now = new Date();
    let startDate: Date;
    let endDate: Date = filters.endDate ? new Date(filters.endDate) : new Date(now);
    endDate.setHours(23, 59, 59, 999);

    if (filters.startDate) {
      startDate = new Date(filters.startDate);
      startDate.setHours(0, 0, 0, 0);
    } else {
      startDate = new Date(now);
      if (granularity === 'daily') {
        startDate.setDate(startDate.getDate() - 14); // default last 14 days
      } else if (granularity === 'monthly') {
        startDate.setMonth(startDate.getMonth() - 12); // default last 12 months
      } else {
        startDate.setFullYear(startDate.getFullYear() - 5); // default last 5 years
      }
      startDate.setHours(0, 0, 0, 0);
    }

    // Build filter objects for prisma
    const invoiceWhere: any = {
      createdAt: { gte: startDate, lte: endDate },
      status: { not: InvoiceStatus.VOIDED },
    };
    if (filters.doctorId) invoiceWhere.doctorId = filters.doctorId;

    const visitWhere: any = {
      visitDateTime: { gte: startDate, lte: endDate },
    };
    if (filters.doctorId) visitWhere.doctorId = filters.doctorId;
    if (filters.departmentId) visitWhere.departmentId = filters.departmentId;

    const paymentWhere: any = {
      receivedAt: { gte: startDate, lte: endDate },
    };
    if (filters.paymentMethod) paymentWhere.paymentMethod = filters.paymentMethod;

    const [invoices, visits, payments, departments] = await Promise.all([
      prisma.invoice.findMany({
        where: invoiceWhere,
        include: {
          patient: true,
          doctor: { include: { department: true } },
          payments: true,
        },
      }),
      prisma.visit.findMany({
        where: visitWhere,
        include: {
          doctor: { include: { department: true } },
          department: true,
        },
      }),
      prisma.payment.findMany({
        where: paymentWhere,
      }),
      prisma.department.findMany({
        where: { isActive: true },
      }),
    ]);

    // 2. Build bucket keys for timeline based on granularity
    const timelineMap = new Map<string, {
      label: string;
      revenue: number;
      collected: number;
      pending: number;
      patientCount: number;
    }>();

    const getBucketKey = (d: Date): { key: string; label: string } => {
      const year = d.getFullYear();
      const monthNum = d.getMonth() + 1;
      const monthStr = String(monthNum).padStart(2, '0');
      const dayStr = String(d.getDate()).padStart(2, '0');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      if (granularity === 'monthly') {
        return { key: `${year}-${monthStr}`, label: `${monthNames[d.getMonth()]} ${year}` };
      } else if (granularity === 'yearly') {
        const yStr = String(year);
        return { key: yStr, label: yStr };
      } else {
        // Daily: Local YYYY-MM-DD
        const localIso = `${year}-${monthStr}-${dayStr}`;
        const label = `${d.getDate()} ${monthNames[d.getMonth()]}`;
        return { key: localIso, label };
      }
    };

    // Populate timeline buckets chronologically
    const curr = new Date(startDate);
    while (curr <= endDate) {
      const { key, label } = getBucketKey(curr);
      if (!timelineMap.has(key)) {
        timelineMap.set(key, { label, revenue: 0, collected: 0, pending: 0, patientCount: 0 });
      }
      if (granularity === 'daily') curr.setDate(curr.getDate() + 1);
      else if (granularity === 'monthly') curr.setMonth(curr.getMonth() + 1);
      else curr.setFullYear(curr.getFullYear() + 1);
    }

    // Populate invoice revenue data into buckets
    invoices.forEach((inv) => {
      if (filters.departmentId && inv.doctor?.departmentId !== filters.departmentId) return;

      const { key } = getBucketKey(new Date(inv.createdAt));
      let bucket = timelineMap.get(key);
      if (!bucket) {
        const { label } = getBucketKey(new Date(inv.createdAt));
        bucket = { label, revenue: 0, collected: 0, pending: 0, patientCount: 0 };
        timelineMap.set(key, bucket);
      }
      bucket.revenue += Number(inv.netTotal);
      bucket.collected += Number(inv.paidTotal);
      bucket.pending += Number(inv.balanceTotal);
    });

    // Populate patient visit counts into buckets
    visits.forEach((v) => {
      const { key } = getBucketKey(new Date(v.visitDateTime));
      let bucket = timelineMap.get(key);
      if (!bucket) {
        const { label } = getBucketKey(new Date(v.visitDateTime));
        bucket = { label, revenue: 0, collected: 0, pending: 0, patientCount: 0 };
        timelineMap.set(key, bucket);
      }
      bucket.patientCount += 1;
    });

    const timeline = Array.from(timelineMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, item]) => ({ key, ...item }));

    // 3. Compute Department Revenue & Volume Breakdown
    const deptMap = new Map<string, { id: string; name: string; revenue: number; patientCount: number }>();
    departments.forEach((d) => {
      deptMap.set(d.id, { id: d.id, name: d.name, revenue: 0, patientCount: 0 });
    });

    visits.forEach((v) => {
      if (deptMap.has(v.departmentId)) {
        deptMap.get(v.departmentId)!.patientCount += 1;
      }
    });

    invoices.forEach((inv) => {
      if (inv.doctor?.departmentId && deptMap.has(inv.doctor.departmentId)) {
        deptMap.get(inv.doctor.departmentId)!.revenue += Number(inv.netTotal);
      }
    });

    const departmentBreakdown = Array.from(deptMap.values())
      .filter((d) => d.revenue > 0 || d.patientCount > 0)
      .sort((a, b) => b.revenue - a.revenue);

    // 4. Compute Payment Method Breakdown
    const payMethodMap = new Map<string, { method: string; amount: number; count: number }>();
    payments.forEach((p) => {
      const m = p.paymentMethod;
      if (!payMethodMap.has(m)) {
        payMethodMap.set(m, { method: m, amount: 0, count: 0 });
      }
      const item = payMethodMap.get(m)!;
      item.amount += Number(p.amount);
      item.count += 1;
    });

    const paymentMethodBreakdown = Array.from(payMethodMap.values()).sort((a, b) => b.amount - a.amount);

    // 5. Calculate KPI Metrics
    const totalRevenue = timeline.reduce((acc, t) => acc + t.revenue, 0);
    const totalCollected = timeline.reduce((acc, t) => acc + t.collected, 0);
    const totalPending = timeline.reduce((acc, t) => acc + t.pending, 0);
    const totalPatients = timeline.reduce((acc, t) => acc + t.patientCount, 0);

    const averageRevenuePerPatient = totalPatients > 0 ? Math.round(totalRevenue / totalPatients) : 0;
    const collectionEfficiency = totalRevenue > 0 ? Math.round((totalCollected / totalRevenue) * 100) : 100;

    return {
      granularity,
      dateRange: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      },
      kpis: {
        totalRevenue,
        totalCollected,
        totalPending,
        totalPatients,
        averageRevenuePerPatient,
        collectionEfficiency,
      },
      timeline,
      departmentBreakdown,
      paymentMethodBreakdown,
    };
  }
}
