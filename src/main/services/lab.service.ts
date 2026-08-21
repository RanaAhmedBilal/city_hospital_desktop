import { Decimal } from 'decimal.js';
import { prisma } from '../database/prisma';
import { NumberingService } from './numbering.service';
import { AuditService } from './audit.service';
import { InvoiceDto, VisitChargeDto } from '../../shared/types';
import { ChargeStatus, InvoiceStatus, VisitPaymentStatus } from '../../shared/constants/enums';

export interface LabCatalogItem {
  id?: string;
  code: string;
  name: string;
  category: string;
  defaultFee: number;
  sampleType: string;
  containerType: string;
  tatHours: number;
  isActive?: boolean;
}

export const STANDARD_LAB_CATALOG: LabCatalogItem[] = [
  { code: 'CBC', name: 'Complete Blood Count (CBC / CP)', category: 'Hematology', defaultFee: 800, sampleType: 'Whole Blood', containerType: 'EDTA Purple Top', tatHours: 4, isActive: true },
  { code: 'ESR', name: 'Erythrocyte Sedimentation Rate (ESR)', category: 'Hematology', defaultFee: 400, sampleType: 'Whole Blood', containerType: 'EDTA Purple Top', tatHours: 2, isActive: true },
  { code: 'BSF', name: 'Blood Sugar Fasting (BSF)', category: 'Biochemistry', defaultFee: 350, sampleType: 'Plasma', containerType: 'Fluoride Grey Top', tatHours: 2, isActive: true },
  { code: 'BSR', name: 'Blood Sugar Random (BSR)', category: 'Biochemistry', defaultFee: 350, sampleType: 'Plasma', containerType: 'Fluoride Grey Top', tatHours: 1, isActive: true },
  { code: 'HBA1C', name: 'HbA1c (Glycated Hemoglobin)', category: 'Biochemistry', defaultFee: 1600, sampleType: 'Whole Blood', containerType: 'EDTA Purple Top', tatHours: 6, isActive: true },
  { code: 'LFT', name: 'Liver Function Tests (LFT Complete)', category: 'Biochemistry', defaultFee: 1800, sampleType: 'Serum', containerType: 'Gel / Red Top', tatHours: 6, isActive: true },
  { code: 'RFT', name: 'Renal Function Tests (RFT / Urea & Creatinine)', category: 'Biochemistry', defaultFee: 1400, sampleType: 'Serum', containerType: 'Gel / Red Top', tatHours: 4, isActive: true },
  { code: 'CREAT', name: 'Serum Creatinine', category: 'Biochemistry', defaultFee: 600, sampleType: 'Serum', containerType: 'Gel / Red Top', tatHours: 3, isActive: true },
  { code: 'LIPID', name: 'Lipid Profile (Cholesterol, HDL, LDL, Triglycerides)', category: 'Biochemistry', defaultFee: 2000, sampleType: 'Serum', containerType: 'Gel / Red Top', tatHours: 6, isActive: true },
  { code: 'URIC', name: 'Serum Uric Acid', category: 'Biochemistry', defaultFee: 650, sampleType: 'Serum', containerType: 'Gel / Red Top', tatHours: 4, isActive: true },
  { code: 'ELECTRO', name: 'Serum Electrolytes (Na+, K+, Cl-)', category: 'Biochemistry', defaultFee: 1200, sampleType: 'Serum', containerType: 'Gel / Red Top', tatHours: 4, isActive: true },
  { code: 'TSH', name: 'Thyroid Stimulating Hormone (TSH)', category: 'Endocrinology', defaultFee: 1500, sampleType: 'Serum', containerType: 'Gel / Red Top', tatHours: 12, isActive: true },
  { code: 'T3T4TSH', name: 'Complete Thyroid Profile (FT3, FT4, TSH)', category: 'Endocrinology', defaultFee: 3200, sampleType: 'Serum', containerType: 'Gel / Red Top', tatHours: 12, isActive: true },
  { code: 'URINE_RE', name: 'Urine Routine Examination (R/E)', category: 'Clinical Pathology', defaultFee: 450, sampleType: 'Urine', containerType: 'Sterile Urine Container', tatHours: 2, isActive: true },
  { code: 'STOOL_RE', name: 'Stool Routine Examination (R/E)', category: 'Clinical Pathology', defaultFee: 500, sampleType: 'Stool', containerType: 'Stool Container', tatHours: 3, isActive: true },
  { code: 'WIDAL', name: 'Typhidot / Widal Test (Typhoid)', category: 'Serology', defaultFee: 900, sampleType: 'Serum', containerType: 'Gel / Red Top', tatHours: 3, isActive: true },
  { code: 'HEPB', name: 'HBsAg Screening (Hepatitis B)', category: 'Serology', defaultFee: 1000, sampleType: 'Serum', containerType: 'Gel / Red Top', tatHours: 4, isActive: true },
  { code: 'HEPC', name: 'Anti-HCV Screening (Hepatitis C)', category: 'Serology', defaultFee: 1000, sampleType: 'Serum', containerType: 'Gel / Red Top', tatHours: 4, isActive: true },
  { code: 'HIV', name: 'HIV 1 & 2 Rapid Screening', category: 'Serology', defaultFee: 1200, sampleType: 'Serum', containerType: 'Gel / Red Top', tatHours: 4, isActive: true },
  { code: 'XRAY_CHEST', name: 'X-Ray Chest PA View', category: 'Radiology', defaultFee: 1200, sampleType: 'Imaging', containerType: 'X-Ray Machine', tatHours: 1, isActive: true },
  { code: 'ECG', name: '12-Lead Resting ECG', category: 'Cardiology', defaultFee: 800, sampleType: 'Diagnostic', containerType: 'ECG Station', tatHours: 1, isActive: true },
  { code: 'USG_ABD', name: 'Ultrasound Abdomen & Pelvis', category: 'Ultrasound', defaultFee: 2200, sampleType: 'Diagnostic', containerType: 'Ultrasound Probe', tatHours: 2, isActive: true },
];

