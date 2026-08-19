import { prisma } from '../database/prisma';
import { NumberingService } from './numbering.service';
import { AuditService } from './audit.service';
import { VisitDto } from '../../shared/types';
import { VisitStatus, VisitPaymentStatus, VisitType, ChargeStatus } from '../../shared/constants/enums';

export class VisitService {
  /**
   * Create a new patient visit and generate consultation charge
   */
  static async createVisit(data: {
    patientId: string;
    doctorId: string;
    departmentId: string;
    visitType?: VisitType;
    priority?: string;
    notes?: string;
    customFee?: number;
  }, authUserId: string): Promise<VisitDto> {
    return await prisma.$transaction(async (tx) => {
      // 1. Get today's max token number for this doctor
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const doctor = await tx.doctor.findUnique({
        where: { id: data.doctorId },
        include: { department: true },
      });

      if (!doctor || !doctor.isActive) {
        throw new Error('Selected doctor is inactive or not found.');
      }

      const todayVisitsCount = await tx.visit.count({
        where: {
          doctorId: data.doctorId,
          visitDateTime: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      });

      const tokenNumber = todayVisitsCount + 1;
      const visitNumber = await NumberingService.getNextNumber('VISIT', tx);

      const visit = await tx.visit.create({
        data: {
          visitNumber,
          patientId: data.patientId,
          doctorId: data.doctorId,
          departmentId: data.departmentId || doctor.departmentId,
          tokenNumber,
          visitType: data.visitType || VisitType.NEW_CONSULTATION,
          status: VisitStatus.REGISTERED,
          paymentStatus: VisitPaymentStatus.UNBILLED,
          priority: data.priority || 'NORMAL',
          notes: data.notes?.trim() || null,
        },
        include: {
          patient: { include: { panelClient: true } },
          doctor: true,
          department: true,
        },
      });

      // 2. Automatically generate Consultation Visit Charge
      const isFollowUp = data.visitType === VisitType.FOLLOW_UP;
      let unitPrice = data.customFee != null
        ? Number(data.customFee)
        : (isFollowUp ? Number(doctor.followUpFee) : Number(doctor.consultationFee));

      // Check for panel client discount if patient belongs to panel
      let discount = 0;
      if (visit.patient.panelClient && Number(visit.patient.panelClient.discountPercent) > 0) {
        const discountPercent = Number(visit.patient.panelClient.discountPercent);
        discount = (unitPrice * discountPercent) / 100;
      }

      const netAmount = Math.max(0, unitPrice - discount);

      // Find consultation service if exists
      const consultationService = await tx.service.findFirst({
        where: { category: isFollowUp ? 'FOLLOW_UP' : 'CONSULTATION', isActive: true },
      });

      await tx.visitCharge.create({
        data: {
          visitId: visit.id,
          patientId: visit.patientId,
          serviceId: consultationService ? consultationService.id : null,
          serviceName: isFollowUp ? `Follow-up Consultation (${doctor.name})` : `Consultation Fee (${doctor.name})`,
          description: `Doctor visit token #${tokenNumber}`,
          quantity: 1,
          unitPrice,
          discount,
          taxAmount: 0,
          netAmount,
          status: ChargeStatus.DRAFT,
          createdById: authUserId,
        },
      });

      await AuditService.log(
        {
          userId: authUserId,
          action: 'VISIT_CREATE',
          entityType: 'Visit',
          entityId: visit.id,
          newValue: { visitNumber: visit.visitNumber, patientId: visit.patientId, tokenNumber },
        },
        tx
      );

      return this.formatVisit(visit);
    });
  }

  /**
   * Get queue of visits with rich filters
   */
  static async getVisits(filters: {
    date?: string;
    doctorId?: string;
    departmentId?: string;
    status?: VisitStatus;
    patientId?: string;
    unbilledOnly?: boolean;
    limit?: number;
  }): Promise<VisitDto[]> {
    const where: any = {};

    if (filters.date) {
      const start = new Date(filters.date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(filters.date);
      end.setHours(23, 59, 59, 999);
      where.visitDateTime = { gte: start, lte: end };
    }

    if (filters.doctorId) where.doctorId = filters.doctorId;
    if (filters.departmentId) where.departmentId = filters.departmentId;
    if (filters.status) where.status = filters.status;
    if (filters.patientId) where.patientId = filters.patientId;
    if (filters.unbilledOnly) where.paymentStatus = { in: [VisitPaymentStatus.UNBILLED, VisitPaymentStatus.PARTIALLY_PAID] };

    const visits = await prisma.visit.findMany({
      where,
      orderBy: [{ visitDateTime: 'desc' }, { tokenNumber: 'asc' }],
      take: filters.limit || 100,
      include: {
        patient: { include: { panelClient: true } },
        doctor: true,
        department: true,
        vitals: { orderBy: { recordedAt: 'desc' }, take: 1 },
        consultations: {
          include: { amendments: true },
          take: 1,
        },
        prescriptions: {
          include: {
            items: { orderBy: { sortOrder: 'asc' } },
            investigations: { orderBy: { sortOrder: 'asc' } },
          },
          take: 1,
        },
        invoices: {
          include: { payments: true },
        },
      },
    });

    return visits.map(this.formatVisit);
  }

  /**
   * Get visit by ID
   */
  static async getVisitById(id: string): Promise<VisitDto | null> {
    const visit = await prisma.visit.findUnique({
      where: { id },
      include: {
        patient: { include: { panelClient: true } },
        doctor: { include: { department: true } },
        department: true,
        vitals: { orderBy: { recordedAt: 'desc' }, take: 1 },
        consultations: {
          include: { amendments: true },
          orderBy: { createdAt: 'desc' },
        },
        prescriptions: {
          include: { items: true, investigations: true, amendments: true },
          orderBy: { createdAt: 'desc' },
        },
        charges: true,
        invoices: {
          include: { payments: true },
        },
      },
    });

    return visit ? this.formatVisit(visit) : null;
  }

  /**
   * Update visit status (e.g. WAITING, VITALS_COMPLETED, WITH_DOCTOR, COMPLETED)
   */
  static async updateStatus(visitId: string, status: VisitStatus, authUserId: string): Promise<VisitDto> {
    const existing = await prisma.visit.findUnique({ where: { id: visitId } });
    if (!existing) throw new Error('Visit not found');

    const updated = await prisma.visit.update({
      where: { id: visitId },
      data: { status },
      include: {
        patient: { include: { panelClient: true } },
        doctor: true,
        department: true,
        vitals: { orderBy: { recordedAt: 'desc' }, take: 1 },
      },
    });

    await AuditService.log({
      userId: authUserId,
      action: 'VISIT_STATUS_UPDATE',
      entityType: 'Visit',
      entityId: visitId,
      oldValue: { status: existing.status },
      newValue: { status: updated.status },
    });

    return this.formatVisit(updated);
  }

  private static formatVisit(v: any): VisitDto {
    return {
      id: v.id,
      visitNumber: v.visitNumber,
      patientId: v.patientId,
      patient: v.patient
        ? {
            id: v.patient.id,
            mrn: v.patient.mrn,
            fullName: v.patient.fullName,
            guardianName: v.patient.guardianName,
            dob: v.patient.dob ? v.patient.dob.toISOString().split('T')[0] : null,
            age: v.patient.age,
            gender: v.patient.gender,
            bloodGroup: v.patient.bloodGroup,
            phone: v.patient.phone,
            alternatePhone: v.patient.alternatePhone,
            address: v.patient.address,
            city: v.patient.city,
            nic: v.patient.nic,
            employeeId: v.patient.employeeId,
            panelClientId: v.patient.panelClientId,
            panelClientName: v.patient.panelClient?.name || null,
            emergencyContactName: v.patient.emergencyContactName,
            emergencyContactPhone: v.patient.emergencyContactPhone,
            emergencyContactRelation: v.patient.emergencyContactRelation,
            registrationDate: v.patient.registrationDate.toISOString(),
            isActive: v.patient.isActive,
            notes: v.patient.notes,
          }
        : undefined,
      doctorId: v.doctorId,
      doctorName: v.doctor?.name,
      doctorSpecialty: v.doctor?.specialty,
      departmentId: v.departmentId,
      departmentName: v.department?.name,
      visitDateTime: v.visitDateTime.toISOString(),
      tokenNumber: v.tokenNumber,
      visitType: v.visitType,
      status: v.status,
      paymentStatus: v.paymentStatus,
      priority: v.priority,
      notes: v.notes,
      latestVitals: v.vitals && v.vitals[0] ? {
        id: v.vitals[0].id,
        visitId: v.vitals[0].visitId,
        patientId: v.vitals[0].patientId,
        temperature: v.vitals[0].temperature ? Number(v.vitals[0].temperature) : null,
        pulse: v.vitals[0].pulse,
        respiratoryRate: v.vitals[0].respiratoryRate,
        systolicBp: v.vitals[0].systolicBp,
        diastolicBp: v.vitals[0].diastolicBp,
        spo2: v.vitals[0].spo2 ? Number(v.vitals[0].spo2) : null,
        weight: v.vitals[0].weight ? Number(v.vitals[0].weight) : null,
        height: v.vitals[0].height ? Number(v.vitals[0].height) : null,
        bmi: v.vitals[0].bmi ? Number(v.vitals[0].bmi) : null,
        bloodGlucose: v.vitals[0].bloodGlucose ? Number(v.vitals[0].bloodGlucose) : null,
        glucoseType: v.vitals[0].glucoseType,
        painScore: v.vitals[0].painScore,
        observations: v.vitals[0].observations,
        recordedById: v.vitals[0].recordedById,
        recordedAt: v.vitals[0].recordedAt.toISOString(),
      } : null,
    };
  }
}
