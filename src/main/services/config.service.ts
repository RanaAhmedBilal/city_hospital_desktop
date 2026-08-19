import bcrypt from 'bcryptjs';
import { prisma } from '../database/prisma';
import { AuditService } from './audit.service';
import { HospitalSettingDto } from '../../shared/types';
import { RoleType } from '../../shared/constants/roles';

export class ConfigService {
  /**
   * Get Hospital Setting
   */
  static async getHospitalSetting(): Promise<HospitalSettingDto> {
    let setting = await prisma.hospitalSetting.findUnique({
      where: { id: 'default_config' },
    });

    if (!setting) {
      setting = await prisma.hospitalSetting.create({
        data: {
          id: 'default_config',
          hospitalName: 'City Hospital',
          tagline: 'Center for Medical Excellence',
          address: '123 Healthcare Boulevard, Medical District',
          city: 'Metropolis',
          phone: '+1 (555) 019-2834',
          email: 'info@cityhospital.org',
          website: 'www.cityhospital.org',
          taxNumber: 'TX-984210',
          currencySymbol: 'Rs.',
        },
      });
    }

    return {
      id: setting.id,
      hospitalName: setting.hospitalName,
      tagline: setting.tagline,
      address: setting.address,
      city: setting.city,
      phone: setting.phone,
      email: setting.email,
      website: setting.website,
      taxNumber: setting.taxNumber,
      currencySymbol: setting.currencySymbol,
      logoBase64: setting.logoBase64,
      prescriptionDisclaimer: setting.prescriptionDisclaimer,
      invoiceDisclaimer: setting.invoiceDisclaimer,
    };
  }

  /**
   * Update Hospital Setting
   */
  static async updateHospitalSetting(data: Partial<HospitalSettingDto>, authUserId: string): Promise<HospitalSettingDto> {
    const updated = await prisma.hospitalSetting.upsert({
      where: { id: 'default_config' },
      update: {
        hospitalName: data.hospitalName,
        tagline: data.tagline,
        address: data.address,
        city: data.city,
        phone: data.phone,
        email: data.email,
        website: data.website,
        taxNumber: data.taxNumber,
        currencySymbol: data.currencySymbol,
        logoBase64: data.logoBase64,
        prescriptionDisclaimer: data.prescriptionDisclaimer,
        invoiceDisclaimer: data.invoiceDisclaimer,
      },
      create: {
        id: 'default_config',
        hospitalName: data.hospitalName || 'City Hospital',
        tagline: data.tagline,
        address: data.address || '123 Healthcare Blvd',
        city: data.city || 'Metropolis',
        phone: data.phone || '000-000-0000',
        email: data.email || 'info@cityhospital.org',
        website: data.website,
        taxNumber: data.taxNumber,
        currencySymbol: data.currencySymbol || 'Rs.',
        logoBase64: data.logoBase64,
        prescriptionDisclaimer: data.prescriptionDisclaimer,
        invoiceDisclaimer: data.invoiceDisclaimer,
      },
    });

    await AuditService.log({
      userId: authUserId,
      action: 'UPDATE_HOSPITAL_SETTINGS',
      entityType: 'HospitalSetting',
      entityId: updated.id,
      newValue: updated,
    });

    return updated as HospitalSettingDto;
  }