let customLabCatalogStore: LabCatalogItem[] = [...STANDARD_LAB_CATALOG];

export class LabService {
  /**
   * Get list of active standard and custom lab catalog items
   */
  static async getLabCatalog(): Promise<LabCatalogItem[]> {
    return customLabCatalogStore.filter((item) => item.isActive !== false);
  }

  /**
   * Create or update a lab catalog item
   */
  static async saveLabCatalogItem(itemData: Partial<LabCatalogItem>, authUserId?: string): Promise<LabCatalogItem[]> {
    if (!itemData.code || !itemData.name) {
      throw new Error('Test code and test name are required.');
    }

    const cleanCode = itemData.code.trim().toUpperCase();

    const existingIdx = customLabCatalogStore.findIndex(
      (c) => c.code.trim().toUpperCase() === cleanCode
    );

    const updatedItem: LabCatalogItem = {
      code: cleanCode,
      name: itemData.name.trim(),
      category: itemData.category?.trim() || 'General Pathology',
      defaultFee: Number(itemData.defaultFee) || 500,
      sampleType: itemData.sampleType?.trim() || 'Whole Blood / Serum',
      containerType: itemData.containerType?.trim() || 'Purple EDTA / Red Gel',
      tatHours: Number(itemData.tatHours) || 4,
      isActive: itemData.isActive !== undefined ? Boolean(itemData.isActive) : true,
    };

    if (existingIdx >= 0) {
      customLabCatalogStore[existingIdx] = updatedItem;
    } else {
      customLabCatalogStore.push(updatedItem);
    }

    if (authUserId) {
      await AuditService.log({
        userId: authUserId,
        action: existingIdx >= 0 ? 'UPDATE_LAB_CATALOG_ITEM' : 'CREATE_LAB_CATALOG_ITEM',
        entityType: 'LabCatalogItem',
        entityId: cleanCode,
        newValue: updatedItem,
      });
    }

    return LabService.getLabCatalog();
  }

