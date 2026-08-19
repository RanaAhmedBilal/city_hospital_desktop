import { prisma } from '../database/prisma';
import { NumberingService } from './numbering.service';
import { AuditService } from './audit.service';
import { PrescriptionDto, PrescriptionItemDto, PrescriptionInvestigationDto } from '../../shared/types';
import { ClinicalRecordStatus, FoodRelation } from '../../shared/constants/enums';

export class PrescriptionService {
  /**
   * Save draft or finalize prescription with items and requested investigations
   */
  static async savePrescription(data: {
    visitId: string;
    patientId: string;
    doctorId: string;
    consultationId?: string | null;
    diagnosis?: string | null;
    clinicalNotes?: string | null;
    advice?: string | null;
    followUpDate?: string | null;
    isFinalized?: boolean;
    items: PrescriptionItemDto[];
    investigations: PrescriptionInvestigationDto[];
  }, authUserId: string): Promise<PrescriptionDto> {
    return await prisma.$transaction(async (tx) => {
      let prescription = await tx.prescription.findFirst({
        where: { visitId: data.visitId },
        include: { items: true, investigations: true },
      });

      const isFinalized = Boolean(data.isFinalized);
      const status = isFinalized ? ClinicalRecordStatus.FINALIZED : ClinicalRecordStatus.DRAFT;
      const finalizedAt = isFinalized ? new Date() : null;

      let targetPrescriptionId: string;

      if (!prescription) {
        const prescriptionNo = await NumberingService.getNextNumber('PRESCRIPTION', tx);

        const created = await tx.prescription.create({
          data: {
            prescriptionNo,
            visitId: data.visitId,
            patientId: data.patientId,
            doctorId: data.doctorId,
            consultationId: data.consultationId || null,
            diagnosis: data.diagnosis?.trim() || null,
            clinicalNotes: data.clinicalNotes?.trim() || null,
            advice: data.advice?.trim() || null,
            followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
            status,
            finalizedAt,
            version: 1,
          },
        });
        targetPrescriptionId = created.id;
      } else {
        if (prescription.status === ClinicalRecordStatus.FINALIZED) {
          throw new Error('This prescription is already finalized. Please use the amendment workflow to create a correction.');
        }

        // Delete previous items & investigations to recreate cleanly for draft
        await tx.prescriptionItem.deleteMany({ where: { prescriptionId: prescription.id } });
        await tx.prescriptionInvestigation.deleteMany({ where: { prescriptionId: prescription.id } });

        const updated = await tx.prescription.update({
          where: { id: prescription.id },
          data: {
            diagnosis: data.diagnosis?.trim() || null,
            clinicalNotes: data.clinicalNotes?.trim() || null,
            advice: data.advice?.trim() || null,
            followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
            status,
            finalizedAt: finalizedAt || prescription.finalizedAt,
          },
        });
        targetPrescriptionId = updated.id;
      }

      // Create prescription medicine items
      if (data.items && data.items.length > 0) {
        for (let i = 0; i < data.items.length; i++) {
          const item = data.items[i];
          await tx.prescriptionItem.create({
            data: {
              prescriptionId: targetPrescriptionId,
              medicineId: item.medicineId || null,
              medicineName: item.medicineName.trim(),
              genericName: item.genericName?.trim() || null,
              strength: item.strength?.trim() || null,
              dosageForm: item.dosageForm?.trim() || null,
              dose: item.dose.trim(),
              frequency: item.frequency.trim(),
              route: item.route || 'Oral',
              duration: item.duration.trim(),
              quantity: item.quantity != null ? Number(item.quantity) : null,
              instructions: item.instructions?.trim() || null,
              foodRelation: item.foodRelation || FoodRelation.AFTER_FOOD,
              additionalNotes: item.additionalNotes?.trim() || null,
              sortOrder: item.sortOrder ?? i,
            },
          });
        }
      }

      // Create requested investigations
      if (data.investigations && data.investigations.length > 0) {
        for (let i = 0; i < data.investigations.length; i++) {
          const inv = data.investigations[i];
          await tx.prescriptionInvestigation.create({
            data: {
              prescriptionId: targetPrescriptionId,
              investigationId: inv.investigationId || null,
              investigationName: inv.investigationName.trim(),
              instructions: inv.instructions?.trim() || null,
              sortOrder: inv.sortOrder ?? i,
            },
          });
        }
      }

      const fullPrescription = await tx.prescription.findUnique({
        where: { id: targetPrescriptionId },
        include: {
          doctor: true,
          items: { orderBy: { sortOrder: 'asc' } },
          investigations: { orderBy: { sortOrder: 'asc' } },
          amendments: true,
        },
      });

      await AuditService.log(
        {
          userId: authUserId,
          action: isFinalized ? 'PRESCRIPTION_FINALIZE' : 'PRESCRIPTION_SAVE_DRAFT',
          entityType: 'Prescription',
          entityId: fullPrescription!.id,
          newValue: {
            prescriptionNo: fullPrescription!.prescriptionNo,
            itemCount: fullPrescription!.items.length,
            investigationCount: fullPrescription!.investigations.length,
            status: fullPrescription!.status,
          },
        },
        tx
      );

      return this.formatPrescription(fullPrescription!);
    });
  }

