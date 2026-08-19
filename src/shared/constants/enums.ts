export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export enum BloodGroup {
  A_POSITIVE = 'A_POSITIVE',
  A_NEGATIVE = 'A_NEGATIVE',
  B_POSITIVE = 'B_POSITIVE',
  B_NEGATIVE = 'B_NEGATIVE',
  AB_POSITIVE = 'AB_POSITIVE',
  AB_NEGATIVE = 'AB_NEGATIVE',
  O_POSITIVE = 'O_POSITIVE',
  O_NEGATIVE = 'O_NEGATIVE',
  UNKNOWN = 'UNKNOWN',
}

export const BloodGroupLabels: Record<BloodGroup, string> = {
  [BloodGroup.A_POSITIVE]: 'A+',
  [BloodGroup.A_NEGATIVE]: 'A-',
  [BloodGroup.B_POSITIVE]: 'B+',
  [BloodGroup.B_NEGATIVE]: 'B-',
  [BloodGroup.AB_POSITIVE]: 'AB+',
  [BloodGroup.AB_NEGATIVE]: 'AB-',
  [BloodGroup.O_POSITIVE]: 'O+',
  [BloodGroup.O_NEGATIVE]: 'O-',
  [BloodGroup.UNKNOWN]: 'Unknown',
};

export enum VisitType {
  NEW_CONSULTATION = 'NEW_CONSULTATION',
  FOLLOW_UP = 'FOLLOW_UP',
  EMERGENCY = 'EMERGENCY',
  OTHER = 'OTHER',
}

export const VisitTypeLabels: Record<VisitType, string> = {
  [VisitType.NEW_CONSULTATION]: 'New Consultation',
  [VisitType.FOLLOW_UP]: 'Follow-up',
  [VisitType.EMERGENCY]: 'Emergency',
  [VisitType.OTHER]: 'Other',
};

export enum VisitStatus {
  REGISTERED = 'REGISTERED',
  WAITING = 'WAITING',
  VITALS_COMPLETED = 'VITALS_COMPLETED',
  WITH_DOCTOR = 'WITH_DOCTOR',
  CONSULTATION_COMPLETED = 'CONSULTATION_COMPLETED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export const VisitStatusLabels: Record<VisitStatus, string> = {
  [VisitStatus.REGISTERED]: 'Registered',
  [VisitStatus.WAITING]: 'Waiting for Vitals',
  [VisitStatus.VITALS_COMPLETED]: 'Vitals Completed',
  [VisitStatus.WITH_DOCTOR]: 'With Doctor',
  [VisitStatus.CONSULTATION_COMPLETED]: 'Consultation Done',
  [VisitStatus.COMPLETED]: 'Completed',
  [VisitStatus.CANCELLED]: 'Cancelled',
};

export enum VisitPaymentStatus {
  UNBILLED = 'UNBILLED',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  CREDIT_PANEL = 'CREDIT_PANEL',
  VOID = 'VOID',
}

export enum ClinicalRecordStatus {
  DRAFT = 'DRAFT',
  FINALIZED = 'FINALIZED',
  AMENDED = 'AMENDED',
}

export enum FoodRelation {
  BEFORE_FOOD = 'BEFORE_FOOD',
  AFTER_FOOD = 'AFTER_FOOD',
  WITH_FOOD = 'WITH_FOOD',
  EMPTY_STOMACH = 'EMPTY_STOMACH',
  NO_RESTRICTION = 'NO_RESTRICTION',
}

export const FoodRelationLabels: Record<FoodRelation, string> = {
  [FoodRelation.BEFORE_FOOD]: 'Before Food (AC)',
  [FoodRelation.AFTER_FOOD]: 'After Food (PC)',
  [FoodRelation.WITH_FOOD]: 'With Food',
  [FoodRelation.EMPTY_STOMACH]: 'Empty Stomach',
  [FoodRelation.NO_RESTRICTION]: 'No Restriction',
};

export enum ServiceCategory {
  CONSULTATION = 'CONSULTATION',
  FOLLOW_UP = 'FOLLOW_UP',
  REGISTRATION = 'REGISTRATION',
  PROCEDURE = 'PROCEDURE',
  NURSING = 'NURSING',
  DRESSING = 'DRESSING',
  OTHER = 'OTHER',
}

export enum ChargeStatus {
  DRAFT = 'DRAFT',
  FINALIZED = 'FINALIZED',
  BILLED = 'BILLED',
  VOIDED = 'VOIDED',
  ADJUSTED = 'ADJUSTED',
}

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  FINALIZED = 'FINALIZED',
  PAID = 'PAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  VOIDED = 'VOIDED',
  ADJUSTED = 'ADJUSTED',
  REFUNDED = 'REFUNDED',
}

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
  PANEL_CREDIT = 'PANEL_CREDIT',
  CHEQUE = 'CHEQUE',
  ONLINE = 'ONLINE',
}

export enum AdjustmentType {
  DISCOUNT_ADJUSTMENT = 'DISCOUNT_ADJUSTMENT',
  CORRECTION = 'CORRECTION',
  REFUND = 'REFUND',
  WRITE_OFF = 'WRITE_OFF',
  VOID = 'VOID',
}
