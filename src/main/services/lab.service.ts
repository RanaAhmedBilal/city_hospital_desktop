import { Decimal } from 'decimal.js';
import { prisma } from '../database/prisma';
import { NumberingService } from './numbering.service';
import { AuditService } from './audit.service';
import { InvoiceDto, VisitChargeDto } from '../../shared/types';
import { ChargeStatus, InvoiceStatus, VisitPaymentStatus } from '../../shared/constants/enums';

export interface LabCatalogItem {
  code: string;
  name: string;
  category: string;
  defaultFee: number;
  sampleType: string;
  containerType: string;
  tatHours: number;
}

export const STANDARD_LAB_CATALOG: LabCatalogItem[] = [
  { code: 'CBC', name: 'Complete Blood Count (CBC / CP)', category: 'Hematology', defaultFee: 800, sampleType: 'Whole Blood', containerType: 'EDTA Purple Top', tatHours: 4 },
  { code: 'ESR', name: 'Erythrocyte Sedimentation Rate (ESR)', category: 'Hematology', defaultFee: 400, sampleType: 'Whole Blood', containerType: 'EDTA Purple Top', tatHours: 2 },
  { code: 'BSF', name: 'Blood Sugar Fasting (BSF)', category: 'Biochemistry', defaultFee: 350, sampleType: 'Plasma', containerType: 'Fluoride Grey Top', tatHours: 2 },
  { code: 'BSR', name: 'Blood Sugar Random (BSR)', category: 'Biochemistry', defaultFee: 350, sampleType: 'Plasma', containerType: 'Fluoride Grey Top', tatHours: 1 },
  { code: 'HBA1C', name: 'HbA1c (Glycated Hemoglobin)', category: 'Biochemistry', defaultFee: 1600, sampleType: 'Whole Blood', containerType: 'EDTA Purple Top', tatHours: 6 },
  { code: 'LFT', name: 'Liver Function Tests (LFT Complete)', category: 'Biochemistry', defaultFee: 1800, sampleType: 'Serum', containerType: 'Gel / Red Top', tatHours: 6 },
  { code: 'RFT', name: 'Renal Function Tests (RFT / Urea & Creatinine)', category: 'Biochemistry', defaultFee: 1400, sampleType: 'Serum', containerType: 'Gel / Red Top', tatHours: 4 },
  { code: 'CREAT', name: 'Serum Creatinine', category: 'Biochemistry', defaultFee: 600, sampleType: 'Serum', containerType: 'Gel / Red Top', tatHours: 3 },
  { code: 'LIPID', name: 'Lipid Profile (Cholesterol, HDL, LDL, Triglycerides)', category: 'Biochemistry', defaultFee: 2000, sampleType: 'Serum', containerType: 'Gel / Red Top', tatHours: 6 },
  { code: 'URIC', name: 'Serum Uric Acid', category: 'Biochemistry', defaultFee: 650, sampleType: 'Serum', containerType: 'Gel / Red Top', tatHours: 4 },
  { code: 'ELECTRO', name: 'Serum Electrolytes (Na+, K+, Cl-)', category: 'Biochemistry', defaultFee: 1200, sampleType: 'Serum', containerType: 'Gel / Red Top', tatHours: 4 },
  { code: 'TSH', name: 'Thyroid Stimulating Hormone (TSH)', category: 'Endocrinology', defaultFee: 1500, sampleType: 'Serum', containerType: 'Gel / Red Top', tatHours: 12 },
  { code: 'T3T4TSH', name: 'Complete Thyroid Profile (FT3, FT4, TSH)', category: 'Endocrinology', defaultFee: 3200, sampleType: 'Serum', containerType: 'Gel / Red Top', tatHours: 12 },
  { code: 'URINE_RE', name: 'Urine Routine Examination (R/E)', category: 'Clinical Pathology', defaultFee: 450, sampleType: 'Urine', containerType: 'Sterile Urine Container', tatHours: 2 },
  { code: 'STOOL_RE', name: 'Stool Routine Examination (R/E)', category: 'Clinical Pathology', defaultFee: 500, sampleType: 'Stool', containerType: 'Stool Container', tatHours: 3 },
  { code: 'WIDAL', name: 'Typhidot / Widal Test (Typhoid)', category: 'Serology', defaultFee: 900, sampleType: 'Serum', containerType: 'Gel / Red Top', tatHours: 3 },
  { code: 'HEPB', name: 'HBsAg Screening (Hepatitis B)', category: 'Serology', defaultFee: 1000, sampleType: 'Serum', containerType: 'Gel / Red Top', tatHours: 4 },
  { code: 'HEPC', name: 'Anti-HCV Screening (Hepatitis C)', category: 'Serology', defaultFee: 1000, sampleType: 'Serum', containerType: 'Gel / Red Top', tatHours: 4 },
  { code: 'HIV', name: 'HIV 1 & 2 Rapid Screening', category: 'Serology', defaultFee: 1200, sampleType: 'Serum', containerType: 'Gel / Red Top', tatHours: 4 },
  { code: 'XRAY_CHEST', name: 'X-Ray Chest PA View', category: 'Radiology', defaultFee: 1200, sampleType: 'Imaging', containerType: 'X-Ray Machine', tatHours: 1 },
  { code: 'ECG', name: '12-Lead Resting ECG', category: 'Cardiology', defaultFee: 800, sampleType: 'Diagnostic', containerType: 'ECG Station', tatHours: 1 },
  { code: 'USG_ABD', name: 'Ultrasound Abdomen & Pelvis', category: 'Ultrasound', defaultFee: 2200, sampleType: 'Diagnostic', containerType: 'Ultrasound Probe', tatHours: 2 },
];

