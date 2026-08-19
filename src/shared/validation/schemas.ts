import { z } from 'zod';
import {
  Gender,
  BloodGroup,
  VisitType,
  VisitStatus,
  FoodRelation,
  ServiceCategory,
  PaymentMethod,
  AdjustmentType,
} from '../constants/enums';

// Auth Validation
export const LoginSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(4, 'Password must be at least 4 characters'),
});

// Patient Validation
export const CreatePatientSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  guardianName: z.string().optional().nullable(),
  dob: z.string().optional().nullable(),
  age: z.number().int().min(0).max(150).optional().nullable(),
  gender: z.nativeEnum(Gender, { errorMap: () => ({ message: 'Please select gender' }) }),
  bloodGroup: z.nativeEnum(BloodGroup).default(BloodGroup.UNKNOWN),
  phone: z.string().min(7, 'Valid contact phone number is required'),
  alternatePhone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  nic: z.string().optional().nullable(),
  employeeId: z.string().optional().nullable(),
  panelClientId: z.string().uuid().optional().nullable(),
  emergencyContactName: z.string().optional().nullable(),
  emergencyContactPhone: z.string().optional().nullable(),
  emergencyContactRelation: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const UpdatePatientSchema = CreatePatientSchema.partial().extend({
  id: z.string().uuid(),
  isActive: z.boolean().optional(),
});

// Panel Client Validation
export const PanelClientSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  name: z.string().min(2, 'Organization name is required'),
  code: z.string().min(2, 'Organization code is required'),
  contactPerson: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  address: z.string().optional().nullable(),
  discountPercent: z.number().min(0).max(100).default(0),
  billingType: z.string().default('CREDIT'),
  effectiveStartDate: z.string().optional().nullable(),
  effectiveEndDate: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

// Doctor Validation
export const DoctorSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  name: z.string().min(2, 'Doctor name is required'),
  printableTitle: z.string().min(2, 'Printable title/qualifications is required'),
  licenseNumber: z.string().min(3, 'Medical registration / license number is required'),
  specialty: z.string().min(2, 'Specialty is required'),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  departmentId: z.string().uuid('Department is required'),
  consultationFee: z.number().min(0, 'Consultation fee cannot be negative'),
  followUpFee: z.number().min(0, 'Follow-up fee cannot be negative'),
  signatureData: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

// Department Validation
export const DepartmentSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  code: z.string().min(2, 'Department code is required'),
  name: z.string().min(2, 'Department name is required'),
  description: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

// Visit Validation
export const CreateVisitSchema = z.object({
  patientId: z.string().uuid('Patient is required'),
  doctorId: z.string().uuid('Doctor is required'),
  departmentId: z.string().uuid('Department is required'),
  visitType: z.nativeEnum(VisitType).default(VisitType.NEW_CONSULTATION),
  priority: z.string().default('NORMAL'),
  notes: z.string().optional().nullable(),
  customFee: z.number().min(0).optional(),
});

export const UpdateVisitStatusSchema = z.object({
  visitId: z.string().uuid(),
  status: z.nativeEnum(VisitStatus),
});

// Vitals Validation
export const RecordVitalsSchema = z.object({
  visitId: z.string().uuid(),
  patientId: z.string().uuid(),
  temperature: z.number().min(70).max(120).optional().nullable(),
  pulse: z.number().int().min(20).max(300).optional().nullable(),
  respiratoryRate: z.number().int().min(5).max(100).optional().nullable(),
  systolicBp: z.number().int().min(40).max(300).optional().nullable(),
  diastolicBp: z.number().int().min(20).max(200).optional().nullable(),
  spo2: z.number().min(40).max(100).optional().nullable(),
  weight: z.number().min(0.5).max(500).optional().nullable(),
  height: z.number().min(20).max(300).optional().nullable(),
  bloodGlucose: z.number().min(10).max(1500).optional().nullable(),
  glucoseType: z.string().optional().nullable(),
  painScore: z.number().int().min(0).max(10).optional().nullable(),
  observations: z.string().optional().nullable(),
});

// Consultation Validation
export const SaveConsultationSchema = z.object({
  visitId: z.string().uuid(),
  patientId: z.string().uuid(),
  doctorId: z.string().uuid(),
  chiefComplaint: z.string().min(2, 'Chief complaint is required'),
  historyOfPresentIllness: z.string().optional().nullable(),
  pastMedicalHistory: z.string().optional().nullable(),
  physicalExamination: z.string().optional().nullable(),
  diagnosis: z.string().min(2, 'Diagnosis is required'),
  clinicalNotes: z.string().optional().nullable(),
  advice: z.string().optional().nullable(),
  followUpDate: z.string().optional().nullable(),
  isFinalized: z.boolean().default(false),
});

export const AmendConsultationSchema = z.object({
  consultationId: z.string().uuid(),
  reason: z.string().min(5, 'Amendment reason is required'),
  chiefComplaint: z.string().min(2),
  diagnosis: z.string().min(2),
  clinicalNotes: z.string().optional().nullable(),
  advice: z.string().optional().nullable(),
  followUpDate: z.string().optional().nullable(),
});