  /**
   * Amend an already finalized prescription with audit trail
   */
  static async amendPrescription(data: {
    prescriptionId: string;
    reason: string;
    diagnosis?: string | null;
    clinicalNotes?: string | null;
    advice?: string | null;
    followUpDate?: string | null;
    items: PrescriptionItemDto[];
    investigations: PrescriptionInvestigationDto[];
  }, authUserId: string): Promise<PrescriptionDto> {
    return await prisma.$transaction(async (tx) => {
      const original = await tx.prescription.findUnique({
        where: { id: data.prescriptionId },
        include: {
          items: { orderBy: { sortOrder: 'asc' } },
          investigations: { orderBy: { sortOrder: 'asc' } },
        },
      });

      if (!original) {
        throw new Error('Prescription record not found.');
      }

      // 1. Record snapshot in amendments
      await tx.prescriptionAmendment.create({
        data: {
          prescriptionId: original.id,
          amendedById: authUserId,
          reason: data.reason.trim(),
          previousContent: JSON.stringify({
            diagnosis: original.diagnosis,
            clinicalNotes: original.clinicalNotes,
            advice: original.advice,
            items: original.items,
            investigations: original.investigations,
          }),
          newContent: JSON.stringify({
            diagnosis: data.diagnosis,
            clinicalNotes: data.clinicalNotes,
            advice: data.advice,
            items: data.items,
            investigations: data.investigations,
          }),
        },
      });

      // 2. Clear old items and write new
      await tx.prescriptionItem.deleteMany({ where: { prescriptionId: original.id } });
      await tx.prescriptionInvestigation.deleteMany({ where: { prescriptionId: original.id } });

      for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i];
        await tx.prescriptionItem.create({
          data: {
            prescriptionId: original.id,
            medicineId: item.medicineId || null,
            medicineName: item.medicineName.trim(),
            genericName: item.genericName?.trim() || null,
            strength: item.strength?.trim() || null,
            dosageForm: item.dosageForm?.trim() || null,
            dose: item.dose.trim(),
            frequency: item.frequency.trim(),
            route: item.route || 'Oral',
            duration: item.duration.trim(),
            quantity: item.quantity != null ? Number(item.quantity) : null,
            instructions: item.instructions?.trim() || null,
            foodRelation: item.foodRelation || FoodRelation.AFTER_FOOD,
            additionalNotes: item.additionalNotes?.trim() || null,
            sortOrder: item.sortOrder ?? i,
          },
        });
      }

      for (let i = 0; i < data.investigations.length; i++) {
        const inv = data.investigations[i];
        await tx.prescriptionInvestigation.create({
          data: {
            prescriptionId: original.id,
            investigationId: inv.investigationId || null,
            investigationName: inv.investigationName.trim(),
            instructions: inv.instructions?.trim() || null,
            sortOrder: inv.sortOrder ?? i,
          },
        });
      }

      const updated = await tx.prescription.update({
        where: { id: original.id },
        data: {
          diagnosis: data.diagnosis?.trim() || null,
          clinicalNotes: data.clinicalNotes?.trim() || null,
          advice: data.advice?.trim() || null,
          followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
          status: ClinicalRecordStatus.AMENDED,
          version: original.version + 1,
        },
        include: {
          doctor: true,
          items: { orderBy: { sortOrder: 'asc' } },
          investigations: { orderBy: { sortOrder: 'asc' } },
          amendments: true,
        },
      });

      await AuditService.log(
        {
          userId: authUserId,
          action: 'PRESCRIPTION_AMEND',
          entityType: 'Prescription',
          entityId: original.id,
          reason: data.reason,
          oldValue: { version: original.version },
          newValue: { version: updated.version, status: updated.status },
        },
        tx
      );

      return this.formatPrescription(updated);
    });
  }

  /**
   * Get prescription by visit ID
   */
  static async getPrescriptionByVisit(visitId: string): Promise<PrescriptionDto | null> {
    const rx = await prisma.prescription.findFirst({
      where: { visitId },
      include: {
        doctor: true,
        items: { orderBy: { sortOrder: 'asc' } },
        investigations: { orderBy: { sortOrder: 'asc' } },
        amendments: true,
      },
    });

    return rx ? this.formatPrescription(rx) : null;
  }

  private static formatPrescription(rx: any): PrescriptionDto {
    return {
      id: rx.id,
      prescriptionNo: rx.prescriptionNo,
      visitId: rx.visitId,
      patientId: rx.patientId,
      doctorId: rx.doctorId,
      doctorName: rx.doctor?.name,
      doctorSpecialty: rx.doctor?.specialty,
      doctorPrintableTitle: rx.doctor?.printableTitle,
      consultationId: rx.consultationId,
      diagnosis: rx.diagnosis,
      clinicalNotes: rx.clinicalNotes,
      advice: rx.advice,
      followUpDate: rx.followUpDate ? rx.followUpDate.toISOString().split('T')[0] : null,
      status: rx.status,
      finalizedAt: rx.finalizedAt ? rx.finalizedAt.toISOString() : null,
      version: rx.version,
      createdAt: rx.createdAt.toISOString(),
      items: rx.items.map((it: any) => ({
        id: it.id,
        prescriptionId: it.prescriptionId,
        medicineId: it.medicineId,
        medicineName: it.medicineName,
        genericName: it.genericName,
        strength: it.strength,
        dosageForm: it.dosageForm,
        dose: it.dose,
        frequency: it.frequency,
        route: it.route,
        duration: it.duration,
        quantity: it.quantity,
        instructions: it.instructions,
        foodRelation: it.foodRelation,
        additionalNotes: it.additionalNotes,
        sortOrder: it.sortOrder,
      })),
      investigations: rx.investigations.map((inv: any) => ({
        id: inv.id,
        prescriptionId: inv.prescriptionId,
        investigationId: inv.investigationId,
        investigationName: inv.investigationName,
        instructions: inv.instructions,
        sortOrder: inv.sortOrder,
      })),
      amendments: rx.amendments ? rx.amendments.map((a: any) => ({
        id: a.id,
        prescriptionId: a.prescriptionId,
        amendedById: a.amendedById,
        amendedAt: a.amendedAt.toISOString(),
        reason: a.reason,
        previousContent: a.previousContent,
        newContent: a.newContent,
      })) : [],
    };
  }
}
