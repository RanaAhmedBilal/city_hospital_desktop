import { prisma } from '../database/prisma';
import { NumberingService } from './numbering.service';
import { AuditService } from './audit.service';
import { PatientDto } from '../../shared/types';
import { Gender, BloodGroup } from '../../shared/constants/enums';

export class PatientService {
  /**
   * Register a new permanent patient with unique MRN
   */
  static async registerPatient(data: any, authUserId: string): Promise<PatientDto> {
    // 1. Check for duplicate patient if NIC or (Name + Phone) is provided
    if (data.nic && data.nic.trim()) {
      const existingNic = await prisma.patient.findFirst({
        where: { nic: data.nic.trim() },
      });
      if (existingNic) {
        throw new Error(`A patient with NIC "${data.nic}" is already registered (MRN: ${existingNic.mrn}, Name: ${existingNic.fullName}).`);
      }
    }

    if (data.fullName && data.phone) {
      const existingPhoneName = await prisma.patient.findFirst({
        where: {
          fullName: { equals: data.fullName.trim(), mode: 'insensitive' },
          phone: data.phone.trim(),
        },
      });
      if (existingPhoneName) {
        throw new Error(`A patient named "${data.fullName}" with phone "${data.phone}" already exists (MRN: ${existingPhoneName.mrn}).`);
      }
    }

    return await prisma.$transaction(async (tx) => {
      const mrn = await NumberingService.getNextNumber('MRN', tx);

      const patient = await tx.patient.create({
        data: {
          mrn,
          fullName: data.fullName.trim(),
          guardianName: data.guardianName?.trim() || null,
          dob: data.dob ? new Date(data.dob) : null,
          age: data.age != null ? Number(data.age) : null,
          gender: data.gender as Gender,
          bloodGroup: (data.bloodGroup as BloodGroup) || BloodGroup.UNKNOWN,
          phone: data.phone.trim(),
          alternatePhone: data.alternatePhone?.trim() || null,
          address: data.address?.trim() || null,
          city: data.city?.trim() || null,
          nic: data.nic?.trim() || null,
          employeeId: data.employeeId?.trim() || null,
          panelClientId: data.panelClientId || null,
          emergencyContactName: data.emergencyContactName?.trim() || null,
          emergencyContactPhone: data.emergencyContactPhone?.trim() || null,
          emergencyContactRelation: data.emergencyContactRelation?.trim() || null,
          notes: data.notes?.trim() || null,
        },
        include: {
          panelClient: true,
        },
      });

      await AuditService.log(
        {
          userId: authUserId,
          action: 'PATIENT_REGISTER',
          entityType: 'Patient',
          entityId: patient.id,
          newValue: { mrn: patient.mrn, name: patient.fullName, phone: patient.phone },
        },
        tx
      );

      return this.formatPatient(patient);
    });
  }

