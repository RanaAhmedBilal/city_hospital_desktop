import { prisma } from '../database/prisma';
import { AuditService } from './audit.service';
import { VisitVitalsDto } from '../../shared/types';
import { VisitStatus } from '../../shared/constants/enums';

export class VitalsService {
  /**
   * Record vitals for a visit. Never overwrites past vitals records.
   */
  static async recordVitals(data: {
    visitId: string;
    patientId: string;
    temperature?: number | null;
    pulse?: number | null;
    respiratoryRate?: number | null;
    systolicBp?: number | null;
    diastolicBp?: number | null;
    spo2?: number | null;
    weight?: number | null;
    height?: number | null;
    bloodGlucose?: number | null;
    glucoseType?: string | null;
    painScore?: number | null;
    observations?: string | null;
  }, authUserId: string): Promise<VisitVitalsDto> {
    // 1. Calculate BMI if height (cm) and weight (kg) are provided
    let bmi: number | null = null;
    if (data.weight && data.height && data.height > 0) {
      const heightInMeters = data.height / 100;
      const rawBmi = data.weight / (heightInMeters * heightInMeters);
      bmi = Math.round(rawBmi * 10) / 10;
    }

    return await prisma.$transaction(async (tx) => {
      const vitals = await tx.visitVitals.create({
        data: {
          visitId: data.visitId,
          patientId: data.patientId,
          temperature: data.temperature != null ? data.temperature : null,
          pulse: data.pulse != null ? data.pulse : null,
          respiratoryRate: data.respiratoryRate != null ? data.respiratoryRate : null,
          systolicBp: data.systolicBp != null ? data.systolicBp : null,
          diastolicBp: data.diastolicBp != null ? data.diastolicBp : null,
          spo2: data.spo2 != null ? data.spo2 : null,
          weight: data.weight != null ? data.weight : null,
          height: data.height != null ? data.height : null,
          bmi,
          bloodGlucose: data.bloodGlucose != null ? data.bloodGlucose : null,
          glucoseType: data.glucoseType || null,
          painScore: data.painScore != null ? data.painScore : null,
          observations: data.observations?.trim() || null,
          recordedById: authUserId,
        },
      });

      // Update visit status to VITALS_COMPLETED if currently REGISTERED or WAITING
      const visit = await tx.visit.findUnique({ where: { id: data.visitId } });
      if (visit && (visit.status === VisitStatus.REGISTERED || visit.status === VisitStatus.WAITING)) {
        await tx.visit.update({
          where: { id: data.visitId },
          data: { status: VisitStatus.VITALS_COMPLETED },
        });
      }

      await AuditService.log(
        {
          userId: authUserId,
          action: 'RECORD_VITALS',
          entityType: 'VisitVitals',
          entityId: vitals.id,
          newValue: {
            visitId: data.visitId,
            bp: `${data.systolicBp}/${data.diastolicBp}`,
            pulse: data.pulse,
            temp: data.temperature,
            spo2: data.spo2,
            bmi,
          },
        },
        tx
      );

      return this.formatVitals(vitals);
    });
  }

  /**
   * Get all historical vitals for a patient
   */
  static async getPatientVitalsHistory(patientId: string): Promise<VisitVitalsDto[]> {
    const history = await prisma.visitVitals.findMany({
      where: { patientId },
      orderBy: { recordedAt: 'desc' },
      include: {
        visit: {
          include: { doctor: true },
        },
      },
    });

    return history.map(this.formatVitals);
  }

  private static formatVitals(v: any): VisitVitalsDto {
    return {
      id: v.id,
      visitId: v.visitId,
      patientId: v.patientId,
      temperature: v.temperature ? Number(v.temperature) : null,
      pulse: v.pulse,
      respiratoryRate: v.respiratoryRate,
      systolicBp: v.systolicBp,
      diastolicBp: v.diastolicBp,
      spo2: v.spo2 ? Number(v.spo2) : null,
      weight: v.weight ? Number(v.weight) : null,
      height: v.height ? Number(v.height) : null,
      bmi: v.bmi ? Number(v.bmi) : null,
      bloodGlucose: v.bloodGlucose ? Number(v.bloodGlucose) : null,
      glucoseType: v.glucoseType,
      painScore: v.painScore,
      observations: v.observations,
      recordedById: v.recordedById,
      recordedAt: v.recordedAt.toISOString(),
    };
  }
}
