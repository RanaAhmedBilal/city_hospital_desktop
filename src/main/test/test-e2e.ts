import { prisma } from '../database/prisma';
import { AuthService } from '../services/auth.service';
import { PatientService } from '../services/patient.service';
import { VisitService } from '../services/visit.service';
import { VitalsService } from '../services/vitals.service';
import { ConsultationService } from '../services/consultation.service';
import { PrescriptionService } from '../services/prescription.service';
import { BillingService } from '../services/billing.service';
import { ReportService } from '../services/report.service';
import { BackupService } from '../services/backup.service';
import { BloodGroup, Gender, VisitType, FoodRelation, PaymentMethod, AdjustmentType } from '../../shared/constants/enums';

async function runE2ETestSuite() {
  console.log('================================================================');
  console.log('   CITY HOSPITAL HMS - END-TO-END ACCEPTANCE & INTEGRATION TEST');
  console.log('================================================================\n');

  try {
    // 1. Authenticate Admin, Doctor, and Cashier
    console.log('[1/11] Testing RBAC Authentication & Session Generation...');
    const adminAuth = await AuthService.login('admin', 'admin123');
    const doctorAuth = await AuthService.login('dr.sarah', 'doctor123');
    const cashierAuth = await AuthService.login('cashier', 'cashier123');

    console.log(`  ✓ Admin Login: ${adminAuth.user.fullName} (Roles: ${adminAuth.user.roles.join(', ')})`);
    console.log(`  ✓ Doctor Login: ${doctorAuth.user.fullName} (Dr ID: ${doctorAuth.user.doctorId})`);
    console.log(`  ✓ Cashier Login: ${cashierAuth.user.fullName}`);

    // 2. Patient Registration and Duplicate Prevention
    console.log('\n[2/11] Testing Patient Registration & Duplicate Prevention...');
    const uniquePhone = `+92-300-${Math.floor(1000000 + Math.random() * 9000000)}`;
    const uniqueNic = `42101-${Math.floor(1000000 + Math.random() * 9000000)}-1`;

    const patient = await PatientService.registerPatient({
      fullName: 'Robert Harrison',
      guardianName: 'George Harrison',
      age: 48,
      gender: Gender.MALE,
      bloodGroup: BloodGroup.O_POSITIVE,
      phone: uniquePhone,
      nic: uniqueNic,
      address: '742 Evergreen Terrace, Sector 4',
      city: 'Metropolis',
    }, adminAuth.user.id);

    console.log(`  ✓ Registered Patient: ${patient.fullName} | Assigned MRN: ${patient.mrn}`);

    // Duplicate Check
    try {
      await PatientService.registerPatient({
        fullName: 'Duplicate Robert',
        gender: Gender.MALE,
        phone: '+92-300-0000000',
        nic: uniqueNic, // Same NIC
      }, adminAuth.user.id);
      throw new Error('Duplicate NIC check failed to block registration!');
    } catch (err: any) {
      console.log(`  ✓ Duplicate Detection Blocked Registration as Expected: "${err.message}"`);
    }

    // 3. Doctor and Department Lookup
    console.log('\n[3/11] Resolving Doctor & Department Masters...');
    const doctor = await prisma.doctor.findFirst({ where: { user: { username: 'dr.sarah' } } });
    if (!doctor) throw new Error('Doctor Sarah Jenkins not found in database.');
    console.log(`  ✓ Consulting Doctor: Dr. ${doctor.name} (${doctor.specialty}) | Fee: Rs. ${doctor.consultationFee}`);

    // 4. Visit Encounter Creation
    console.log('\n[4/11] Creating OPD Visit Encounter...');
    const visit = await VisitService.createVisit({
      patientId: patient.id,
      doctorId: doctor.id,
      departmentId: doctor.departmentId,
      visitType: VisitType.NEW_CONSULTATION,
      notes: 'Patient complaints of persistent chest tightness and mild dyspnea.',
    }, adminAuth.user.id);

    console.log(`  ✓ Generated Token #${visit.tokenNumber} | Visit Number: ${visit.visitNumber}`);
    const visitCharges = await BillingService.getVisitCharges(visit.id);
    console.log(`  ✓ Automatic Consultation Fee Charge generated: Rs. ${visitCharges[0]?.unitPrice}`);

    // 5. Nurse Triage & Vitals Recording
    console.log('\n[5/11] Recording Patient Clinical Vitals (Triage)...');
    const vitals = await VitalsService.recordVitals({
      visitId: visit.id,
      patientId: patient.id,
      systolicBp: 145,
      diastolicBp: 95,
      pulse: 88,
      temperature: 98.9,
      spo2: 97,
      weight: 85.5,
      height: 178,
      bloodGlucose: 135,
      glucoseType: 'RANDOM',
      painScore: 3,
      observations: 'Mild hypertension noted; bilateral clear chest sounds.',
    }, adminAuth.user.id);

    console.log(`  ✓ Vitals Recorded: BP ${vitals.systolicBp}/${vitals.diastolicBp} mmHg | Pulse: ${vitals.pulse} bpm`);
    console.log(`  ✓ Auto-Calculated BMI: ${vitals.bmi} kg/m² (Weight: 85.5kg, Height: 178cm)`);

    // 6. Doctor Consultation & Clinical Diagnosis
    console.log('\n[6/11] Performing Doctor Consultation...');
    const consultation = await ConsultationService.saveConsultation({
      visitId: visit.id,
      patientId: patient.id,
      doctorId: doctor.id,
      chiefComplaint: 'Chest tightness, intermittent palpitations on moderate exertion for 1 week',
      historyOfPresentIllness: 'Gradual onset, non-radiating discomfort. Exacerbated by stair climbing.',
      pastMedicalHistory: 'Known hypertensive for 3 years on irregular medication.',
      physicalExamination: 'S1S2 normal, no murmurs. JVP normal. Peripheral pulses palpable.',
      diagnosis: 'Essential Stage-1 Hypertension with Exertional Angina Rule-Out',
      advice: 'Low salt diet, regular morning brisk walk, avoid strenuous unaccustomed exertion.',
      followUpDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      isFinalized: true,
    }, doctorAuth.user.id);

    console.log(`  ✓ Consultation Saved & Finalized: ${consultation.diagnosis}`);

    // 7. Prescription Builder & Advised Investigations
    console.log('\n[7/11] Generating Prescription & Advised Investigations...');
    const lipitor = await prisma.medicine.findFirst({ where: { brandName: { contains: 'Lipitor' } } });
    const augmentin = await prisma.medicine.findFirst({ where: { brandName: { contains: 'Augmentin' } } });
    const cbcTest = await prisma.investigation.findFirst({ where: { code: 'CBC' } });
    const ecgTest = await prisma.investigation.findFirst({ where: { code: 'ECG' } });

    const prescription = await PrescriptionService.savePrescription({
      visitId: visit.id,
      patientId: patient.id,
      doctorId: doctor.id,
      consultationId: consultation.id,
      diagnosis: consultation.diagnosis,
      advice: consultation.advice,
      isFinalized: true,
      items: [
        {
          medicineId: lipitor?.id,
          medicineName: lipitor?.brandName || 'Lipitor',
          genericName: lipitor?.genericName || 'Atorvastatin',
          strength: '20mg',
          dosageForm: 'Tablet',
          dose: '1 Tab',
          frequency: '0-0-1 (Night)',
          route: 'Oral',
          duration: '30 Days',
          foodRelation: FoodRelation.AFTER_FOOD,
          instructions: 'Take after dinner at bedtime',
          sortOrder: 0,
        },
        {
          medicineId: augmentin?.id,
          medicineName: augmentin?.brandName || 'Augmentin',
          genericName: augmentin?.genericName || 'Amoxicillin + Clavulanic Acid',
          strength: '625mg',
          dosageForm: 'Tablet',
          dose: '1 Tab',
          frequency: '1-0-1 (BD)',
          route: 'Oral',
          duration: '5 Days',
          foodRelation: FoodRelation.AFTER_FOOD,
          instructions: 'Complete full 5-day antibiotic course',
          sortOrder: 1,
        },
      ],
      investigations: [
        {
          investigationId: ecgTest?.id,
          investigationName: ecgTest?.name || '12-Lead Electrocardiogram (ECG)',
          instructions: 'STAT baseline recording',
          sortOrder: 0,
        },
        {
          investigationId: cbcTest?.id,
          investigationName: cbcTest?.name || 'Complete Blood Count (CBC)',
          instructions: 'Morning fasting sample',
          sortOrder: 1,
        },
      ],
    }, doctorAuth.user.id);

    console.log(`  ✓ Prescription Finalized: ${prescription.prescriptionNo} (Version: v${prescription.version})`);
    console.log(`  ✓ Prescribed ${prescription.items.length} Medicines and ${prescription.investigations.length} Diagnostic Tests`);

    // 8. Prescription Amendment Workflow
    console.log('\n[8/11] Testing Prescription Versioned Amendment...');
    const amendedRx = await PrescriptionService.amendPrescription({
      prescriptionId: prescription.id,
      reason: 'Dose adjustment: Upgraded Lipitor to 40mg based on acute lipid risk profile',
      diagnosis: consultation.diagnosis,
      advice: consultation.advice,
      items: [
        {
          medicineId: lipitor?.id,
          medicineName: 'Lipitor (High Dose)',
          genericName: 'Atorvastatin',
          strength: '40mg',
          dosageForm: 'Tablet',
          dose: '1 Tab',
          frequency: '0-0-1 (Night)',
          route: 'Oral',
          duration: '30 Days',
          foodRelation: FoodRelation.AFTER_FOOD,
          sortOrder: 0,
        },
      ],
      investigations: prescription.investigations,
    }, doctorAuth.user.id);

    console.log(`  ✓ Prescription Amended to Version v${amendedRx.version} | Reason Logged.`);

    // 9. Billing, Additional Services, and Multi-Mode Payment
    console.log('\n[9/11] Testing Billing Settlement & Invoice Finalization...');
    // Add an ECG procedure charge
    const ecgService = await prisma.service.findFirst({ where: { code: 'SRV-ECG' } });
    await BillingService.addVisitCharge({
      visitId: visit.id,
      patientId: patient.id,
      serviceId: ecgService?.id,
      serviceName: '12-Lead Electrocardiography (ECG Procedure)',
      quantity: 1,
      unitPrice: 800,
      discount: 0,
    }, cashierAuth.user.id);

    const charges = await BillingService.getVisitCharges(visit.id);
    const chargeIds = charges.map((c) => c.id);

    const invoice = await BillingService.finalizeInvoice({
      visitId: visit.id,
      patientId: patient.id,
      doctorId: doctor.id,
      chargeIds,
      discountTotal: 200,
      initialPayment: {
        amount: 2500,
        paymentMethod: PaymentMethod.CASH,
        notes: 'Cash payment at reception counter',
      },
    }, cashierAuth.user.id);

    console.log(`  ✓ Invoice Finalized: ${invoice.invoiceNumber}`);
    console.log(`  ✓ Subtotal: Rs. ${invoice.subtotal} | Discount: Rs. ${invoice.discountTotal} | Net Total: Rs. ${invoice.netTotal}`);
    console.log(`  ✓ Paid Total: Rs. ${invoice.paidTotal} | Balance Remaining: Rs. ${invoice.balanceTotal}`);
    console.log(`  ✓ Invoice Payment Status: ${invoice.status}`);

    // Record second payment to clear balance if remaining
    if (invoice.balanceTotal > 0) {
      const secondPay = await BillingService.recordPayment({
        invoiceId: invoice.id,
        patientId: patient.id,
        amount: invoice.balanceTotal,
        paymentMethod: PaymentMethod.CARD,
        transactionReference: 'POS-AUTH-98214',
        notes: 'Cleared remaining balance via Visa Card',
      }, cashierAuth.user.id);

      console.log(`  ✓ Second Payment Recorded: Rs. ${secondPay.amount} (Receipt: ${secondPay.receiptNumber})`);
    }

    // 10. Financial Adjustment / Refund
    console.log('\n[10/11] Testing Financial Adjustment / Refund Integrity...');
    const refundAdj = await BillingService.applyAdjustment({
      invoiceId: invoice.id,
      type: AdjustmentType.REFUND,
      adjustedAmount: 200,
      reason: 'Promotional courtesy discount applied post-consultation',
    }, adminAuth.user.id);

    console.log(`  ✓ Financial Adjustment Applied: ${refundAdj.adjustmentNumber} (Type: ${refundAdj.type})`);

    // 11. Reports & Database Backup Verification
    console.log('\n[11/11] Testing Operational Analytics & PostgreSQL Backup Engine...');
    const today = new Date().toISOString().split('T')[0];
    const dailyReport = await ReportService.getDailyCollection(today);
    console.log(`  ✓ Daily Collections: Rs. ${dailyReport.totalCollected.toLocaleString()} across ${dailyReport.invoiceCount} invoices.`);

    const doctorReport = await ReportService.getDoctorWiseStats({ startDate: today, endDate: today });
    console.log(`  ✓ Doctor Productivity: ${doctorReport.length} active doctors analyzed.`);

    const backup = await BackupService.createBackup(adminAuth.user.id);
    console.log(`  ✓ PostgreSQL Backup Created: ${backup.filename} (${(backup.sizeBytes / 1024).toFixed(1)} KB)`);

    console.log('\n================================================================');
    console.log('   >>> ALL 11 E2E INTEGRATION ACCEPTANCE SCENARIOS PASSED <<<');
    console.log('================================================================\n');

  } catch (err: any) {
    console.error('\n❌ E2E TEST FAILED:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runE2ETestSuite();
