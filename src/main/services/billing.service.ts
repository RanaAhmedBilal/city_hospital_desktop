import { Decimal } from 'decimal.js';
import { prisma } from '../database/prisma';
import { NumberingService } from './numbering.service';
import { AuditService } from './audit.service';
import {
  InvoiceDto,
  PaymentDto,
  FinancialAdjustmentDto,
  ServiceDto,
  VisitChargeDto,
} from '../../shared/types';
import {
  InvoiceStatus,
  PaymentMethod,
  AdjustmentType,
  ChargeStatus,
  VisitPaymentStatus,
} from '../../shared/constants/enums';

export class BillingService {
  /**
   * Add a billable charge to a patient visit
   */
  static async addVisitCharge(data: {
    visitId: string;
    patientId: string;
    serviceId?: string | null;
    serviceName: string;
    description?: string | null;
    quantity: number;
    unitPrice: number;
    discount?: number;
    taxAmount?: number;
  }, authUserId: string): Promise<VisitChargeDto> {
    const qty = Math.max(1, data.quantity || 1);
    const unitPrice = new Decimal(data.unitPrice || 0);
    const discount = new Decimal(data.discount || 0);
    const tax = new Decimal(data.taxAmount || 0);

    const gross = unitPrice.times(qty);
    const net = Decimal.max(0, gross.minus(discount).plus(tax));

    const charge = await prisma.visitCharge.create({
      data: {
        visitId: data.visitId,
        patientId: data.patientId,
        serviceId: data.serviceId || null,
        serviceName: data.serviceName.trim(),
        description: data.description?.trim() || null,
        quantity: qty,
        unitPrice: unitPrice.toNumber(),
        discount: discount.toNumber(),
        taxAmount: tax.toNumber(),
        netAmount: net.toNumber(),
        status: ChargeStatus.DRAFT,
        createdById: authUserId,
      },
    });

    await AuditService.log({
      userId: authUserId,
      action: 'ADD_VISIT_CHARGE',
      entityType: 'VisitCharge',
      entityId: charge.id,
      newValue: { service: charge.serviceName, net: charge.netAmount },
    });

    return this.formatCharge(charge);
  }

  /**
   * Get all charges for a visit
   */
  static async getVisitCharges(visitId: string): Promise<VisitChargeDto[]> {
    const charges = await prisma.visitCharge.findMany({
      where: { visitId },
      orderBy: { createdAt: 'asc' },
    });
    return charges.map(this.formatCharge);
  }

