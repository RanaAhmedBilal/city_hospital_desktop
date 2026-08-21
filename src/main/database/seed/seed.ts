import bcrypt from 'bcryptjs';
import { PrismaClient } from '../client/index.js';
import { RoleType, ROLE_PERMISSIONS } from '../../../shared/constants/roles';

const prisma = new PrismaClient();

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
      address: 'Tehsil Wala Gala, Near Hamid Super Store, Nowshera Virkan',
      city: 'Gujranwala',
      phone: '+92 320 8474744',
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
      where: { name: roleName as RoleType },
      update: {},
      create: {
        name: roleName as RoleType,
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

  const deptMap: Record<string, string> = {};
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
      phone: '+92 300 4319011',
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
      phone: '+92 301 4319012',
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
      phone: '+92 302 4319013',
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
      phone: '+92 303 4319014',
      email: 'robert.chen@cityhospital.org',
    },
    {
      name: 'Dr. Ayesha Malik',
      printableTitle: 'Dr. Ayesha Malik, MBBS, FCPS (Gynecology)',
      licenseNumber: 'PMC-GYN-88210',
      specialty: 'Gynecology & Obstetrics',
      departmentId: deptMap['GYN'],
      consultationFee: 2500,
      followUpFee: 1500,
      phone: '+92 304 4319015',
      email: 'ayesha.malik@cityhospital.org',
    },
  ];

  const createdDoctors: any[] = [];
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
    createdDoctors.push(created);
  }

  // 5. Users & Credential Accounts
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
    {
      username: 'cashier',
      fullName: 'Senior Cashier Desk',
      password: 'cashier123',
      role: RoleType.RECEPTION,
      email: 'cashier@cityhospital.org',
    },
  ];

  let adminUserId = '';
  for (const u of usersData) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    const user = await prisma.user.upsert({
      where: { username: u.username },
      update: {
        fullName: u.fullName,
        passwordHash,
        isActive: true,
      },
      create: {
        username: u.username,
        fullName: u.fullName,
        passwordHash,
        email: u.email,
        isActive: true,
      },
    });

    if (u.username === 'admin') adminUserId = user.id;

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
      phone: '+92 321 2018844',
      email: 'billing@nathealthcorp.com',
      address: '742 Executive Way, Suite 400',
      discountPercent: 15.0,
      billingType: 'CREDIT',
    },
    {
      code: 'APEX_CARE',
      name: 'Apex Corporate Wellness Trust',
      contactPerson: 'Elena Rostova',
      phone: '+92 322 3091122',
      email: 'claims@apexcorp.org',
      address: '100 Financial Center, 12th Floor',
      discountPercent: 20.0,
      billingType: 'CREDIT',
    },
  ];

  const createdPanels: any[] = [];
  for (const p of panelData) {
    const created = await prisma.panelClient.upsert({
      where: { code: p.code },
      update: p,
      create: p,
    });
    createdPanels.push(created);
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
    { code: 'ECG', name: '12-Lead Electrocardiogram (ECG)', category: 'Cardiology', description: 'Resting cardiac electrical activity recording' },
    { code: 'USG_ABD', name: 'Ultrasound Whole Abdomen & Pelvis', category: 'Ultrasound', description: 'Sonographic examination of abdomen' },
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
    { code: 'SRV_INJ_ADMIN', name: 'Injection Administration (IM/IV)', category: 'NURSING', standardPrice: 300, isTaxable: false, taxPercent: 0 },
  ];

  for (const s of services) {
    await prisma.service.upsert({
      where: { code: s.code },
      update: s as any,
      create: s as any,
    });
  }

  // 10. Sequence Counters
  const currentYear = new Date().getFullYear();
  const sequenceDefaults = [
    { name: 'MRN', prefix: `MRN-${currentYear}-`, currentVal: 120 },
    { name: 'VISIT', prefix: `VST-${currentYear}-`, currentVal: 150 },
    { name: 'INVOICE', prefix: `INV-${currentYear}-`, currentVal: 150 },
    { name: 'PRESCRIPTION', prefix: `RX-${currentYear}-`, currentVal: 150 },
    { name: 'RECEIPT', prefix: `REC-${currentYear}-`, currentVal: 150 },
    { name: 'ADJUSTMENT', prefix: `ADJ-${currentYear}-`, currentVal: 150 },
  ];

  for (const seq of sequenceDefaults) {
    await prisma.sequenceCounter.upsert({
      where: { name: seq.name },
      update: {},
      create: seq,
    });
  }

  // 11. Historical Seed Data: Patients, Visits, Invoices, & Payments for Analytics & Cashier Desk
  console.log('Seeding sample patients, historical visits, invoices & payments for visual analytics...');

  const samplePatientsData = [
    { mrn: `MRN-${currentYear}-000101`, fullName: 'Muhammad Tariq', gender: 'MALE', age: 45, phone: '+92 300 5550101', bloodGroup: 'B_POSITIVE', city: 'Gujranwala' },
    { mrn: `MRN-${currentYear}-000102`, fullName: 'Zainab Bibi', gender: 'FEMALE', age: 38, phone: '+92 301 5550102', bloodGroup: 'O_POSITIVE', city: 'Nowshera Virkan' },
    { mrn: `MRN-${currentYear}-000103`, fullName: 'Usman Ali', gender: 'MALE', age: 29, phone: '+92 302 5550103', bloodGroup: 'A_POSITIVE', city: 'Gujranwala' },
    { mrn: `MRN-${currentYear}-000104`, fullName: 'Fatima Noor', gender: 'FEMALE', age: 52, phone: '+92 303 5550104', bloodGroup: 'AB_POSITIVE', city: 'Kamoke' },
    { mrn: `MRN-${currentYear}-000105`, fullName: 'Bilal Hussain', gender: 'MALE', age: 60, phone: '+92 304 5550105', bloodGroup: 'O_NEGATIVE', city: 'Gujranwala' },
    { mrn: `MRN-${currentYear}-000106`, fullName: 'Saima Rashid', gender: 'FEMALE', age: 34, phone: '+92 305 5550106', bloodGroup: 'B_POSITIVE', city: 'Sheikhupura' },
    { mrn: `MRN-${currentYear}-000107`, fullName: 'Hamza Farooq', gender: 'MALE', age: 22, phone: '+92 306 5550107', bloodGroup: 'A_NEGATIVE', city: 'Gujranwala' },
    { mrn: `MRN-${currentYear}-000108`, fullName: 'Mariam Sajid', gender: 'FEMALE', age: 41, phone: '+92 307 5550108', bloodGroup: 'O_POSITIVE', city: 'Nowshera Virkan' },
  ];

  const createdPatients: any[] = [];
  for (const pt of samplePatientsData) {
    const created = await prisma.patient.upsert({
      where: { mrn: pt.mrn },
      update: pt as any,
      create: pt as any,
    });
    createdPatients.push(created);
  }

  // Generate historical visits spanning the last 30 days
  const now = new Date();
  const paymentMethodsList = ['CASH', 'CARD', 'BANK_TRANSFER', 'PANEL_CREDIT', 'ONLINE'];
  let invSeq = 100;
  let visitSeq = 100;
  let recSeq = 100;

  for (let dayOffset = 30; dayOffset >= 0; dayOffset--) {
    const visitDate = new Date(now);
    visitDate.setDate(visitDate.getDate() - dayOffset);
    visitDate.setHours(9 + (dayOffset % 8), (dayOffset * 15) % 60, 0, 0);

    // Create 1-3 visits per day
    const visitsCount = 1 + (dayOffset % 3);
    for (let i = 0; i < visitsCount; i++) {
      const uniqueSeedId = `${Date.now().toString().slice(-4)}${String(dayOffset).padStart(2, '0')}${i}`;
      const patientObj = createdPatients[(dayOffset + i) % createdPatients.length];
      const doctorObj = createdDoctors[(dayOffset + i) % createdDoctors.length];

      const visitRecord = await prisma.visit.create({
        data: {
          visitNumber: `VST-${currentYear}-S${uniqueSeedId}`,
          patientId: patientObj.id,
          doctorId: doctorObj.id,
          departmentId: doctorObj.departmentId,
          visitDateTime: visitDate,
          tokenNumber: i + 1,
          visitType: i % 2 === 0 ? 'NEW_CONSULTATION' : 'FOLLOW_UP',
          status: dayOffset === 0 ? 'WAITING' : 'COMPLETED',
          paymentStatus: dayOffset % 4 === 0 ? 'UNBILLED' : dayOffset % 3 === 0 ? 'PARTIALLY_PAID' : 'PAID',
          priority: 'NORMAL',
          notes: 'Routine outpatient consultation',
        },
      });

      // Create Visit Charges
      const consultChargeNet = doctorObj.consultationFee;
      const chargeRecord = await prisma.visitCharge.create({
        data: {
          visitId: visitRecord.id,
          patientId: patientObj.id,
          serviceName: `${doctorObj.specialty} Consultation Fee`,
          quantity: 1,
          unitPrice: consultChargeNet,
          discount: 0,
          netAmount: consultChargeNet,
          status: dayOffset % 4 === 0 ? 'DRAFT' : 'BILLED',
          createdById: adminUserId || userFallbackId(),
        },
      });

      // For non-unbilled visits, generate Invoices & Payments
      if (dayOffset % 4 !== 0) {
        const netTotal = consultChargeNet;
        const isPaid = dayOffset % 3 !== 0; // Partial paid vs Fully Paid
        const paidTotal = isPaid ? netTotal : Math.round(netTotal / 2);
        const balanceTotal = netTotal - paidTotal;
        const invStatus = isPaid ? 'PAID' : 'PARTIALLY_PAID';

        const invRecord = await prisma.invoice.create({
          data: {
            invoiceNumber: `INV-${currentYear}-S${uniqueSeedId}`,
            visitId: visitRecord.id,
            patientId: patientObj.id,
            doctorId: doctorObj.id,
            subtotal: netTotal,
            discountTotal: 0,
            taxTotal: 0,
            netTotal: netTotal,
            paidTotal: paidTotal,
            balanceTotal: balanceTotal,
            status: invStatus as any,
            createdById: adminUserId || userFallbackId(),
            createdAt: visitDate,
          },
        });

        // Link Invoice Item
        await prisma.invoiceItem.create({
          data: {
            invoiceId: invRecord.id,
            chargeId: chargeRecord.id,
            serviceName: chargeRecord.serviceName,
            quantity: 1,
            unitPrice: consultChargeNet,
            discount: 0,
            netAmount: consultChargeNet,
            createdAt: visitDate,
          },
        });

        // Create Payment Record
        const payMethod = paymentMethodsList[(dayOffset + i) % paymentMethodsList.length];

        await prisma.payment.create({
          data: {
            receiptNumber: `REC-${currentYear}-S${uniqueSeedId}`,
            invoiceId: invRecord.id,
            patientId: patientObj.id,
            amount: paidTotal,
            paymentMethod: payMethod as any,
            transactionReference: payMethod !== 'CASH' ? `TXN-${Date.now()}-${i}` : null,
            notes: 'Settlement at cashier counter',
            receivedById: adminUserId || userFallbackId(),
            receivedAt: visitDate,
          },
        });
      }
    }
  }

  console.log('City Hospital database seeded successfully with historical analytics & billing records!');
}

function userFallbackId() {
  return 'default_admin_id';
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