  /**
   * Multi-criteria patient search (MRN, Name, Phone, NIC, Employee ID)
   */
  static async searchPatients(query: string, limit = 50): Promise<PatientDto[]> {
    if (!query || !query.trim()) {
      const recent = await prisma.patient.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: { panelClient: true },
      });
      return recent.map(this.formatPatient);
    }

    const q = query.trim();
    const patients = await prisma.patient.findMany({
      where: {
        OR: [
          { mrn: { contains: q, mode: 'insensitive' } },
          { fullName: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q } },
          { alternatePhone: { contains: q } },
          { nic: { contains: q, mode: 'insensitive' } },
          { employeeId: { contains: q, mode: 'insensitive' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { panelClient: true },
    });

    return patients.map(this.formatPatient);
  }

  /**
   * Get single patient by ID with full demographic and clinical overview
   */
  static async getPatientById(id: string): Promise<any> {
    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        panelClient: true,
        visits: {
          orderBy: { visitDateTime: 'desc' },
          include: {
            doctor: true,
            department: true,
            vitals: { orderBy: { recordedAt: 'desc' } },
            consultations: {
              include: {
                amendments: true,
              },
            },
            prescriptions: {
              include: {
                items: { orderBy: { sortOrder: 'asc' } },
                investigations: { orderBy: { sortOrder: 'asc' } },
                amendments: true,
              },
            },
            invoices: {
              include: {
                items: true,
                payments: true,
                adjustments: true,
              },
            },
            charges: true,
          },
        },
      },
    });

    if (!patient) {
      throw new Error(`Patient with ID ${id} not found.`);
    }

    return patient;
  }

  /**
   * Update patient demographics
   */
  static async updatePatient(id: string, data: any, authUserId: string): Promise<PatientDto> {
    const existing = await prisma.patient.findUnique({ where: { id } });
    if (!existing) {
      throw new Error(`Patient not found.`);
    }

    // Check duplicate NIC if changed
    if (data.nic && data.nic.trim() !== existing.nic) {
      const duplicate = await prisma.patient.findFirst({
        where: { nic: data.nic.trim(), id: { not: id } },
      });
      if (duplicate) {
        throw new Error(`NIC ${data.nic} is already associated with patient ${duplicate.mrn}`);
      }
    }

    const updated = await prisma.patient.update({
      where: { id },
      data: {
        fullName: data.fullName !== undefined ? data.fullName.trim() : undefined,
        guardianName: data.guardianName !== undefined ? data.guardianName?.trim() : undefined,
        dob: data.dob !== undefined ? (data.dob ? new Date(data.dob) : null) : undefined,
        age: data.age !== undefined ? (data.age != null ? Number(data.age) : null) : undefined,
        gender: data.gender !== undefined ? (data.gender as Gender) : undefined,
        bloodGroup: data.bloodGroup !== undefined ? (data.bloodGroup as BloodGroup) : undefined,
        phone: data.phone !== undefined ? data.phone.trim() : undefined,
        alternatePhone: data.alternatePhone !== undefined ? data.alternatePhone?.trim() : undefined,
        address: data.address !== undefined ? data.address?.trim() : undefined,
        city: data.city !== undefined ? data.city?.trim() : undefined,
        nic: data.nic !== undefined ? data.nic?.trim() : undefined,
        employeeId: data.employeeId !== undefined ? data.employeeId?.trim() : undefined,
        panelClientId: data.panelClientId !== undefined ? data.panelClientId : undefined,
        emergencyContactName: data.emergencyContactName !== undefined ? data.emergencyContactName?.trim() : undefined,
        emergencyContactPhone: data.emergencyContactPhone !== undefined ? data.emergencyContactPhone?.trim() : undefined,
        emergencyContactRelation: data.emergencyContactRelation !== undefined ? data.emergencyContactRelation?.trim() : undefined,
        notes: data.notes !== undefined ? data.notes?.trim() : undefined,
        isActive: data.isActive !== undefined ? data.isActive : undefined,
      },
      include: { panelClient: true },
    });

    await AuditService.log({
      userId: authUserId,
      action: 'PATIENT_UPDATE',
      entityType: 'Patient',
      entityId: id,
      oldValue: existing,
      newValue: updated,
    });

    return this.formatPatient(updated);
  }

  private static formatPatient(p: any): PatientDto {
    return {
      id: p.id,
      mrn: p.mrn,
      fullName: p.fullName,
      guardianName: p.guardianName,
      dob: p.dob ? p.dob.toISOString().split('T')[0] : null,
      age: p.age,
      gender: p.gender,
      bloodGroup: p.bloodGroup,
      phone: p.phone,
      alternatePhone: p.alternatePhone,
      address: p.address,
      city: p.city,
      nic: p.nic,
      employeeId: p.employeeId,
      panelClientId: p.panelClientId,
      panelClientName: p.panelClient?.name || null,
      emergencyContactName: p.emergencyContactName,
      emergencyContactPhone: p.emergencyContactPhone,
      emergencyContactRelation: p.emergencyContactRelation,
      registrationDate: p.registrationDate.toISOString(),
      isActive: p.isActive,
      notes: p.notes,
    };
  }
}