  /**
   * Delete or deactivate a lab catalog item
   */
  static async deleteLabCatalogItem(code: string, authUserId?: string): Promise<LabCatalogItem[]> {
    const cleanCode = code.trim().toUpperCase();
    customLabCatalogStore = customLabCatalogStore.filter((c) => c.code.trim().toUpperCase() !== cleanCode);

    if (authUserId) {
      await AuditService.log({
        userId: authUserId,
        action: 'DELETE_LAB_CATALOG_ITEM',
        entityType: 'LabCatalogItem',
        entityId: cleanCode,
      });
    }

    return LabService.getLabCatalog();
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

  /**
   * Get prescribed lab tests for a specific patient visit
   */
  static async getPrescribedTestsForVisit(visitId: string) {
    const rx = await prisma.prescription.findFirst({
      where: { visitId },
      include: {
        doctor: true,
        investigations: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!rx) return null;

    return {
      prescriptionId: rx.id,
      prescriptionNo: rx.prescriptionNo,
      diagnosis: rx.diagnosis,
      clinicalNotes: rx.clinicalNotes,
      advice: rx.advice,
      doctorName: rx.doctor?.name,
      doctorSpecialty: rx.doctor?.specialty,
      status: rx.status,
      createdAt: rx.createdAt.toISOString(),
      investigations: rx.investigations.map((inv) => ({
        id: inv.id,
        investigationName: inv.investigationName,
        instructions: inv.instructions,
      })),
    };
  }

  /**
   * Get historical list of prescribed & ordered lab tests across visits
   */
  static async getLabHistory(query?: string) {
    const trimmedQuery = query?.trim().toLowerCase() || '';

    // Fetch prescriptions that have investigations
    const prescriptions = await prisma.prescription.findMany({
      where: {
        investigations: { some: {} },
      },
      include: {
        doctor: true,
        visit: {
          include: {
            patient: true,
            invoices: {
              include: { items: true },
            },
          },
        },
        investigations: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const results = prescriptions.map((rx) => {
      // Check if there is an invoice linked to this visit with lab items
      const labInvoice = rx.visit.invoices.find(
        (inv) =>
          inv.notes?.toLowerCase().includes('sample barcode') ||
          inv.items.some((it) => it.serviceName.toLowerCase().includes('lab:'))
      );

      // Extract sample barcode if available
      let sampleBarcode: string | null = null;
      if (labInvoice && labInvoice.notes) {
        const match = labInvoice.notes.match(/Sample Barcode:\s*([^\)\.\,]+)/i);
        if (match) {
          sampleBarcode = match[1].trim();
        }
      }

      return {
        id: rx.id,
        prescriptionNo: rx.prescriptionNo,
        visitId: rx.visitId,
        patientId: rx.patientId,
        patient: {
          id: rx.visit.patient.id,
          mrn: rx.visit.patient.mrn,
          fullName: rx.visit.patient.fullName,
          age: rx.visit.patient.age,
          gender: rx.visit.patient.gender,
          phone: rx.visit.patient.phone,
        },
        doctor: {
          id: rx.doctor.id,
          name: rx.doctor.name,
          specialty: rx.doctor.specialty,
          printableTitle: rx.doctor.printableTitle,
        },
        visit: {
          id: rx.visit.id,
          visitNumber: rx.visit.visitNumber,
          visitDateTime: rx.visit.visitDateTime.toISOString(),
          tokenNumber: rx.visit.tokenNumber,
        },
        investigations: rx.investigations.map((inv) => ({
          id: inv.id,
          investigationName: inv.investigationName,
          instructions: inv.instructions,
        })),
        prescriptionStatus: rx.status,
        createdAt: rx.createdAt.toISOString(),
        invoice: labInvoice
          ? {
              id: labInvoice.id,
              invoiceNumber: labInvoice.invoiceNumber,
              netTotal: Number(labInvoice.netTotal),
              paidTotal: Number(labInvoice.paidTotal),
              balanceTotal: Number(labInvoice.balanceTotal),
              status: labInvoice.status,
              sampleBarcode: sampleBarcode || 'Recorded',
            }
          : null,
      };
    });

    if (!trimmedQuery) return results;

    return results.filter((item) => {
      const matchPatient =
        item.patient.fullName.toLowerCase().includes(trimmedQuery) ||
        item.patient.mrn.toLowerCase().includes(trimmedQuery) ||
        item.patient.phone.toLowerCase().includes(trimmedQuery);
      const matchDoctor = item.doctor.name.toLowerCase().includes(trimmedQuery);
      const matchTests = item.investigations.some((inv) =>
        inv.investigationName.toLowerCase().includes(trimmedQuery)
      );
      const matchRx = item.prescriptionNo.toLowerCase().includes(trimmedQuery);
      return matchPatient || matchDoctor || matchTests || matchRx;
    });
  }
}

