const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const RoleType = {
  ADMINISTRATOR: 'ADMINISTRATOR',
  RECEPTION: 'RECEPTION',
};

const ROLE_PERMISSIONS = {
  [RoleType.ADMINISTRATOR]: [
    'patient:create', 'patient:read', 'patient:update_demographics', 'patient:view_full_history',
    'visit:create', 'visit:read', 'visit:update_status', 'visit:cancel',
    'vitals:record', 'vitals:read',
    'consultation:create', 'consultation:read', 'consultation:amend',
    'prescription:create', 'prescription:finalize', 'prescription:amend', 'prescription:print',
    'billing:create_charge', 'billing:create_invoice', 'billing:receive_payment', 'billing:apply_discount',
    'billing:adjust_financial', 'billing:void_invoice', 'billing:print_slip',
    'report:view_operational', 'report:view_financial', 'report:export',
    'admin:manage_users', 'admin:manage_masters', 'admin:audit_logs', 'admin:backup_restore',
  ],
  [RoleType.RECEPTION]: [
    'patient:create', 'patient:read', 'patient:update_demographics', 'patient:view_full_history',
    'visit:create', 'visit:read', 'visit:update_status', 'visit:cancel',
    'vitals:record', 'vitals:read',
    'consultation:read', 'prescription:print',
    'billing:create_charge', 'billing:create_invoice', 'billing:receive_payment', 'billing:apply_discount',
    'billing:print_slip', 'report:view_operational',
  ],
};