// Medicine Validation
export const MedicineSchema = z.object({
  brandName: z.string().min(1, 'Brand name is required'),
  genericName: z.string().min(1, 'Generic name is required'),
  strength: z.string().min(1, 'Strength is required'),
  dosageForm: z.string().min(1, 'Dosage form is required'),
  manufacturer: z.string().optional().nullable(),
  defaultDosage: z.string().optional().nullable(),
  defaultFrequency: z.string().optional().nullable(),
  defaultRoute: z.string().optional().nullable(),
  defaultDuration: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

// Investigation Validation
export const InvestigationSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Investigation name is required'),
  category: z.string().min(1, 'Category is required'),
  description: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

// Prescription Item Validation
export const PrescriptionItemSchema = z.object({
  medicineId: z.string().uuid().optional().nullable(),
  medicineName: z.string().min(1, 'Medicine name is required'),
  genericName: z.string().optional().nullable(),
  strength: z.string().optional().nullable(),
  dosageForm: z.string().optional().nullable(),
  dose: z.string().min(1, 'Dose is required'),
  frequency: z.string().min(1, 'Frequency is required'),
  route: z.string().default('Oral'),
  duration: z.string().min(1, 'Duration is required'),
  quantity: z.number().int().min(1).optional().nullable(),
  instructions: z.string().optional().nullable(),
  foodRelation: z.nativeEnum(FoodRelation).default(FoodRelation.AFTER_FOOD),
  additionalNotes: z.string().optional().nullable(),
  sortOrder: z.number().int().default(0),
});

export const PrescriptionInvestigationSchema = z.object({
  investigationId: z.string().uuid().optional().nullable(),
  investigationName: z.string().min(1, 'Investigation name is required'),
  instructions: z.string().optional().nullable(),
  sortOrder: z.number().int().default(0),
});

export const SavePrescriptionSchema = z.object({
  visitId: z.string().uuid(),
  patientId: z.string().uuid(),
  doctorId: z.string().uuid(),
  consultationId: z.string().uuid().optional().nullable(),
  diagnosis: z.string().optional().nullable(),
  clinicalNotes: z.string().optional().nullable(),
  advice: z.string().optional().nullable(),
  followUpDate: z.string().optional().nullable(),
  isFinalized: z.boolean().default(false),
  items: z.array(PrescriptionItemSchema),
  investigations: z.array(PrescriptionInvestigationSchema),
});

export const AmendPrescriptionSchema = z.object({
  prescriptionId: z.string().uuid(),
  reason: z.string().min(5, 'Amendment reason is required'),
  diagnosis: z.string().optional().nullable(),
  clinicalNotes: z.string().optional().nullable(),
  advice: z.string().optional().nullable(),
  followUpDate: z.string().optional().nullable(),
  items: z.array(PrescriptionItemSchema),
  investigations: z.array(PrescriptionInvestigationSchema),
});

// Billing & Invoicing Validation
export const ServiceSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(2, 'Service name is required'),
  category: z.nativeEnum(ServiceCategory),
  standardPrice: z.number().min(0, 'Standard price cannot be negative'),
  isTaxable: z.boolean().default(false),
  taxPercent: z.number().min(0).max(100).default(0),
  isActive: z.boolean().default(true),
});

export const CreateVisitChargeSchema = z.object({
  visitId: z.string().uuid(),
  patientId: z.string().uuid(),
  serviceId: z.string().uuid().optional().nullable(),
  serviceName: z.string().min(1, 'Service name is required'),
  description: z.string().optional().nullable(),
  quantity: z.number().int().min(1).default(1),
  unitPrice: z.number().min(0, 'Unit price cannot be negative'),
  discount: z.number().min(0).default(0),
  taxAmount: z.number().min(0).default(0),
});

export const FinalizeInvoiceSchema = z.object({
  visitId: z.string().uuid(),
  patientId: z.string().uuid(),
  doctorId: z.string().uuid().optional().nullable(),
  panelClientId: z.string().uuid().optional().nullable(),
  panelClaimNo: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  chargeIds: z.array(z.string().uuid()),
  discountTotal: z.number().min(0).default(0),
  initialPayment: z
    .object({
      amount: z.number().min(0),
      paymentMethod: z.nativeEnum(PaymentMethod),
      transactionReference: z.string().optional().nullable(),
      notes: z.string().optional().nullable(),
    })
    .optional(),
});

export const RecordPaymentSchema = z.object({
  invoiceId: z.string().uuid(),
  patientId: z.string().uuid(),
  amount: z.number().min(0.01, 'Payment amount must be greater than zero'),
  paymentMethod: z.nativeEnum(PaymentMethod),
  transactionReference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const FinancialAdjustmentSchema = z.object({
  invoiceId: z.string().uuid(),
  paymentId: z.string().uuid().optional().nullable(),
  type: z.nativeEnum(AdjustmentType),
  adjustedAmount: z.number().min(0),
  reason: z.string().min(5, 'Detailed reason is required for financial adjustment'),
});

// Admin & Setting Validation
export const HospitalSettingSchema = z.object({
  hospitalName: z.string().min(2),
  tagline: z.string().optional().nullable(),
  address: z.string().min(5),
  city: z.string().min(2),
  phone: z.string().min(5),
  email: z.string().email(),
  website: z.string().optional().nullable(),
  taxNumber: z.string().optional().nullable(),
  currencySymbol: z.string().min(1),
  logoBase64: z.string().optional().nullable(),
  prescriptionDisclaimer: z.string().optional().nullable(),
  invoiceDisclaimer: z.string().optional().nullable(),
});