export class LabService {
  /**
   * Get list of standard lab tests
   */
  static async getLabCatalog(): Promise<LabCatalogItem[]> {
    return STANDARD_LAB_CATALOG;
  }

  /**
   * Order prescribed lab tests, record sample collection, and automatically create a separate Unpaid Lab Bill
   */
  static async orderLabTestsAndCreateBill(data: {
    visitId: string;
    patientId: string;
    tests: Array<{
      code?: string;
      name: string;
      category?: string;
      sampleType?: string;
      fee: number;
    }>;
    sampleDetails: {
      sampleType: string;
      containerType?: string;
      barcode?: string;
      collectionNotes?: string;
    };
  }, authUserId: string): Promise<{
    invoice: InvoiceDto;
    charges: VisitChargeDto[];
    sampleRecord: {
      barcode: string;
      sampleType: string;
      collectedAt: string;
    };
  }> {
    if (!data.tests || data.tests.length === 0) {
      throw new Error('Please select at least one laboratory test to order.');
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Check Visit and Patient
      const visit = await tx.visit.findUnique({
        where: { id: data.visitId },
        include: { patient: { include: { panelClient: true } }, doctor: true },
      });

      if (!visit) throw new Error('Patient visit encounter not found.');

      // Check for panel client discount
      let panelDiscountPercent = 0;
      if (visit.patient.panelClient && Number(visit.patient.panelClient.discountPercent) > 0) {
        panelDiscountPercent = Number(visit.patient.panelClient.discountPercent);
      }

      // Generate barcode / Sample accession number
      const sampleBarcode = data.sampleDetails.barcode?.trim() || `SMP-${Date.now().toString().slice(-6)}`;
      const createdCharges: any[] = [];
      let subtotal = new Decimal(0);
      let totalDiscount = new Decimal(0);

      // 2. Create VisitCharge for each lab test
      for (const t of data.tests) {
        const unitPrice = new Decimal(t.fee || 0);
        let discount = new Decimal(0);
        if (panelDiscountPercent > 0) {
          discount = unitPrice.times(panelDiscountPercent).dividedBy(100);
        }

        const netAmount = Decimal.max(0, unitPrice.minus(discount));
        subtotal = subtotal.plus(unitPrice);
        totalDiscount = totalDiscount.plus(discount);

        const charge = await tx.visitCharge.create({
          data: {
            visitId: data.visitId,
            patientId: data.patientId,
            serviceName: `Lab: ${t.name}`,
            description: `Sample: ${data.sampleDetails.sampleType} [Barcode: ${sampleBarcode}]`,
            quantity: 1,
            unitPrice: unitPrice.toNumber(),
            discount: discount.toNumber(),
            taxAmount: 0,
            netAmount: netAmount.toNumber(),
            status: ChargeStatus.DRAFT,
            createdById: authUserId,
          },
        });

        createdCharges.push(charge);
      }

      const netTotal = Decimal.max(0, subtotal.minus(totalDiscount));

      // 3. Create a dedicated UNPAID / FINALIZED Lab Invoice
      const invoiceNumber = await NumberingService.getNextNumber('INVOICE', tx);

      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          visitId: data.visitId,
          patientId: data.patientId,
          doctorId: visit.doctorId,
          panelClientId: visit.patient.panelClientId || null,
          subtotal: subtotal.toNumber(),
          discountTotal: totalDiscount.toNumber(),
          taxTotal: 0,
          netTotal: netTotal.toNumber(),
          paidTotal: 0,
          balanceTotal: netTotal.toNumber(),
          status: InvoiceStatus.FINALIZED, // Unpaid bill
          notes: `Laboratory & Diagnostic Investigations (Sample Barcode: ${sampleBarcode}). ${data.sampleDetails.collectionNotes || ''}`.trim(),
          createdById: authUserId,
          finalizedAt: new Date(),
        },
      });

      // 4. Create Invoice Items and mark charges as BILLED
      for (const c of createdCharges) {
        await tx.invoiceItem.create({
          data: {
            invoiceId: invoice.id,
            chargeId: c.id,
            serviceName: c.serviceName,
            quantity: c.quantity,
            unitPrice: c.unitPrice,
            discount: c.discount,
            taxAmount: 0,
            netAmount: c.netAmount,
          },
        });

        await tx.visitCharge.update({
          where: { id: c.id },
          data: { status: ChargeStatus.BILLED },
        });
      }

      // Update visit payment status if it was UNBILLED
      if (visit.paymentStatus === VisitPaymentStatus.UNBILLED) {
        await tx.visit.update({
          where: { id: data.visitId },
          data: { paymentStatus: VisitPaymentStatus.UNBILLED },
        });
      }

      // 5. Audit Log
      await AuditService.log({
        userId: authUserId,
        action: 'ORDER_LAB_TESTS',
        entityType: 'Invoice',
        entityId: invoice.id,
        newValue: {
          invoiceNumber: invoice.invoiceNumber,
          testsCount: data.tests.length,
          sampleBarcode,
          netTotal: invoice.netTotal,
        },
      }, tx);

      // Return formatted objects
      return {
        invoice: {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          visitId: invoice.visitId,
          patientId: invoice.patientId,
          doctorId: invoice.doctorId,
          panelClientId: invoice.panelClientId,
          subtotal: Number(invoice.subtotal),
          discountTotal: Number(invoice.discountTotal),
          taxTotal: Number(invoice.taxTotal),
          netTotal: Number(invoice.netTotal),
          paidTotal: Number(invoice.paidTotal),
          balanceTotal: Number(invoice.balanceTotal),
          status: invoice.status as any,
          panelClaimNo: null,
          notes: invoice.notes,
          createdById: invoice.createdById,
          finalizedAt: invoice.finalizedAt?.toISOString() || null,
          createdAt: invoice.createdAt.toISOString(),
          items: createdCharges.map((c) => ({
            id: c.id,
            invoiceId: invoice.id,
            chargeId: c.id,
            serviceName: c.serviceName,
            quantity: c.quantity,
            unitPrice: Number(c.unitPrice),
            discount: Number(c.discount),
            taxAmount: 0,
            netAmount: Number(c.netAmount),
          })),
          payments: [],
          adjustments: [],
        },
        charges: createdCharges.map((c) => ({
          id: c.id,
          visitId: c.visitId,
          patientId: c.patientId,
          serviceId: null,
          serviceName: c.serviceName,
          description: c.description,
          quantity: c.quantity,
          unitPrice: Number(c.unitPrice),
          discount: Number(c.discount),
          taxAmount: 0,
          netAmount: Number(c.netAmount),
          status: c.status as any,
          createdById: c.createdById,
          createdAt: c.createdAt.toISOString(),
        })),
        sampleRecord: {
          barcode: sampleBarcode,
          sampleType: data.sampleDetails.sampleType,
          collectedAt: new Date().toISOString(),
        },
      };
    });
  }
}