  /**
   * Finalize Invoice atomically with historical price snapshots and optional initial payment
   */
  static async finalizeInvoice(data: {
    visitId: string;
    patientId: string;
    doctorId?: string | null;
    panelClientId?: string | null;
    panelClaimNo?: string | null;
    notes?: string | null;
    chargeIds: string[];
    discountTotal?: number;
    initialPayment?: {
      amount: number;
      paymentMethod: PaymentMethod;
      transactionReference?: string | null;
      notes?: string | null;
    };
  }, authUserId: string): Promise<InvoiceDto> {
    return await prisma.$transaction(async (tx) => {
      // 1. Fetch requested charges
      const charges = await tx.visitCharge.findMany({
        where: {
          id: { in: data.chargeIds },
          visitId: data.visitId,
          status: { not: ChargeStatus.VOIDED },
        },
      });

      if (charges.length === 0) {
        throw new Error('No valid charges selected for invoice generation.');
      }

      // Calculate totals using Decimal arithmetic
      let subtotal = new Decimal(0);
      let itemDiscountSum = new Decimal(0);
      let taxSum = new Decimal(0);

      charges.forEach((c) => {
        const itemGross = new Decimal(c.unitPrice).times(c.quantity);
        subtotal = subtotal.plus(itemGross);
        itemDiscountSum = itemDiscountSum.plus(c.discount);
        taxSum = taxSum.plus(c.taxAmount);
      });

      const globalDiscount = new Decimal(data.discountTotal || 0);
      const totalDiscount = itemDiscountSum.plus(globalDiscount);
      const netTotal = Decimal.max(0, subtotal.minus(totalDiscount).plus(taxSum));

      // Initial Payment check
      const initPayAmount = data.initialPayment ? new Decimal(data.initialPayment.amount) : new Decimal(0);
      const paidTotal = initPayAmount;
      const balanceTotal = Decimal.max(0, netTotal.minus(paidTotal));

      let invoiceStatus = InvoiceStatus.FINALIZED;
      if (balanceTotal.isZero() && paidTotal.isPositive()) {
        invoiceStatus = InvoiceStatus.PAID;
      } else if (paidTotal.isPositive() && balanceTotal.isPositive()) {
        invoiceStatus = InvoiceStatus.PARTIALLY_PAID;
      }

      // Concurrency-safe Invoice number
      const invoiceNumber = await NumberingService.getNextNumber('INVOICE', tx);

      // Create Invoice
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          visitId: data.visitId,
          patientId: data.patientId,
          doctorId: data.doctorId || null,
          panelClientId: data.panelClientId || null,
          subtotal: subtotal.toNumber(),
          discountTotal: totalDiscount.toNumber(),
          taxTotal: taxSum.toNumber(),
          netTotal: netTotal.toNumber(),
          paidTotal: paidTotal.toNumber(),
          balanceTotal: balanceTotal.toNumber(),
          status: invoiceStatus,
          panelClaimNo: data.panelClaimNo?.trim() || null,
          notes: data.notes?.trim() || null,
          createdById: authUserId,
          finalizedAt: new Date(),
        },
      });

      // Create Invoice Items (Immutable historical snapshots)
      for (const c of charges) {
        const itemNet = new Decimal(c.unitPrice).times(c.quantity).minus(c.discount).plus(c.taxAmount);

        await tx.invoiceItem.create({
          data: {
            invoiceId: invoice.id,
            chargeId: c.id,
            serviceName: c.serviceName,
            quantity: c.quantity,
            unitPrice: c.unitPrice,
            discount: c.discount,
            taxAmount: c.taxAmount,
            netAmount: Decimal.max(0, itemNet).toNumber(),
          },
        });

        // Mark charge as billed
        await tx.visitCharge.update({
          where: { id: c.id },
          data: { status: ChargeStatus.BILLED },
        });
      }

      // Record initial payment if provided
      if (data.initialPayment && initPayAmount.isPositive()) {
        const receiptNumber = await NumberingService.getNextNumber('RECEIPT', tx);

        await tx.payment.create({
          data: {
            receiptNumber,
            invoiceId: invoice.id,
            patientId: data.patientId,
            amount: initPayAmount.toNumber(),
            paymentMethod: data.initialPayment.paymentMethod,
            transactionReference: data.initialPayment.transactionReference?.trim() || null,
            notes: data.initialPayment.notes?.trim() || null,
            receivedById: authUserId,
          },
        });
      }

      // Update Visit payment status
      let visitPaymentStatus = VisitPaymentStatus.PARTIALLY_PAID;
      if (balanceTotal.isZero()) {
        visitPaymentStatus = data.panelClientId ? VisitPaymentStatus.CREDIT_PANEL : VisitPaymentStatus.PAID;
      }

      await tx.visit.update({
        where: { id: data.visitId },
        data: { paymentStatus: visitPaymentStatus },
      });

      await AuditService.log(
        {
          userId: authUserId,
          action: 'INVOICE_FINALIZE',
          entityType: 'Invoice',
          entityId: invoice.id,
          newValue: {
            invoiceNumber: invoice.invoiceNumber,
            netTotal: invoice.netTotal,
            paidTotal: invoice.paidTotal,
            balance: invoice.balanceTotal,
          },
        },
        tx
      );

      const fullInvoice = await tx.invoice.findUnique({
        where: { id: invoice.id },
        include: {
          patient: true,
          doctor: true,
          panelClient: true,
          items: true,
          payments: true,
          adjustments: true,
        },
      });

