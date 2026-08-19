import { prisma } from '../database/prisma';
import { AuditService } from './audit.service';
import { ConsultationDto } from '../../shared/types';
import { ClinicalRecordStatus, VisitStatus } from '../../shared/constants/enums';

export class ConsultationService {
  /**
   * Save or update draft consultation
   */
  static async saveConsultation(data: {
    visitId: string;
    patientId: string;
    doctorId: string;
    chiefComplaint: string;
    historyOfPresentIllness?: string | null;
    pastMedicalHistory?: string | null;
    physicalExamination?: string | null;
    diagnosis: string;
    clinicalNotes?: string | null;
    advice?: string | null;
    followUpDate?: string | null;
    isFinalized?: boolean;
  }, authUserId: string): Promise<ConsultationDto> {
    return await prisma.$transaction(async (tx) => {
      let consultation = await tx.consultation.findFirst({
        where: { visitId: data.visitId },
      });

      const isFinalized = Boolean(data.isFinalized);
      const status = isFinalized ? ClinicalRecordStatus.FINALIZED : ClinicalRecordStatus.DRAFT;
      const finalizedAt = isFinalized ? new Date() : null;

      if (!consultation) {
        consultation = await tx.consultation.create({
          data: {
            visitId: data.visitId,
            patientId: data.patientId,
            doctorId: data.doctorId,
            chiefComplaint: data.chiefComplaint.trim(),
            historyOfPresentIllness: data.historyOfPresentIllness?.trim() || null,
            pastMedicalHistory: data.pastMedicalHistory?.trim() || null,
            physicalExamination: data.physicalExamination?.trim() || null,
            diagnosis: data.diagnosis.trim(),
            clinicalNotes: data.clinicalNotes?.trim() || null,
            advice: data.advice?.trim() || null,
            followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
            status,
            finalizedAt,
          },
          include: { doctor: true },
        });
      } else {
        if (consultation.status === ClinicalRecordStatus.FINALIZED) {
          throw new Error('This consultation is already finalized. Please use the amendment workflow to modify clinical notes.');
        }

        consultation = await tx.consultation.update({
          where: { id: consultation.id },
          data: {
            chiefComplaint: data.chiefComplaint.trim(),
            historyOfPresentIllness: data.historyOfPresentIllness?.trim() || null,
            pastMedicalHistory: data.pastMedicalHistory?.trim() || null,
            physicalExamination: data.physicalExamination?.trim() || null,
            diagnosis: data.diagnosis.trim(),
            clinicalNotes: data.clinicalNotes?.trim() || null,
            advice: data.advice?.trim() || null,
            followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
            status,
            finalizedAt: finalizedAt || consultation.finalizedAt,
          },
          include: { doctor: true },
        });
      }

      // Update visit status if finalized
      if (isFinalized) {
        await tx.visit.update({
          where: { id: data.visitId },
          data: { status: VisitStatus.CONSULTATION_COMPLETED },
        });
      }

      await AuditService.log(
        {
          userId: authUserId,
          action: isFinalized ? 'CONSULTATION_FINALIZE' : 'CONSULTATION_SAVE_DRAFT',
          entityType: 'Consultation',
          entityId: consultation.id,
          newValue: { diagnosis: consultation.diagnosis, status: consultation.status },
        },
        tx
      );

      return this.formatConsultation(consultation);
    });
  }

  /**
   * Amend an already finalized consultation with clinical justification
   */
  static async amendConsultation(data: {
    consultationId: string;
    reason: string;
    chiefComplaint: string;
    diagnosis: string;
    clinicalNotes?: string | null;
    advice?: string | null;
    followUpDate?: string | null;
  }, authUserId: string): Promise<ConsultationDto> {
    return await prisma.$transaction(async (tx) => {
      const original = await tx.consultation.findUnique({
        where: { id: data.consultationId },
      });

      if (!original) {
        throw new Error('Consultation record not found.');
      }

      // 1. Create amendment record capturing historical snapshot
      await tx.consultationAmendment.create({
        data: {
          consultationId: original.id,
          amendedById: authUserId,
          reason: data.reason.trim(),
          previousContent: JSON.stringify({
            chiefComplaint: original.chiefComplaint,
            diagnosis: original.diagnosis,
            clinicalNotes: original.clinicalNotes,
            advice: original.advice,
            followUpDate: original.followUpDate,
          }),
          newContent: JSON.stringify({
            chiefComplaint: data.chiefComplaint.trim(),
            diagnosis: data.diagnosis.trim(),
            clinicalNotes: data.clinicalNotes?.trim() || null,
            advice: data.advice?.trim() || null,
            followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
          }),
        },
      });

      // 2. Update consultation and mark status AMENDED
      const updated = await tx.consultation.update({
        where: { id: original.id },
        data: {
          chiefComplaint: data.chiefComplaint.trim(),
          diagnosis: data.diagnosis.trim(),
          clinicalNotes: data.clinicalNotes?.trim() || null,
          advice: data.advice?.trim() || null,
          followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
          status: ClinicalRecordStatus.AMENDED,
        },
        include: {
          doctor: true,
          amendments: true,
        },
      });

      await AuditService.log(
        {
          userId: authUserId,
          action: 'CONSULTATION_AMEND',
          entityType: 'Consultation',
          entityId: original.id,
          reason: data.reason,
          oldValue: original,
          newValue: updated,
        },
        tx
      );

      return this.formatConsultation(updated);
    });
  }

  /**
   * Get consultation by visit ID
   */
  static async getConsultationByVisit(visitId: string): Promise<ConsultationDto | null> {
    const consultation = await prisma.consultation.findFirst({
      where: { visitId },
      include: {
        doctor: true,
        amendments: true,
      },
    });

    return consultation ? this.formatConsultation(consultation) : null;
  }

  private static formatConsultation(c: any): ConsultationDto {
    return {
      id: c.id,
      visitId: c.visitId,
      patientId: c.patientId,
      doctorId: c.doctorId,
      doctorName: c.doctor?.name,
      chiefComplaint: c.chiefComplaint,
      historyOfPresentIllness: c.historyOfPresentIllness,
      pastMedicalHistory: c.pastMedicalHistory,
      physicalExamination: c.physicalExamination,
      diagnosis: c.diagnosis,
      clinicalNotes: c.clinicalNotes,
      advice: c.advice,
      followUpDate: c.followUpDate ? c.followUpDate.toISOString().split('T')[0] : null,
      status: c.status,
      finalizedAt: c.finalizedAt ? c.finalizedAt.toISOString() : null,
      createdAt: c.createdAt.toISOString(),
      amendments: c.amendments ? c.amendments.map((a: any) => ({
        id: a.id,
        consultationId: a.consultationId,
        amendedById: a.amendedById,
        amendedAt: a.amendedAt.toISOString(),
        reason: a.reason,
        previousContent: a.previousContent,
        newContent: a.newContent,
      })) : [],
    };
  }
}
