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
}
