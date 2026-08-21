import { RoleType } from '../constants/roles';
import {
  Gender,
  BloodGroup,
  VisitType,
  VisitStatus,
  VisitPaymentStatus,
  ClinicalRecordStatus,
  FoodRelation,
  ServiceCategory,
  ChargeStatus,
  InvoiceStatus,
  PaymentMethod,
  AdjustmentType,
} from '../constants/enums';

export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  roles: RoleType[];
  permissions: string[];
  doctorId: string | null;
}

export interface LoginResponse {
  user: AuthUser;
  token: string;
}

export interface PatientDto {
  id: string;
  mrn: string;
  fullName: string;
  guardianName: string | null;
  dob: string | null;
  age: number | null;
  gender: Gender;
  bloodGroup: BloodGroup;
  phone: string;
  alternatePhone: string | null;
  address: string | null;
  city: string | null;
  nic: string | null;
  employeeId: string | null;
  panelClientId: string | null;
  panelClientName?: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelation: string | null;
  registrationDate: string;
  isActive: boolean;
  notes: string | null;
}

export interface PanelClientDto {
  id: string;
  name: string;
  code: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  discountPercent: number;
  billingType: string;
  effectiveStartDate: string | null;
  effectiveEndDate: string | null;
  isActive: boolean;
}

export interface DepartmentDto {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  doctorCount?: number;
}

export interface DoctorDto {
  id: string;
  name: string;
  printableTitle: string;
  licenseNumber: string;
  specialty: string;
  phone: string | null;
  email: string | null;
  departmentId: string;
  departmentName?: string;
  consultationFee: number;
  followUpFee: number;
  signatureData: string | null;
  isActive: boolean;
}

export interface VisitDto {
  id: string;
  visitNumber: string;
  patientId: string;
  patient?: PatientDto;
  doctorId: string;
  doctor?: DoctorDto;
  doctorName?: string;
  doctorSpecialty?: string;
  departmentId: string;
  departmentName?: string;
  visitDateTime: string;
  tokenNumber: number;
  visitType: VisitType;
  status: VisitStatus;
  paymentStatus: VisitPaymentStatus;
  priority: string;
  notes: string | null;
  latestVitals?: VisitVitalsDto | null;
  consultation?: ConsultationDto | null;
  prescriptions?: PrescriptionDto[];
  invoices?: InvoiceDto[];
}

export interface VisitVitalsDto {
  id: string;
  visitId: string;
  patientId: string;
  temperature: number | null;
  pulse: number | null;
  respiratoryRate: number | null;
  systolicBp: number | null;
  diastolicBp: number | null;
  spo2: number | null;
  weight: number | null;
  height: number | null;
  bmi: number | null;
  bloodGlucose: number | null;
  glucoseType: string | null;
  painScore: number | null;
  observations: string | null;
  recordedById: string;
  recordedByName?: string;
  recordedAt: string;
}

export interface ConsultationDto {
  id: string;
  visitId: string;
  patientId: string;
  doctorId: string;
  doctorName?: string;
  chiefComplaint: string;
  historyOfPresentIllness: string | null;
  pastMedicalHistory: string | null;
  physicalExamination: string | null;
  diagnosis: string;
  clinicalNotes: string | null;
  advice: string | null;
  followUpDate: string | null;
  status: ClinicalRecordStatus;
  finalizedAt: string | null;
  createdAt: string;
  amendments?: ConsultationAmendmentDto[];
}

export interface ConsultationAmendmentDto {
  id: string;
  consultationId: string;
  amendedById: string;
  amendedByName?: string;
  amendedAt: string;
  reason: string;
  previousContent: string;
  newContent: string;
}

export interface MedicineDto {
  id: string;
  brandName: string;
  genericName: string;
  strength: string;
  dosageForm: string;
  manufacturer: string | null;
  defaultDosage: string | null;
  defaultFrequency: string | null;
  defaultRoute: string | null;
  defaultDuration: string | null;
  isActive: boolean;
}

export interface InvestigationDto {
  id: string;
  code: string;
  name: string;
  category: string;
  description: string | null;
  isActive: boolean;
}

export interface PrescriptionItemDto {
  id?: string;
  prescriptionId?: string;
  medicineId?: string | null;
  medicineName: string;
  genericName?: string | null;
  strength?: string | null;
  dosageForm?: string | null;
  dose: string;
  frequency: string;
  route: string;
  duration: string;
  quantity?: number | null;
  instructions?: string | null;
  foodRelation: FoodRelation;
  additionalNotes?: string | null;
  sortOrder: number;
}