async function main() {
  console.log('Seeding City Hospital database...');

  // 1. Hospital Settings
  await prisma.hospitalSetting.upsert({
    where: { id: 'default_config' },
    update: {},
    create: {
      id: 'default_config',
      hospitalName: 'City Hospital',
      tagline: 'Center for Medical Excellence & Compassionate Care',
      address: '123 Healthcare Boulevard, Medical District',
      city: 'Metropolis',
      phone: '+1 (555) 019-2834 / +1 (555) 019-2835',
      email: 'contact@cityhospital.org',
      website: 'www.cityhospital.org',
      taxNumber: 'TX-984210-CH',
      currencySymbol: 'Rs.',
      prescriptionDisclaimer:
        'This prescription is valid for 7 days from the date of issue. Not valid for medico-legal purposes without the official hospital seal. Keep all medicines out of reach of children.',
      invoiceDisclaimer:
        'Payment is due upon receipt of services rendered. Computer-generated invoice; no physical signature required. Retain this slip for your medical expense reimbursement records.',
    },
  });

  // 2. Roles & Permissions
  for (const [roleName, permissions] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: {
        name: roleName,
        description: `Standard role for ${roleName.toLowerCase()}`,
      },
    });

    for (const permCode of permissions) {
      const permission = await prisma.permission.upsert({
        where: { code: permCode },
        update: {},
        create: {
          code: permCode,
          name: permCode.replace(':', ' ').toUpperCase(),
          category: permCode.split(':')[0],
        },
      });

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });
    }
  }

  // 3. Departments
  const departmentsData = [
    { code: 'GEN_MED', name: 'General Medicine', description: 'Primary adult medical care, internal medicine, and chronic disease management.' },
    { code: 'CARDIO', name: 'Cardiology', description: 'Cardiovascular disorders, hypertension, ECG, echocardiography, and cardiac care.' },
    { code: 'PED', name: 'Pediatrics', description: 'Infant, child, and adolescent healthcare, vaccinations, and developmental screening.' },
    { code: 'ORTHO', name: 'Orthopedics', description: 'Bone, joint, spine, musculoskeletal trauma, and sports injury management.' },
    { code: 'GYN', name: 'Gynecology & Obstetrics', description: "Women's reproductive health, prenatal, antenatal, and postnatal care." },
    { code: 'ENT', name: 'Otolaryngology (ENT)', description: 'Ear, nose, throat, sinuses, head and neck medical conditions.' },
    { code: 'DERM', name: 'Dermatology', description: 'Skin, hair, nails, allergy management, and dermatological procedures.' },
    { code: 'SURG', name: 'General Surgery', description: 'Surgical consultations, minor trauma, wound care, and operative management.' },
  ];

  const deptMap = {};
  for (const dept of departmentsData) {
    const created = await prisma.department.upsert({
      where: { code: dept.code },
      update: { name: dept.name, description: dept.description },
      create: dept,
    });
    deptMap[dept.code] = created.id;
  }

  // 4. Doctors
  const doctorsData = [
    {
      name: 'Dr. Sarah Jenkins',
      printableTitle: 'Dr. Sarah Jenkins, MBBS, FCPS, FACC (Cardiologist)',
      licenseNumber: 'PMC-CARD-49201',
      specialty: 'Cardiology',
      departmentId: deptMap['CARDIO'],
      consultationFee: 2500,
      followUpFee: 1500,
      phone: '+1 (555) 431-9011',
      email: 'sarah.jenkins@cityhospital.org',
    },
    {
      name: 'Dr. Ahmed Khan',
      printableTitle: 'Dr. Ahmed Khan, MBBS, MD (Internal Medicine)',
      licenseNumber: 'PMC-MED-18293',
      specialty: 'General Medicine',
      departmentId: deptMap['GEN_MED'],
      consultationFee: 2000,
      followUpFee: 1200,
      phone: '+1 (555) 431-9012',
      email: 'ahmed.khan@cityhospital.org',
    },
    {
      name: 'Dr. Emily Davis',
      printableTitle: 'Dr. Emily Davis, MBBS, DCH, MCPS (Pediatrics)',
      licenseNumber: 'PMC-PED-38290',
      specialty: 'Pediatrics',
      departmentId: deptMap['PED'],
      consultationFee: 2200,
      followUpFee: 1400,
      phone: '+1 (555) 431-9013',
      email: 'emily.davis@cityhospital.org',
    },
    {
      name: 'Dr. Robert Chen',
      printableTitle: 'Dr. Robert Chen, MBBS, MS Ortho, FRCS',
      licenseNumber: 'PMC-ORTH-71029',
      specialty: 'Orthopedics',
      departmentId: deptMap['ORTHO'],
      consultationFee: 2800,
      followUpFee: 1800,
      phone: '+1 (555) 431-9014',
      email: 'robert.chen@cityhospital.org',
    },
  ];

  const docMap = {};
  for (const doc of doctorsData) {
    const created = await prisma.doctor.upsert({
      where: { licenseNumber: doc.licenseNumber },
      update: {
        name: doc.name,
        printableTitle: doc.printableTitle,
        consultationFee: doc.consultationFee,
        followUpFee: doc.followUpFee,
        specialty: doc.specialty,
        departmentId: doc.departmentId,
      },
      create: doc,
    });
    docMap[doc.name] = created.id;
  }

  // 5. Users & Credential Accounts (Admin & Receptionist)
  const usersData = [
    {
      username: 'admin',
      fullName: 'Hospital Administrator',
      password: 'admin123',
      role: RoleType.ADMINISTRATOR,
      email: 'admin@cityhospital.org',
    },
    {
      username: 'reception',
      fullName: 'Front Desk Receptionist',
      password: 'reception123',
      role: RoleType.RECEPTION,
      email: 'reception@cityhospital.org',
    },
  ];

  for (const u of usersData) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    const user = await prisma.user.upsert({
      where: { username: u.username },
      update: {
        fullName: u.fullName,
        doctorId: u.doctorId || null,
        passwordHash,
        isActive: true,
      },
      create: {
        username: u.username,
        fullName: u.fullName,
        passwordHash,
        email: u.email,
        doctorId: u.doctorId || null,
        isActive: true,
      },
    });

    const role = await prisma.role.findUnique({ where: { name: u.role } });
    if (role) {
      await prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId: user.id,
            roleId: role.id,
          },
        },
        update: {},
        create: {
          userId: user.id,
          roleId: role.id,
        },
      });
    }
  }

  // 6. Panel Clients
  const panelData = [
    {
      code: 'NAT_HEALTH',
      name: 'National Health Services Corporation',
      contactPerson: 'Marcus Wright',
      phone: '+1 (555) 201-8844',
      email: 'billing@nathealthcorp.com',
      address: '742 Executive Way, Suite 400',
      discountPercent: 15.0,
      billingType: 'CREDIT',
    },
    {
      code: 'APEX_CARE',
      name: 'Apex Corporate Wellness Trust',
      contactPerson: 'Elena Rostova',
      phone: '+1 (555) 309-1122',
      email: 'claims@apexcorp.org',
      address: '100 Financial Center, 12th Floor',
      discountPercent: 20.0,
      billingType: 'CREDIT',
    },
    {
      code: 'POLICE_WELFARE',
      name: 'Metropolis Police Welfare Board',
      contactPerson: 'Captain John Brody',
      phone: '+1 (555) 911-0044',
      email: 'welfare@metropolice.gov',
      address: '500 Central Police Plaza',
      discountPercent: 25.0,
      billingType: 'CREDIT',
    },
  ];

  for (const p of panelData) {
    await prisma.panelClient.upsert({
      where: { code: p.code },
      update: p,
      create: p,
    });
  }

  // 7. Medicine Master
  const medicines = [
    { brandName: 'Augmentin', genericName: 'Amoxicillin + Clavulanic Acid', strength: '625mg', dosageForm: 'Tablet', manufacturer: 'GSK', defaultDosage: '1 Tab', defaultFrequency: '1-0-1 (BD)', defaultRoute: 'Oral', defaultDuration: '5 Days' },
    { brandName: 'Panadol', genericName: 'Paracetamol', strength: '500mg', dosageForm: 'Tablet', manufacturer: 'GSK', defaultDosage: '1-2 Tabs', defaultFrequency: 'TDS (PRN)', defaultRoute: 'Oral', defaultDuration: '3 Days' },
    { brandName: 'Brufen', genericName: 'Ibuprofen', strength: '400mg', dosageForm: 'Tablet', manufacturer: 'Abbott', defaultDosage: '1 Tab', defaultFrequency: 'BD', defaultRoute: 'Oral', defaultDuration: '3 Days' },
    { brandName: 'Risek', genericName: 'Omeprazole', strength: '40mg', dosageForm: 'Capsule', manufacturer: 'Getz Pharma', defaultDosage: '1 Cap', defaultFrequency: 'OD (Morning)', defaultRoute: 'Oral', defaultDuration: '14 Days' },
    { brandName: 'Lipitor', genericName: 'Atorvastatin', strength: '20mg', dosageForm: 'Tablet', manufacturer: 'Pfizer', defaultDosage: '1 Tab', defaultFrequency: 'OD (Night)', defaultRoute: 'Oral', defaultDuration: '30 Days' },
    { brandName: 'Glucophage', genericName: 'Metformin HCl', strength: '500mg', dosageForm: 'Tablet', manufacturer: 'Merck', defaultDosage: '1 Tab', defaultFrequency: '1-0-1 (BD)', defaultRoute: 'Oral', defaultDuration: '30 Days' },
    { brandName: 'Concor', genericName: 'Bisoprolol Fumarate', strength: '5mg', dosageForm: 'Tablet', manufacturer: 'Merck', defaultDosage: '1 Tab', defaultFrequency: 'OD (Morning)', defaultRoute: 'Oral', defaultDuration: '30 Days' },
    { brandName: 'Norvasc', genericName: 'Amlodipine', strength: '5mg', dosageForm: 'Tablet', manufacturer: 'Pfizer', defaultDosage: '1 Tab', defaultFrequency: 'OD (Morning)', defaultRoute: 'Oral', defaultDuration: '30 Days' },
    { brandName: 'Zithromax', genericName: 'Azithromycin', strength: '500mg', dosageForm: 'Tablet', manufacturer: 'Pfizer', defaultDosage: '1 Tab', defaultFrequency: 'OD', defaultRoute: 'Oral', defaultDuration: '3 Days' },
    { brandName: 'Ciprobay', genericName: 'Ciprofloxacin', strength: '500mg', dosageForm: 'Tablet', manufacturer: 'Bayer', defaultDosage: '1 Tab', defaultFrequency: 'BD', defaultRoute: 'Oral', defaultDuration: '5 Days' },
    { brandName: 'Ventolin Inhaler', genericName: 'Salbutamol', strength: '100mcg/puff', dosageForm: 'Inhaler', manufacturer: 'GSK', defaultDosage: '2 Puffs', defaultFrequency: 'PRN / QID', defaultRoute: 'Inhalation', defaultDuration: 'As needed' },
    { brandName: 'Clexane', genericName: 'Enoxaparin Sodium', strength: '40mg/0.4ml', dosageForm: 'Injection', manufacturer: 'Sanofi', defaultDosage: '1 Syringe', defaultFrequency: 'OD', defaultRoute: 'Subcutaneous', defaultDuration: '5 Days' },
  ];

  for (const m of medicines) {
    const existing = await prisma.medicine.findFirst({
      where: { brandName: m.brandName, strength: m.strength },
    });
    if (!existing) {
      await prisma.medicine.create({ data: m });
    }
  }

  // 8. Doctor-Requested Investigations Master
  const investigations = [
    { code: 'CBC', name: 'Complete Blood Count (CBC)', category: 'Hematology', description: 'Hemoglobin, RBC, WBC, Platelets count' },
    { code: 'BSF', name: 'Blood Sugar Fasting (BSF)', category: 'Biochemistry', description: 'Fasting plasma glucose test' },
    { code: 'BSR', name: 'Blood Sugar Random (BSR)', category: 'Biochemistry', description: 'Random plasma glucose test' },
    { code: 'HBA1C', name: 'HbA1c (Glycated Hemoglobin)', category: 'Biochemistry', description: '3-month average plasma glucose concentration' },
    { code: 'LFT', name: 'Liver Function Tests (LFT)', category: 'Biochemistry', description: 'Total Bilirubin, SGPT/ALT, SGOT/AST, ALP' },
    { code: 'RFT', name: 'Renal Function Tests (RFT / KFT)', category: 'Biochemistry', description: 'Serum Creatinine, Blood Urea, BUN' },
    { code: 'LIPID', name: 'Lipid Profile', category: 'Biochemistry', description: 'Total Cholesterol, HDL, LDL, Triglycerides' },
    { code: 'URINE_RE', name: 'Urine Routine Examination (R/E)', category: 'Clinical Pathology', description: 'Microscopic and chemical urinalysis' },
    { code: 'XRAY_CHEST', name: 'X-Ray Chest PA View', category: 'Radiology', description: 'Plain radiograph of the chest and lungs' },
    { code: 'XRAY_LUMBAR', name: 'X-Ray Lumbo-sacral Spine AP/Lat', category: 'Radiology', description: 'Lumbar spinal radiography' },
    { code: 'USG_ABD', name: 'Ultrasound Whole Abdomen & Pelvis', category: 'Ultrasound', description: 'Sonographic examination of liver, kidneys, gallbladder, spleen' },
    { code: 'ECG', name: '12-Lead Electrocardiogram (ECG)', category: 'Cardiology', description: 'Resting cardiac electrical activity recording' },
    { code: 'ECHO', name: '2D Transthoracic Echocardiography', category: 'Cardiology', description: 'Cardiac ultrasound with Doppler evaluation' },
    { code: 'CT_BRAIN', name: 'CT Scan Brain (Plain)', category: 'Computed Tomography', description: 'Axial cranial computed tomography' },
    { code: 'MRI_BRAIN', name: 'MRI Brain with Contrast', category: 'Magnetic Resonance', description: 'Cranial magnetic resonance imaging' },
  ];

  for (const inv of investigations) {
    await prisma.investigation.upsert({
      where: { code: inv.code },
      update: inv,
      create: inv,
    });
  }

  // 9. Hospital Services & Standard Price List
  const services = [
    { code: 'SRV_CONSULT', name: 'Standard Doctor Consultation', category: 'CONSULTATION', standardPrice: 2000, isTaxable: false, taxPercent: 0 },
    { code: 'SRV_FOLLOWUP', name: 'Follow-up Consultation Fee', category: 'FOLLOW_UP', standardPrice: 1200, isTaxable: false, taxPercent: 0 },
    { code: 'SRV_REG', name: 'Patient Registration / Card Fee', category: 'REGISTRATION', standardPrice: 200, isTaxable: false, taxPercent: 0 },
    { code: 'SRV_EMERGENCY', name: 'Emergency Triage & Assessment', category: 'PROCEDURE', standardPrice: 3000, isTaxable: false, taxPercent: 0 },
    { code: 'SRV_ECG', name: 'ECG Diagnostic Service', category: 'PROCEDURE', standardPrice: 800, isTaxable: false, taxPercent: 0 },
    { code: 'SRV_DRESSING_S', name: 'Wound Dressing (Small)', category: 'DRESSING', standardPrice: 500, isTaxable: false, taxPercent: 0 },
    { code: 'SRV_DRESSING_L', name: 'Wound Dressing (Large / Burn)', category: 'DRESSING', standardPrice: 1200, isTaxable: false, taxPercent: 0 },
    { code: 'SRV_INJ_ADMIN', name: 'Injection Administration (IM/IV)', category: 'NURSING', standardPrice: 300, isTaxable: false, taxPercent: 0 },
    { code: 'SRV_NEB', name: 'Nebulization Session', category: 'NURSING', standardPrice: 400, isTaxable: false, taxPercent: 0 },
  ];

  for (const s of services) {
    await prisma.service.upsert({
      where: { code: s.code },
      update: s,
      create: s,
    });
  }

  // 10. Sequence Counters
  const currentYear = new Date().getFullYear();
  const sequenceDefaults = [
    { name: 'MRN', prefix: `MRN-${currentYear}-`, currentVal: 100 },
    { name: 'VISIT', prefix: `VST-${currentYear}-`, currentVal: 100 },
    { name: 'INVOICE', prefix: `INV-${currentYear}-`, currentVal: 100 },
    { name: 'PRESCRIPTION', prefix: `RX-${currentYear}-`, currentVal: 100 },
    { name: 'RECEIPT', prefix: `REC-${currentYear}-`, currentVal: 100 },
    { name: 'ADJUSTMENT', prefix: `ADJ-${currentYear}-`, currentVal: 100 },
  ];

  for (const seq of sequenceDefaults) {
    await prisma.sequenceCounter.upsert({
      where: { name: seq.name },
      update: {},
      create: seq,
    });
  }

  console.log('City Hospital database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
