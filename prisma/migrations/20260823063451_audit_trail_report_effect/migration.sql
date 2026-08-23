-- CreateEnum
CREATE TYPE "RoleType" AS ENUM ('ADMINISTRATOR', 'RECEPTION', 'NURSE', 'DOCTOR', 'CASHIER', 'HOSPITAL_MANAGER');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "BloodGroup" AS ENUM ('A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE', 'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "AllergySeverity" AS ENUM ('MILD', 'MODERATE', 'SEVERE', 'ANAPHYLACTIC');

-- CreateEnum
CREATE TYPE "AllergyType" AS ENUM ('DRUG', 'FOOD', 'ENVIRONMENTAL', 'OTHER');

-- CreateEnum
CREATE TYPE "VisitType" AS ENUM ('NEW_CONSULTATION', 'FOLLOW_UP', 'EMERGENCY', 'OTHER');

-- CreateEnum
CREATE TYPE "VisitStatus" AS ENUM ('REGISTERED', 'WAITING', 'VITALS_COMPLETED', 'WITH_DOCTOR', 'CONSULTATION_COMPLETED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VisitPaymentStatus" AS ENUM ('UNBILLED', 'PARTIALLY_PAID', 'PAID', 'CREDIT_PANEL', 'VOID');

-- CreateEnum
CREATE TYPE "ClinicalRecordStatus" AS ENUM ('DRAFT', 'FINALIZED', 'AMENDED');

-- CreateEnum
CREATE TYPE "LabOrderStatus" AS ENUM ('ORDERED', 'SPECIMEN_COLLECTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SpecimenStatus" AS ENUM ('PENDING', 'COLLECTED', 'RECEIVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "FoodRelation" AS ENUM ('BEFORE_FOOD', 'AFTER_FOOD', 'WITH_FOOD', 'EMPTY_STOMACH', 'NO_RESTRICTION');

-- CreateEnum
CREATE TYPE "ServiceCategory" AS ENUM ('CONSULTATION', 'FOLLOW_UP', 'REGISTRATION', 'PROCEDURE', 'NURSING', 'DRESSING', 'OTHER');

-- CreateEnum
CREATE TYPE "ChargeStatus" AS ENUM ('DRAFT', 'FINALIZED', 'BILLED', 'VOIDED', 'ADJUSTED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'FINALIZED', 'PAID', 'PARTIALLY_PAID', 'VOIDED', 'ADJUSTED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'BANK_TRANSFER', 'PANEL_CREDIT', 'CHEQUE', 'ONLINE');

-- CreateEnum
CREATE TYPE "AdjustmentType" AS ENUM ('DISCOUNT_ADJUSTMENT', 'CORRECTION', 'REFUND', 'WRITE_OFF', 'VOID');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "doctorId" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" "RoleType" NOT NULL,
    "description" TEXT,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "panel_clients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "contactPerson" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "discountPercent" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "billingType" TEXT NOT NULL DEFAULT 'CREDIT',
    "effectiveStartDate" TIMESTAMP(3),
    "effectiveEndDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "panel_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "mrn" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "guardianName" TEXT,
    "dob" TIMESTAMP(3),
    "age" INTEGER,
    "gender" "Gender" NOT NULL,
    "bloodGroup" "BloodGroup" NOT NULL DEFAULT 'UNKNOWN',
    "phone" TEXT NOT NULL,
    "alternatePhone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "nic" TEXT,
    "employeeId" TEXT,
    "panelClientId" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "emergencyContactRelation" TEXT,
    "registrationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_allergies" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "allergenName" TEXT NOT NULL,
    "allergenType" "AllergyType" NOT NULL DEFAULT 'DRUG',
    "severity" "AllergySeverity" NOT NULL DEFAULT 'MODERATE',
    "reaction" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedById" TEXT,

    CONSTRAINT "patient_allergies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "printableTitle" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "departmentId" TEXT NOT NULL,
    "consultationFee" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "followUpFee" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "signatureData" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visits" (
    "id" TEXT NOT NULL,
    "visitNumber" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "visitDateTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tokenNumber" INTEGER NOT NULL,
    "visitType" "VisitType" NOT NULL DEFAULT 'NEW_CONSULTATION',
    "status" "VisitStatus" NOT NULL DEFAULT 'REGISTERED',
    "paymentStatus" "VisitPaymentStatus" NOT NULL DEFAULT 'UNBILLED',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visit_vitals" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "temperature" DECIMAL(5,2),
    "pulse" INTEGER,
    "respiratoryRate" INTEGER,
    "systolicBp" INTEGER,
    "diastolicBp" INTEGER,
    "spo2" DECIMAL(5,2),
    "weight" DECIMAL(5,2),
    "height" DECIMAL(5,2),
    "bmi" DECIMAL(5,2),
    "bloodGlucose" DECIMAL(5,2),
    "glucoseType" TEXT,
    "painScore" INTEGER,
    "observations" TEXT,
    "recordedById" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visit_vitals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultations" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "chiefComplaint" TEXT NOT NULL,
    "historyOfPresentIllness" TEXT,
    "pastMedicalHistory" TEXT,
    "physicalExamination" TEXT,
    "diagnosis" TEXT NOT NULL,
    "clinicalNotes" TEXT,
    "advice" TEXT,
    "followUpDate" TIMESTAMP(3),
    "status" "ClinicalRecordStatus" NOT NULL DEFAULT 'DRAFT',
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consultations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultation_amendments" (
    "id" TEXT NOT NULL,
    "consultationId" TEXT NOT NULL,
    "amendedById" TEXT NOT NULL,
    "amendedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT NOT NULL,
    "previousContent" TEXT NOT NULL,
    "newContent" TEXT NOT NULL,

    CONSTRAINT "consultation_amendments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medicines" (
    "id" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "genericName" TEXT NOT NULL,
    "strength" TEXT NOT NULL,
    "dosageForm" TEXT NOT NULL,
    "manufacturer" TEXT,
    "defaultDosage" TEXT,
    "defaultFrequency" TEXT,
    "defaultRoute" TEXT,
    "defaultDuration" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medicines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investigations" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investigations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_catalog_items" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'General Pathology',
    "defaultFee" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "sampleType" TEXT NOT NULL DEFAULT 'Whole Blood / Serum',
    "containerType" TEXT NOT NULL DEFAULT 'Purple EDTA / Red Gel',
    "tatHours" INTEGER NOT NULL DEFAULT 4,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_catalog_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_orders" (
    "id" TEXT NOT NULL,
    "orderNo" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT,
    "prescriptionId" TEXT,
    "invoiceId" TEXT,
    "status" "LabOrderStatus" NOT NULL DEFAULT 'ORDERED',
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_specimens" (
    "id" TEXT NOT NULL,
    "labOrderId" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "specimenType" TEXT NOT NULL,
    "containerType" TEXT,
    "status" "SpecimenStatus" NOT NULL DEFAULT 'COLLECTED',
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "collectedById" TEXT,
    "notes" TEXT,

    CONSTRAINT "lab_specimens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_order_items" (
    "id" TEXT NOT NULL,
    "labOrderId" TEXT NOT NULL,
    "testCode" TEXT NOT NULL,
    "testName" TEXT NOT NULL,
    "category" TEXT,
    "fee" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "resultValue" TEXT,
    "referenceRange" TEXT,
    "unit" TEXT,

    CONSTRAINT "lab_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescriptions" (
    "id" TEXT NOT NULL,
    "prescriptionNo" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "consultationId" TEXT,
    "diagnosis" TEXT,
    "clinicalNotes" TEXT,
    "advice" TEXT,
    "followUpDate" TIMESTAMP(3),
    "status" "ClinicalRecordStatus" NOT NULL DEFAULT 'DRAFT',
    "finalizedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescription_items" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "medicineId" TEXT,
    "medicineName" TEXT NOT NULL,
    "genericName" TEXT,
    "strength" TEXT,
    "dosageForm" TEXT,
    "dose" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "route" TEXT NOT NULL DEFAULT 'Oral',
    "duration" TEXT NOT NULL,
    "quantity" INTEGER,
    "instructions" TEXT,
    "foodRelation" "FoodRelation" NOT NULL DEFAULT 'AFTER_FOOD',
    "additionalNotes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "prescription_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescription_investigations" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "investigationId" TEXT,
    "investigationName" TEXT NOT NULL,
    "instructions" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "prescription_investigations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescription_amendments" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "amendedById" TEXT NOT NULL,
    "amendedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT NOT NULL,
    "previousContent" TEXT NOT NULL,
    "newContent" TEXT NOT NULL,

    CONSTRAINT "prescription_amendments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ServiceCategory" NOT NULL DEFAULT 'OTHER',
    "standardPrice" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "isTaxable" BOOLEAN NOT NULL DEFAULT false,
    "taxPercent" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_prices" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "departmentId" TEXT,
    "doctorId" TEXT,
    "panelClientId" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visit_charges" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "serviceId" TEXT,
    "serviceName" TEXT NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "netAmount" DECIMAL(10,2) NOT NULL,
    "status" "ChargeStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visit_charges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT,
    "panelClientId" TEXT,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "discountTotal" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "taxTotal" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "netTotal" DECIMAL(10,2) NOT NULL,
    "paidTotal" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "balanceTotal" DECIMAL(10,2) NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'FINALIZED',
    "panelClaimNo" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "chargeId" TEXT,
    "serviceName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "netAmount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "transactionReference" TEXT,
    "notes" TEXT,
    "receivedById" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_adjustments" (
    "id" TEXT NOT NULL,
    "adjustmentNumber" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "paymentId" TEXT,
    "type" "AdjustmentType" NOT NULL,
    "originalAmount" DECIMAL(10,2) NOT NULL,
    "adjustedAmount" DECIMAL(10,2) NOT NULL,
    "differenceAmount" DECIMAL(10,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "authorizedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sequence_counters" (
    "name" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "currentVal" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sequence_counters_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "userName" TEXT,
    "userRole" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "reason" TEXT,
    "ipAddress" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hospital_settings" (
    "id" TEXT NOT NULL DEFAULT 'default_config',
    "hospitalName" TEXT NOT NULL DEFAULT 'City Hospital',
    "tagline" TEXT DEFAULT 'Center for Medical Excellence',
    "address" TEXT NOT NULL DEFAULT '123 Healthcare Boulevard, Medical District',
    "city" TEXT NOT NULL DEFAULT 'Metropolis',
    "phone" TEXT NOT NULL DEFAULT '+1 (555) 019-2834',
    "email" TEXT NOT NULL DEFAULT 'info@cityhospital.org',
    "website" TEXT DEFAULT 'www.cityhospital.org',
    "taxNumber" TEXT,
    "currencySymbol" TEXT NOT NULL DEFAULT 'Rs.',
    "logoBase64" TEXT,
    "prescriptionDisclaimer" TEXT DEFAULT 'This prescription is valid for 7 days. Not valid for medico-legal purposes without hospital seal.',
    "invoiceDisclaimer" TEXT DEFAULT 'Payment is due upon receipt. Computer generated invoice does not require physical signature.',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hospital_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_doctorId_key" ON "users"("doctorId");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "panel_clients_code_key" ON "panel_clients"("code");

-- CreateIndex
CREATE UNIQUE INDEX "patients_mrn_key" ON "patients"("mrn");

-- CreateIndex
CREATE INDEX "patients_mrn_idx" ON "patients"("mrn");

-- CreateIndex
CREATE INDEX "patients_fullName_idx" ON "patients"("fullName");

-- CreateIndex
CREATE INDEX "patients_phone_idx" ON "patients"("phone");

-- CreateIndex
CREATE INDEX "patients_nic_idx" ON "patients"("nic");

-- CreateIndex
CREATE INDEX "patients_employeeId_idx" ON "patients"("employeeId");

-- CreateIndex
CREATE INDEX "patient_allergies_patientId_idx" ON "patient_allergies"("patientId");

-- CreateIndex
CREATE INDEX "patient_allergies_allergenName_idx" ON "patient_allergies"("allergenName");

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_key" ON "departments"("code");

-- CreateIndex
CREATE UNIQUE INDEX "doctors_licenseNumber_key" ON "doctors"("licenseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "visits_visitNumber_key" ON "visits"("visitNumber");

-- CreateIndex
CREATE INDEX "visits_patientId_idx" ON "visits"("patientId");

-- CreateIndex
CREATE INDEX "visits_doctorId_idx" ON "visits"("doctorId");

-- CreateIndex
CREATE INDEX "visits_visitDateTime_idx" ON "visits"("visitDateTime");

-- CreateIndex
CREATE INDEX "visits_status_idx" ON "visits"("status");

-- CreateIndex
CREATE INDEX "visit_vitals_visitId_idx" ON "visit_vitals"("visitId");

-- CreateIndex
CREATE INDEX "consultations_visitId_idx" ON "consultations"("visitId");

-- CreateIndex
CREATE INDEX "consultations_patientId_idx" ON "consultations"("patientId");

-- CreateIndex
CREATE INDEX "medicines_brandName_idx" ON "medicines"("brandName");

-- CreateIndex
CREATE INDEX "medicines_genericName_idx" ON "medicines"("genericName");

-- CreateIndex
CREATE UNIQUE INDEX "investigations_code_key" ON "investigations"("code");

-- CreateIndex
CREATE INDEX "investigations_name_idx" ON "investigations"("name");

-- CreateIndex
CREATE INDEX "investigations_category_idx" ON "investigations"("category");

-- CreateIndex
CREATE UNIQUE INDEX "lab_catalog_items_code_key" ON "lab_catalog_items"("code");

-- CreateIndex
CREATE INDEX "lab_catalog_items_code_idx" ON "lab_catalog_items"("code");

-- CreateIndex
CREATE INDEX "lab_catalog_items_category_idx" ON "lab_catalog_items"("category");

-- CreateIndex
CREATE UNIQUE INDEX "lab_orders_orderNo_key" ON "lab_orders"("orderNo");

-- CreateIndex
CREATE INDEX "lab_orders_visitId_idx" ON "lab_orders"("visitId");

-- CreateIndex
CREATE INDEX "lab_orders_patientId_idx" ON "lab_orders"("patientId");

-- CreateIndex
CREATE INDEX "lab_orders_prescriptionId_idx" ON "lab_orders"("prescriptionId");

-- CreateIndex
CREATE INDEX "lab_orders_invoiceId_idx" ON "lab_orders"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "lab_specimens_barcode_key" ON "lab_specimens"("barcode");

-- CreateIndex
CREATE INDEX "lab_specimens_labOrderId_idx" ON "lab_specimens"("labOrderId");

-- CreateIndex
CREATE INDEX "lab_specimens_barcode_idx" ON "lab_specimens"("barcode");

-- CreateIndex
CREATE INDEX "lab_order_items_labOrderId_idx" ON "lab_order_items"("labOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "prescriptions_prescriptionNo_key" ON "prescriptions"("prescriptionNo");

-- CreateIndex
CREATE INDEX "prescriptions_visitId_idx" ON "prescriptions"("visitId");

-- CreateIndex
CREATE INDEX "prescriptions_patientId_idx" ON "prescriptions"("patientId");

-- CreateIndex
CREATE INDEX "prescription_items_prescriptionId_idx" ON "prescription_items"("prescriptionId");

-- CreateIndex
CREATE INDEX "prescription_investigations_prescriptionId_idx" ON "prescription_investigations"("prescriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "services_code_key" ON "services"("code");

-- CreateIndex
CREATE INDEX "visit_charges_visitId_idx" ON "visit_charges"("visitId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "invoices_visitId_idx" ON "invoices"("visitId");

-- CreateIndex
CREATE INDEX "invoices_patientId_idx" ON "invoices"("patientId");

-- CreateIndex
CREATE INDEX "invoices_invoiceNumber_idx" ON "invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "invoices_createdAt_idx" ON "invoices"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_items_chargeId_key" ON "invoice_items"("chargeId");

-- CreateIndex
CREATE INDEX "invoice_items_invoiceId_idx" ON "invoice_items"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_receiptNumber_key" ON "payments"("receiptNumber");

-- CreateIndex
CREATE INDEX "payments_invoiceId_idx" ON "payments"("invoiceId");

-- CreateIndex
CREATE INDEX "payments_patientId_idx" ON "payments"("patientId");

-- CreateIndex
CREATE INDEX "payments_receiptNumber_idx" ON "payments"("receiptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "financial_adjustments_adjustmentNumber_key" ON "financial_adjustments"("adjustmentNumber");

-- CreateIndex
CREATE INDEX "financial_adjustments_invoiceId_idx" ON "financial_adjustments"("invoiceId");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_panelClientId_fkey" FOREIGN KEY ("panelClientId") REFERENCES "panel_clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_allergies" ADD CONSTRAINT "patient_allergies_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_vitals" ADD CONSTRAINT "visit_vitals_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultation_amendments" ADD CONSTRAINT "consultation_amendments_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "consultations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "prescriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_specimens" ADD CONSTRAINT "lab_specimens_labOrderId_fkey" FOREIGN KEY ("labOrderId") REFERENCES "lab_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_order_items" ADD CONSTRAINT "lab_order_items_labOrderId_fkey" FOREIGN KEY ("labOrderId") REFERENCES "lab_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "consultations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "prescriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "medicines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_investigations" ADD CONSTRAINT "prescription_investigations_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "prescriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_investigations" ADD CONSTRAINT "prescription_investigations_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "investigations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_amendments" ADD CONSTRAINT "prescription_amendments_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "prescriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_prices" ADD CONSTRAINT "service_prices_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_charges" ADD CONSTRAINT "visit_charges_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_charges" ADD CONSTRAINT "visit_charges_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_panelClientId_fkey" FOREIGN KEY ("panelClientId") REFERENCES "panel_clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_chargeId_fkey" FOREIGN KEY ("chargeId") REFERENCES "visit_charges"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_adjustments" ADD CONSTRAINT "financial_adjustments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_adjustments" ADD CONSTRAINT "financial_adjustments_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