  // Master Data Methods: Departments
  static async getDepartments() {
    return await prisma.department.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { doctors: true, visits: true } } },
    });
  }

  static async saveDepartment(data: { id?: string; code: string; name: string; description?: string | null; isActive?: boolean }, authUserId: string) {
    let dept;
    if (data.id) {
      dept = await prisma.department.update({
        where: { id: data.id },
        data: {
          code: data.code.trim().toUpperCase(),
          name: data.name.trim(),
          description: data.description?.trim() || null,
          isActive: data.isActive !== undefined ? data.isActive : true,
        },
      });
    } else {
      dept = await prisma.department.create({
        data: {
          code: data.code.trim().toUpperCase(),
          name: data.name.trim(),
          description: data.description?.trim() || null,
          isActive: true,
        },
      });
    }

    await AuditService.log({
      userId: authUserId,
      action: data.id ? 'UPDATE_DEPARTMENT' : 'CREATE_DEPARTMENT',
      entityType: 'Department',
      entityId: dept.id,
      newValue: dept,
    });

    return dept;
  }

  // Master Data Methods: Doctors
  static async getDoctors(activeOnly = false) {
    const where: any = activeOnly ? { isActive: true } : {};
    return await prisma.doctor.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { department: true },
    });
  }

  static async saveDoctor(data: {
    id?: string;
    name: string;
    printableTitle: string;
    licenseNumber: string;
    specialty: string;
    phone?: string | null;
    email?: string | null;
    departmentId: string;
    consultationFee: number;
    followUpFee: number;
    signatureData?: string | null;
    isActive?: boolean;
  }, authUserId: string) {
    let doc;
    if (data.id) {
      doc = await prisma.doctor.update({
        where: { id: data.id },
        data: {
          name: data.name.trim(),
          printableTitle: data.printableTitle.trim(),
          licenseNumber: data.licenseNumber.trim(),
          specialty: data.specialty.trim(),
          phone: data.phone?.trim() || null,
          email: data.email?.trim() || null,
          departmentId: data.departmentId,
          consultationFee: data.consultationFee,
          followUpFee: data.followUpFee,
          signatureData: data.signatureData,
          isActive: data.isActive !== undefined ? data.isActive : true,
        },
        include: { department: true },
      });
    } else {
      doc = await prisma.doctor.create({
        data: {
          name: data.name.trim(),
          printableTitle: data.printableTitle.trim(),
          licenseNumber: data.licenseNumber.trim(),
          specialty: data.specialty.trim(),
          phone: data.phone?.trim() || null,
          email: data.email?.trim() || null,
          departmentId: data.departmentId,
          consultationFee: data.consultationFee,
          followUpFee: data.followUpFee,
          signatureData: data.signatureData,
          isActive: true,
        },
        include: { department: true },
      });
    }

    await AuditService.log({
      userId: authUserId,
      action: data.id ? 'UPDATE_DOCTOR' : 'CREATE_DOCTOR',
      entityType: 'Doctor',
      entityId: doc.id,
      newValue: doc,
    });

    return doc;
  }

  // Master Data Methods: Medicines
  static async searchMedicines(query: string, limit = 50) {
    const q = query.trim();
    return await prisma.medicine.findMany({
      where: q
        ? {
            OR: [
              { brandName: { contains: q, mode: 'insensitive' } },
              { genericName: { contains: q, mode: 'insensitive' } },
            ],
            isActive: true,
          }
        : { isActive: true },
      orderBy: { brandName: 'asc' },
      take: limit,
    });
  }

  static async saveMedicine(data: any, authUserId: string) {
    let med;
    if (data.id) {
      med = await prisma.medicine.update({
        where: { id: data.id },
        data: {
          brandName: data.brandName.trim(),
          genericName: data.genericName.trim(),
          strength: data.strength.trim(),
          dosageForm: data.dosageForm.trim(),
          manufacturer: data.manufacturer?.trim() || null,
          defaultDosage: data.defaultDosage?.trim() || null,
          defaultFrequency: data.defaultFrequency?.trim() || null,
          defaultRoute: data.defaultRoute?.trim() || null,
          defaultDuration: data.defaultDuration?.trim() || null,
          isActive: data.isActive !== undefined ? data.isActive : true,
        },
      });
    } else {
      med = await prisma.medicine.create({
        data: {
          brandName: data.brandName.trim(),
          genericName: data.genericName.trim(),
          strength: data.strength.trim(),
          dosageForm: data.dosageForm.trim(),
          manufacturer: data.manufacturer?.trim() || null,
          defaultDosage: data.defaultDosage?.trim() || null,
          defaultFrequency: data.defaultFrequency?.trim() || null,
          defaultRoute: data.defaultRoute?.trim() || null,
          defaultDuration: data.defaultDuration?.trim() || null,
          isActive: true,
        },
      });
    }

    await AuditService.log({
      userId: authUserId,
      action: data.id ? 'UPDATE_MEDICINE' : 'CREATE_MEDICINE',
      entityType: 'Medicine',
      entityId: med.id,
      newValue: med,
    });

    return med;
  }

  // Master Data Methods: Investigations
  static async getInvestigations(includeInactive = true) {
    return await prisma.investigation.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  static async searchInvestigations(query: string, limit = 50) {
    const q = query.trim();
    return await prisma.investigation.findMany({
      where: q
        ? {
            OR: [
              { code: { contains: q, mode: 'insensitive' } },
              { name: { contains: q, mode: 'insensitive' } },
              { category: { contains: q, mode: 'insensitive' } },
            ],
            isActive: true,
          }
        : { isActive: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      take: limit,
    });
  }

  static async saveInvestigation(data: any, authUserId: string) {
    let inv;
    if (data.id) {
      inv = await prisma.investigation.update({
        where: { id: data.id },
        data: {
          code: data.code.trim().toUpperCase(),
          name: data.name.trim(),
          category: data.category.trim(),
          description: data.description?.trim() || null,
          isActive: data.isActive !== undefined ? data.isActive : true,
        },
      });
    } else {
      inv = await prisma.investigation.create({
        data: {
          code: data.code.trim().toUpperCase(),
          name: data.name.trim(),
          category: data.category.trim(),
          description: data.description?.trim() || null,
          isActive: data.isActive !== undefined ? data.isActive : true,
        },
      });
    }

    await AuditService.log({
      userId: authUserId,
      action: data.id ? 'UPDATE_INVESTIGATION' : 'CREATE_INVESTIGATION',
      entityType: 'Investigation',
      entityId: inv.id,
      newValue: inv,
    });

    return inv;
  }

  static async toggleInvestigationStatus(id: string, authUserId: string) {
    const inv = await prisma.investigation.findUnique({ where: { id } });
    if (!inv) throw new Error('Investigation not found');
    const updated = await prisma.investigation.update({
      where: { id },
      data: { isActive: !inv.isActive },
    });
    await AuditService.log({
      userId: authUserId,
      action: 'TOGGLE_INVESTIGATION_STATUS',
      entityType: 'Investigation',
      entityId: inv.id,
      newValue: updated,
    });
    return updated;
  }

  // Master Data Methods: Services & Prices
  static async getServices(activeOnly = false) {
    const where: any = activeOnly ? { isActive: true } : {};
    return await prisma.service.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  static async saveService(data: any, authUserId: string) {
    let srv;
    if (data.id) {
      srv = await prisma.service.update({
        where: { id: data.id },
        data: {
          code: data.code.trim().toUpperCase(),
          name: data.name.trim(),
          category: data.category,
          standardPrice: data.standardPrice,
          isTaxable: Boolean(data.isTaxable),
          taxPercent: data.taxPercent || 0,
          isActive: data.isActive !== undefined ? data.isActive : true,
        },
      });
    } else {
      srv = await prisma.service.create({
        data: {
          code: data.code.trim().toUpperCase(),
          name: data.name.trim(),
          category: data.category,
          standardPrice: data.standardPrice,
          isTaxable: Boolean(data.isTaxable),
          taxPercent: data.taxPercent || 0,
          isActive: true,
        },
      });
    }

    await AuditService.log({
      userId: authUserId,
      action: data.id ? 'UPDATE_SERVICE' : 'CREATE_SERVICE',
      entityType: 'Service',
      entityId: srv.id,
      newValue: srv,
    });

    return srv;
  }

  // Master Data Methods: Panel Clients
  static async getPanelClients(activeOnly = false) {
    const where: any = activeOnly ? { isActive: true } : {};
    return await prisma.panelClient.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  static async savePanelClient(data: any, authUserId: string) {
    let panel;
    if (data.id) {
      panel = await prisma.panelClient.update({
        where: { id: data.id },
        data: {
          name: data.name.trim(),
          code: data.code.trim().toUpperCase(),
          contactPerson: data.contactPerson?.trim() || null,
          phone: data.phone?.trim() || null,
          email: data.email?.trim() || null,
          address: data.address?.trim() || null,
          discountPercent: data.discountPercent || 0,
          billingType: data.billingType || 'CREDIT',
          effectiveStartDate: data.effectiveStartDate ? new Date(data.effectiveStartDate) : null,
          effectiveEndDate: data.effectiveEndDate ? new Date(data.effectiveEndDate) : null,
          isActive: data.isActive !== undefined ? data.isActive : true,
        },
      });
    } else {
      panel = await prisma.panelClient.create({
        data: {
          name: data.name.trim(),
          code: data.code.trim().toUpperCase(),
          contactPerson: data.contactPerson?.trim() || null,
          phone: data.phone?.trim() || null,
          email: data.email?.trim() || null,
          address: data.address?.trim() || null,
          discountPercent: data.discountPercent || 0,
          billingType: data.billingType || 'CREDIT',
          effectiveStartDate: data.effectiveStartDate ? new Date(data.effectiveStartDate) : null,
          effectiveEndDate: data.effectiveEndDate ? new Date(data.effectiveEndDate) : null,
          isActive: true,
        },
      });
    }

    await AuditService.log({
      userId: authUserId,
      action: data.id ? 'UPDATE_PANEL_CLIENT' : 'CREATE_PANEL_CLIENT',
      entityType: 'PanelClient',
      entityId: panel.id,
      newValue: panel,
    });

    return panel;
  }

  // Master Data Methods: Users & RBAC
  static async getUsers() {
    const users = await prisma.user.findMany({
      orderBy: { username: 'asc' },
      include: {
        roles: { include: { role: true } },
        doctor: true,
      },
    });

    return users.map((u) => ({
      id: u.id,
      username: u.username,
      fullName: u.fullName,
      email: u.email,
      phone: u.phone,
      isActive: u.isActive,
      lastLoginAt: u.lastLoginAt?.toISOString() || null,
      roles: u.roles.map((r) => r.role.name),
      doctorId: u.doctorId,
      doctorName: u.doctor?.name,
    }));
  }

  static async saveUser(data: {
    id?: string;
    username: string;
    password?: string;
    fullName: string;
    email?: string | null;
    phone?: string | null;
    roles: RoleType[];
    doctorId?: string | null;
    isActive?: boolean;
  }, authUserId: string) {
    if (data.id) {
      const updateData: any = {
        fullName: data.fullName.trim(),
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        doctorId: data.doctorId || null,
        isActive: data.isActive !== undefined ? data.isActive : true,
      };

      if (data.password && data.password.trim()) {
        updateData.passwordHash = await bcrypt.hash(data.password.trim(), 10);
      }

      const user = await prisma.$transaction(async (tx) => {
        const u = await tx.user.update({
          where: { id: data.id },
          data: updateData,
        });

        // Reassign roles
        await tx.userRole.deleteMany({ where: { userId: u.id } });
        for (const rName of data.roles) {
          const role = await tx.role.findUnique({ where: { name: rName } });
          if (role) {
            await tx.userRole.create({
              data: { userId: u.id, roleId: role.id },
            });
          }
        }
        return u;
      });

      await AuditService.log({
        userId: authUserId,
        action: 'UPDATE_USER',
        entityType: 'User',
        entityId: user.id,
        newValue: { username: user.username, roles: data.roles },
      });

      return user;
    } else {
      if (!data.password) throw new Error('Password is required for new users.');
      const passwordHash = await bcrypt.hash(data.password.trim(), 10);

      const user = await prisma.$transaction(async (tx) => {
        const u = await tx.user.create({
          data: {
            username: data.username.trim().toLowerCase(),
            passwordHash,
            fullName: data.fullName.trim(),
            email: data.email?.trim() || null,
            phone: data.phone?.trim() || null,
            doctorId: data.doctorId || null,
            isActive: true,
          },
        });

        for (const rName of data.roles) {
          const role = await tx.role.findUnique({ where: { name: rName } });
          if (role) {
            await tx.userRole.create({
              data: { userId: u.id, roleId: role.id },
            });
          }
        }
        return u;
      });

      await AuditService.log({
        userId: authUserId,
        action: 'CREATE_USER',
        entityType: 'User',
        entityId: user.id,
        newValue: { username: user.username, roles: data.roles },
      });

      return user;
    }
  }
}