      return this.formatInvoice(fullInvoice!);
    });
  }

  /**
   * Receive standalone payment against an invoice
   */
  static async recordPayment(data: {
    invoiceId: string;
    patientId: string;
    amount: number;
    paymentMethod: PaymentMethod;
    transactionReference?: string | null;
    notes?: string | null;
  }, authUserId: string): Promise<PaymentDto> {
    return await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id: data.invoiceId },
      });

      if (!invoice) throw new Error('Invoice not found');
      if (invoice.status === InvoiceStatus.VOIDED) {
        throw new Error('Cannot receive payment for a voided invoice.');
      }

      const payAmount = new Decimal(data.amount);
      if (payAmount.isZero() || payAmount.isNegative()) {
        throw new Error('Payment amount must be positive.');
      }

      const currentPaid = new Decimal(invoice.paidTotal);
      const currentNet = new Decimal(invoice.netTotal);
      const newPaid = currentPaid.plus(payAmount);
      const newBalance = Decimal.max(0, currentNet.minus(newPaid));

      const receiptNumber = await NumberingService.getNextNumber('RECEIPT', tx);

      const payment = await tx.payment.create({
        data: {
          receiptNumber,
          invoiceId: data.invoiceId,
          patientId: data.patientId,
          amount: payAmount.toNumber(),
          paymentMethod: data.paymentMethod,
          transactionReference: data.transactionReference?.trim() || null,
          notes: data.notes?.trim() || null,
          receivedById: authUserId,
        },
      });

      // Update invoice status & paid totals
      let status = invoice.status;
      if (newBalance.isZero()) {
        status = InvoiceStatus.PAID;
      } else {
        status = InvoiceStatus.PARTIALLY_PAID;
      }

      await tx.invoice.update({
        where: { id: data.invoiceId },
        data: {
          paidTotal: newPaid.toNumber(),
          balanceTotal: newBalance.toNumber(),
          status,
        },
      });

      // Update visit payment status
      await tx.visit.update({
        where: { id: invoice.visitId },
        data: {
          paymentStatus: newBalance.isZero() ? VisitPaymentStatus.PAID : VisitPaymentStatus.PARTIALLY_PAID,
        },
      });

      await AuditService.log(
        {
          userId: authUserId,
          action: 'PAYMENT_RECEIVE',
          entityType: 'Payment',
          entityId: payment.id,
          newValue: {
            receiptNumber: payment.receiptNumber,
            amount: payment.amount,
            method: payment.paymentMethod,
          },
        },
        tx
      );

      return {
        id: payment.id,
        receiptNumber: payment.receiptNumber,
        invoiceId: payment.invoiceId,
        patientId: payment.patientId,
        amount: Number(payment.amount),
        paymentMethod: payment.paymentMethod as PaymentMethod,
        transactionReference: payment.transactionReference,
        notes: payment.notes,
        receivedById: payment.receivedById,
        receivedAt: payment.receivedAt.toISOString(),
      };
    });
  }

  /**
   * Apply Financial Adjustment (Refund, Correction, Discount adjustment, Void) with strict audit
   */
  static async applyAdjustment(data: {
    invoiceId: string;
    paymentId?: string | null;
    type: AdjustmentType;
    adjustedAmount: number;
    reason: string;
  }, authUserId: string): Promise<FinancialAdjustmentDto> {
    return await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id: data.invoiceId },
      });

      if (!invoice) throw new Error('Invoice not found');

      const originalNet = new Decimal(invoice.netTotal);
      const targetAdjusted = new Decimal(data.adjustedAmount);
      const diff = targetAdjusted.minus(originalNet);

      const adjNumber = await NumberingService.getNextNumber('ADJUSTMENT', tx);

      const adjustment = await tx.financialAdjustment.create({
        data: {
          adjustmentNumber: adjNumber,
          invoiceId: data.invoiceId,
          paymentId: data.paymentId || null,
          type: data.type,
          originalAmount: originalNet.toNumber(),
          adjustedAmount: targetAdjusted.toNumber(),
          differenceAmount: diff.toNumber(),
          reason: data.reason.trim(),
          authorizedById: authUserId,
        },
      });

      // Modify invoice status / totals accordingly
      let newStatus = invoice.status;
      if (data.type === AdjustmentType.VOID) {
        newStatus = InvoiceStatus.VOIDED;
        await tx.invoice.update({
          where: { id: data.invoiceId },
          data: { status: newStatus, balanceTotal: 0 },
        });
        await tx.visit.update({
          where: { id: invoice.visitId },
          data: { paymentStatus: VisitPaymentStatus.VOID },
        });
      } else if (data.type === AdjustmentType.REFUND) {
        newStatus = InvoiceStatus.REFUNDED;
        await tx.invoice.update({
          where: { id: data.invoiceId },
          data: { status: newStatus },
        });
      } else {
        newStatus = InvoiceStatus.ADJUSTED;
        const newPaid = new Decimal(invoice.paidTotal);
        const newBal = Decimal.max(0, targetAdjusted.minus(newPaid));

        await tx.invoice.update({
          where: { id: data.invoiceId },
          data: {
            netTotal: targetAdjusted.toNumber(),
            balanceTotal: newBal.toNumber(),
            status: newStatus,
          },
        });
      }

      await AuditService.log(
        {
          userId: authUserId,
          action: `FINANCIAL_ADJUSTMENT_${data.type}`,
          entityType: 'FinancialAdjustment',
          entityId: adjustment.id,
          reason: data.reason,
          oldValue: { netTotal: invoice.netTotal, status: invoice.status },
          newValue: { adjustedAmount: data.adjustedAmount, status: newStatus },
        },
        tx
      );

      return {
        id: adjustment.id,
        adjustmentNumber: adjustment.adjustmentNumber,
        invoiceId: adjustment.invoiceId,
        paymentId: adjustment.paymentId,
        type: adjustment.type as AdjustmentType,
        originalAmount: Number(adjustment.originalAmount),
        adjustedAmount: Number(adjustment.adjustedAmount),
        differenceAmount: Number(adjustment.differenceAmount),
        reason: adjustment.reason,
        authorizedById: adjustment.authorizedById,
        createdAt: adjustment.createdAt.toISOString(),
      };
    });
  }

  /**
   * Get invoice by ID with full itemization, receipts, and patient info
   */
  static async getInvoiceById(id: string): Promise<InvoiceDto | null> {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        patient: { include: { panelClient: true } },
        doctor: true,
        panelClient: true,
        items: true,
        payments: { orderBy: { receivedAt: 'asc' } },
        adjustments: { orderBy: { createdAt: 'desc' } },
      },
    });

    return invoice ? this.formatInvoice(invoice) : null;
  }

  /**
   * Get invoices list with filtering
   */
  static async getInvoices(filters: {
    startDate?: string;
    endDate?: string;
    visitId?: string;
    patientId?: string;
    doctorId?: string;
    status?: InvoiceStatus;
    limit?: number;
  }): Promise<InvoiceDto[]> {
    const where: any = {};
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }
    if (filters.visitId) where.visitId = filters.visitId;
    if (filters.patientId) where.patientId = filters.patientId;
    if (filters.doctorId) where.doctorId = filters.doctorId;
    if (filters.status) where.status = filters.status;

    const invoices = await prisma.invoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters.limit || 100,
      include: {
        patient: { include: { panelClient: true } },
        doctor: true,
        panelClient: true,
        items: true,
        payments: true,
        adjustments: true,
      },
    });

    return invoices.map(this.formatInvoice);
  }

  private static formatCharge(c: any): VisitChargeDto {
    return {
      id: c.id,
      visitId: c.visitId,
      patientId: c.patientId,
      serviceId: c.serviceId,
      serviceName: c.serviceName,
      description: c.description,
      quantity: c.quantity,
      unitPrice: Number(c.unitPrice),
      discount: Number(c.discount),
      taxAmount: Number(c.taxAmount),
      netAmount: Number(c.netAmount),
      status: c.status,
      createdById: c.createdById,
      createdAt: c.createdAt.toISOString(),
    };
  }

  private static formatInvoice(inv: any): InvoiceDto {
    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      visitId: inv.visitId,
      patientId: inv.patientId,
      patient: inv.patient
        ? {
            id: inv.patient.id,
            mrn: inv.patient.mrn,
            fullName: inv.patient.fullName,
            guardianName: inv.patient.guardianName,
            dob: inv.patient.dob ? inv.patient.dob.toISOString().split('T')[0] : null,
            age: inv.patient.age,
            gender: inv.patient.gender,
            bloodGroup: inv.patient.bloodGroup,
            phone: inv.patient.phone,
            alternatePhone: inv.patient.alternatePhone,
            address: inv.patient.address,
            city: inv.patient.city,
            nic: inv.patient.nic,
            employeeId: inv.patient.employeeId,
            panelClientId: inv.patient.panelClientId,
            panelClientName: inv.patient.panelClient?.name || null,
            emergencyContactName: inv.patient.emergencyContactName,
            emergencyContactPhone: inv.patient.emergencyContactPhone,
            emergencyContactRelation: inv.patient.emergencyContactRelation,
            registrationDate: inv.patient.registrationDate.toISOString(),
            isActive: inv.patient.isActive,
            notes: inv.patient.notes,
          }
        : undefined,
      doctorId: inv.doctorId,
      doctorName: inv.doctor?.name,
      departmentName: inv.doctor?.department?.name,
      panelClientId: inv.panelClientId,
      panelClientName: inv.panelClient?.name,
      subtotal: Number(inv.subtotal),
      discountTotal: Number(inv.discountTotal),
      taxTotal: Number(inv.taxTotal),
      netTotal: Number(inv.netTotal),
      paidTotal: Number(inv.paidTotal),
      balanceTotal: Number(inv.balanceTotal),
      status: inv.status,
      panelClaimNo: inv.panelClaimNo,
      notes: inv.notes,
      createdById: inv.createdById,
      createdAt: inv.createdAt.toISOString(),
      finalizedAt: inv.finalizedAt ? inv.finalizedAt.toISOString() : null,
      items: inv.items ? inv.items.map((it: any) => ({
        id: it.id,
        invoiceId: it.invoiceId,
        chargeId: it.chargeId,
        serviceName: it.serviceName,
        quantity: it.quantity,
        unitPrice: Number(it.unitPrice),
        discount: Number(it.discount),
        taxAmount: Number(it.taxAmount),
        netAmount: Number(it.netAmount),
      })) : [],
      payments: inv.payments ? inv.payments.map((p: any) => ({
        id: p.id,
        receiptNumber: p.receiptNumber,
        invoiceId: p.invoiceId,
        patientId: p.patientId,
        amount: Number(p.amount),
        paymentMethod: p.paymentMethod as PaymentMethod,
        transactionReference: p.transactionReference,
        notes: p.notes,
        receivedById: p.receivedById,
        receivedAt: p.receivedAt.toISOString(),
      })) : [],
      adjustments: inv.adjustments ? inv.adjustments.map((a: any) => ({
        id: a.id,
        adjustmentNumber: a.adjustmentNumber,
        invoiceId: a.invoiceId,
        paymentId: a.paymentId,
        type: a.type as AdjustmentType,
        originalAmount: Number(a.originalAmount),
        adjustedAmount: Number(a.adjustedAmount),
        differenceAmount: Number(a.differenceAmount),
        reason: a.reason,
        authorizedById: a.authorizedById,
        createdAt: a.createdAt.toISOString(),
      })) : [],
    };
  }
}