export interface PrescriptionInvestigationDto {
  id?: string;
  prescriptionId?: string;
  investigationId?: string | null;
  investigationName: string;
  instructions?: string | null;
  sortOrder: number;
}

export interface PrescriptionDto {
  id: string;
  prescriptionNo: string;
  visitId: string;
  patientId: string;
  doctorId: string;
  doctorName?: string;
  doctorSpecialty?: string;
  doctorPrintableTitle?: string;
  consultationId: string | null;
  diagnosis: string | null;
  clinicalNotes: string | null;
  advice: string | null;
  followUpDate: string | null;
  status: ClinicalRecordStatus;
  finalizedAt: string | null;
  version: number;
  createdAt: string;
  items: PrescriptionItemDto[];
  investigations: PrescriptionInvestigationDto[];
  amendments?: PrescriptionAmendmentDto[];
}

export interface PrescriptionAmendmentDto {
  id: string;
  prescriptionId: string;
  amendedById: string;
  amendedByName?: string;
  amendedAt: string;
  reason: string;
  previousContent: string;
  newContent: string;
}

export interface ServiceDto {
  id: string;
  code: string;
  name: string;
  category: ServiceCategory;
  standardPrice: number;
  isTaxable: boolean;
  taxPercent: number;
  isActive: boolean;
}

export interface VisitChargeDto {
  id: string;
  visitId: string;
  patientId: string;
  serviceId: string | null;
  serviceName: string;
  description: string | null;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxAmount: number;
  netAmount: number;
  status: ChargeStatus;
  createdById: string;
  createdAt: string;
}

export interface InvoiceItemDto {
  id?: string;
  invoiceId?: string;
  chargeId?: string | null;
  serviceName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxAmount: number;
  netAmount: number;
}

export interface PaymentDto {
  id: string;
  receiptNumber: string;
  invoiceId: string;
  patientId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionReference: string | null;
  notes: string | null;
  receivedById: string;
  receivedByName?: string;
  receivedAt: string;
}

export interface FinancialAdjustmentDto {
  id: string;
  adjustmentNumber: string;
  invoiceId: string;
  paymentId: string | null;
  type: AdjustmentType;
  originalAmount: number;
  adjustedAmount: number;
  differenceAmount: number;
  reason: string;
  authorizedById: string;
  authorizedByName?: string;
  createdAt: string;
}

export interface InvoiceDto {
  id: string;
  invoiceNumber: string;
  visitId: string;
  patientId: string;
  patient?: PatientDto;
  doctorId: string | null;
  doctorName?: string;
  departmentName?: string;
  panelClientId: string | null;
  panelClientName?: string;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  netTotal: number;
  paidTotal: number;
  balanceTotal: number;
  status: InvoiceStatus;
  panelClaimNo: string | null;
  notes: string | null;
  createdById: string;
  createdByName?: string;
  createdAt: string;
  finalizedAt: string | null;
  items: InvoiceItemDto[];
  payments: PaymentDto[];
  adjustments: FinancialAdjustmentDto[];
}

export interface HospitalSettingDto {
  id: string;
  hospitalName: string;
  tagline: string | null;
  address: string;
  city: string;
  phone: string;
  email: string;
  website: string | null;
  taxNumber: string | null;
  currencySymbol: string;
  logoBase64: string | null;
  prescriptionDisclaimer: string | null;
  invoiceDisclaimer: string | null;
}

export interface AuditLogDto {
  id: string;
  userId: string | null;
  userName: string | null;
  userRole: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  oldValue: string | null;
  newValue: string | null;
  reason: string | null;
  ipAddress: string | null;
  timestamp: string;
}

export interface ReportFilterDto {
  startDate?: string;
  endDate?: string;
  doctorId?: string;
  departmentId?: string;
  panelClientId?: string;
  paymentMethod?: PaymentMethod;
  status?: string;
}

export interface DailyCollectionSummary {
  totalRevenue: number;
  totalCollected: number;
  totalDiscount: number;
  totalBalance: number;
  paymentMethodBreakdown: Record<string, number>;
  cashierBreakdown: Record<string, number>;
  invoiceCount: number;
  paidCount: number;
}
