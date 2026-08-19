# 🏥 City Hospital — Hospital Management System (HMS)

> **Enterprise Desktop Healthcare Application for Outpatient & Clinical Operations**  
> Built with **Electron 34**, **React 19**, **TypeScript**, **PostgreSQL 14+**, and **Prisma ORM 6**.

---

## 📌 Executive Summary

**City Hospital HMS** is a standalone, offline-ready desktop hospital information system designed specifically for outpatient departments (OPD), clinical triage, doctor consultations, electronic prescriptions, diagnostic laboratory requisition, point-of-sale (POS) cashiering, and administrative governance.

---

## 🖥️ Application Architecture & Modules

The application is structured into 9 core clinical and operational modules accessible via the navigation sidebar, tied together by a **Global Patient Safety Banner** that keeps the active encounter in focus across screens.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Global Navigation Bar                            │
├─────────────────────────────────────────────────────────────────────────────┤
│ 🛡️ Active Patient Safety Banner (MRN | Name | Age/Gender | CNIC | Doctor)    │
├──────────────┬──────────────────────────────────────────────────────────────┤
│              │ 📊 Dashboard (Live OPD Queue, Daily Revenue, Metrics)        │
│              │ 👥 Patient Registry & Profiles (MRN, Demographics, Timeline) │
│              │ 📋 OPD Queue & Visit Encounters (Triage, Doctor Queuing)     │
│   Sidebar    │ 🩺 Triage & Vitals Recording (BP, Pulse, Temp, BMI, Sheet)   │
│  Navigation  │ 🧪 Lab Orders & Specimen Sampling (Requisitions & Tariffs)   │
│              │ 💳 Billing & Cashier Desk (Invoices, POS Slips, Payments)    │
│              │ 📈 Reports & Analytics (Daily Collection, Doctor Revenue)    │
│              │ ⚙️ Master Data Management (Doctors, Tariffs, Users, Config)  │
│              │ 🛡️ System Audit Trail (Forensic Action Logging)             │
└──────────────┴──────────────────────────────────────────────────────────────┘
```

---

## 🌟 Detailed Feature Breakdown

### 1. 🛡️ Authentication & Role-Based Access Control (RBAC)
- Secure username/password authentication powered by **bcrypt** hashing.
- Role-based permissions controlling tab visibility and actions:
  - **`ADMINISTRATOR`**: Unrestricted access to master data, pricing tariffs, user management, audit logs, financial reports, and backups.
  - **`RECEPTION`**: Patient registration, OPD encounter queuing, token generation, patient profile lookup.
  - **`NURSE` / Triage**: Vitals entry, triage classification, vitals sheet printing.
  - **`DOCTOR` / Consultant**: Clinical charting, EMR review, digital Rx authoring, lab orders.
  - **`CASHIER`**: Visit charge reviews, invoice creation, multi-mode payment collection, receipts.
  - **`LAB_TECH`**: Lab order management, specimen collection requisition.

### 2. 👥 Patient Registry & Longitudinal EMR Profiles
- **Quick Patient Registration**: Generates unique auto-sequenced **Medical Record Numbers (MRN)** (e.g., `MRN-2026-000001`).
- Fields: Full Name, Guardian Name, Gender, Age, Blood Group (A+, A-, B+, B-, AB+, AB-, O+, O-, Unknown), CNIC/National ID, Phone, City, Address, Corporate Panel Client, Emergency Contact.
- **Patient Profile Timeline (`PatientProfilePage`)**:
  - Full longitudinal visit history.
  - Historical vitals trends.
  - Doctor consultation notes and diagnostic summaries.
  - Past electronic prescriptions with **1-click A4 Reprinting**.

### 3. 📋 Live OPD Queue & Encounter Management
- Real-time queue filtering by **Doctor** and **Encounter Status**:
  - `REGISTERED` → `TRIAGED` → `IN_CONSULTATION` → `COMPLETED` → `CANCELLED`.
- Encounter creation: Select Department, Doctor, Visit Type (*New Consultation*, *Follow-up*, *Emergency*), Priority (*Normal*, *Urgent*), and Custom Fee override.
- Direct navigation shortcuts from queue to Vitals, Lab, Billing, or Patient Profile.

### 4. 🩺 Triage & Vitals Recording
- Structured vital sign collection:
  - **Blood Pressure**: Systolic / Diastolic (mmHg)
  - **Heart Rate**: Pulse (bpm)
  - **Body Temperature**: °F
  - **Respiratory Rate**: breaths/min
  - **Oxygen Saturation**: SpO2 (%)
  - **Anthropometrics**: Weight (kg), Height (cm) → **Auto-computed BMI** with classification (*Underweight, Normal, Overweight, Obese*)
  - **Blood Glucose**: Value (mg/dL) + Fasting / Random / Post-Prandial tagging
  - **Pain Scale**: 0–10 numeric rating
  - **Clinical Observations**: Free text triage nurse notes
- **Automated Billing Integration**: Recording vitals automatically queues an **UNPAID Consultation Charge** on the patient's billing ledger.
- **A4 Vitals Printout**: Direct print preview of the formatted clinical triage sheet.

### 5. 📝 Doctor Consultation & Digital Prescription Writer
- Comprehensive clinical documentation:
  - Chief Complaints & History of Present Illness (HPI).
  - Past Medical / Surgical History.
  - Physical Examination & Systemic Review.
  - Provisional / Final Diagnosis.
  - Special Advice & Follow-up Scheduling.
- **Interactive Multi-Item Rx Builder**:
  - Medicine search with catalog autocomplete.
  - Dosage forms: *Tablet, Capsule, Syrup, Injection, Ointment, Drops, Inhaler*.
  - Dose strength (e.g., `500mg`), Frequency (e.g., `1-0-1`, `TDS`, `BD`), Route, Duration, and Food instructions (*Before meals, After meals*).
  - Advised diagnostic tests integration.
- **A4 Prescription Template**: Printable official Rx document featuring hospital banner, doctor PMC license details, vitals box, Rx table, and legal disclaimer.

### 6. 🧪 Diagnostic Laboratory & Investigation Orders
- Test catalog categorized across *Hematology, Biochemistry, Microbiology, Serology, Imaging/Radiology, Urine & Stool, Special Tests*.
- Interactive order basket with real-time fee calculation.
- Specimen collection tracking: Sample Type, Container/Vacutainer tube, Fasting status, Urgency (*Routine, Stat/Emergency*).
- Directly posts lab charges to the cashier's visit ledger.

### 7. 💳 Point-of-Sale (POS) Billing & Cashier Desk
- **Itemized Charge Ledger**: Aggregates all encounter fees (Consultations, Lab investigations, Procedures, Consumables).
- **Ad-hoc Charge Entry**: Add hospital services directly from the master tariff price list.
- **Invoice Generation**:
  - Select specific charges to invoice.
  - Apply custom fixed or percentage discounts.
  - Multi-tender payment capture: **Cash**, **Credit/Debit Card**, **Bank Transfer**, **Online / UPI**.
  - Track partial payments and outstanding visit balances.
- **Print Templates**:
  - **Thermal 80mm POS Slip**: Rapid cashier receipt for patient tokens and counter payments.
  - **A4 Detailed Tax Invoice**: Formal itemized statement with hospital tax credentials.

### 8. 📊 Executive Reports & Financial Analytics
- **Daily Collection Summary**: Total cash collected, card/bank deposits, refund deductions, and cashier breakdown for a given date.
- **Doctor Performance & Revenue Share**: Total patients consulted, gross billings, hospital facility share vs. doctor payout share.
- **Department Statistics**: Outpatient volume and revenue share by clinical department.
- **Corporate Panel Billing**: Total billed vs. pending receivables per panel client.
- **Diagnostic Volume**: Most frequently ordered tests and revenue breakdown.
- **CSV Export**: 1-click export to CSV across all tabular report views.

### 9. ⚙️ Admin Master Data & System Governance
- **Doctors**: Manage profiles, PMC registration numbers, specialties, consultation & follow-up fees, contact info.
- **Departments**: General Medicine, Cardiology, Pediatrics, Orthopedics, Gynecology, ENT, Dermatology, General Surgery.
- **Investigation Catalog**: Lab tests, tariffs, specimen requirements, turnaround times.
- **Services Master**: Charge tariffs for OPD procedures, nursing care, dressings, nebulizations, emergency care.
- **Panel Clients**: Corporate insurance and client panels with agreed tariff schedules.
- **User Accounts**: Staff provisioning, password resets, active/inactive status toggle, role assignments.
- **Hospital Configuration**: Hospital name, tagline, address, phone/email, tax ID, currency symbol (`Rs.`), prescription disclaimer, and invoice footer terms.
- **Database Backups**: Backup directory inspection and PostgreSQL backup routines.
- **Forensic Audit Trail (`/audit`)**: Tamper-evident activity logs capturing entity type, action performed, user ID, and timestamp.

---

## 🛠️ Technology Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Runtime Desktop Shell** | **Electron 34.2** | Context-isolated preload bridge, Node.js IPC backend |
| **Renderer Frontend** | **React 19** + **TypeScript 5.7** | Fast SPA UI with functional components & hooks |
| **Build Tooling** | **Vite 6** | Ultra-fast HMR and optimized production bundle |
| **Database & ORM** | **PostgreSQL 14+** + **Prisma ORM 6.4** | Type-safe schema migrations & query engine |
| **State Management** | **Zustand 5** | Lightweight auth & active patient session stores |
| **Icons & UI** | **Lucide React** + Custom CSS Tokens | Responsive layout with dark slate medical theme |
| **Printing Subsystem** | **Electron WebContents Print** | Embedded HTML templates for A4 & Thermal 80mm |
| **Distribution / Packaging**| **Electron Builder 26** | Windows NSIS installer with selective ASAR unpacking |

---

## 📁 Repository Directory Structure

```text
city_hospital/
├── build/                        # Application icons (icon.ico, icon.png)
├── prisma/
│   └── schema.prisma             # PostgreSQL schema (20+ relational models)
├── scripts/
│   ├── copy-prisma-client.js     # Post-build script copying Prisma runtime to dist-electron
│   └── create-icon.js            # Script generating Windows multi-size ICO binary
├── src/
│   ├── main/                     # Electron Main Process (Node.js)
│   │   ├── database/             # Prisma client wrapper & database seeders
│   │   ├── ipc/                  # IPC handlers (Auth, Patients, Visits, Vitals, Billing, Admin)
│   │   ├── printing/             # HTML print templates (invoice, prescription, vitals-sheet)
│   │   ├── services/             # Core business logic services
│   │   │   ├── audit.service.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── backup.service.ts
│   │   │   ├── billing.service.ts
│   │   │   ├── config.service.ts
│   │   │   ├── consultation.service.ts
│   │   │   ├── lab.service.ts
│   │   │   ├── numbering.service.ts
│   │   │   ├── patient.service.ts
│   │   │   ├── prescription.service.ts
│   │   │   ├── report.service.ts
│   │   │   ├── visit.service.ts
│   │   │   └── vitals.service.ts
│   │   └── index.ts              # Electron app lifecycle & window creation
│   ├── preload/
│   │   └── index.ts              # Secure contextBridge IPC exposure
│   ├── renderer/                 # React 19 Frontend
│   │   ├── components/           # Common Modals, Layouts, Safety Banner, Print Previews
│   │   ├── lib/                  # Type-safe IPC invoke helper
│   │   ├── pages/                # Application views (Dashboard, Patients, Queue, Vitals, Billing, etc.)
│   │   ├── stores/               # Zustand stores (authStore, activePatientStore)
│   │   ├── styles/               # CSS custom properties & global styles
│   │   ├── App.tsx               # Primary layout & tab router
│   │   └── main.tsx              # React DOM entry point
│   └── shared/                   # Shared TypeScript interfaces, IPC channels, and enums
├── electron-builder.yml          # Electron packaging & NSIS installer configuration
├── package.json                  # Scripts & project metadata
├── tsconfig.json                 # TypeScript config for Renderer
├── tsconfig.electron.json        # TypeScript config for Electron Main Process
└── vite.config.ts                # Vite bundler configuration
```

---

## ⚡ Quick Start & Development Setup

### 1. Prerequisites
- **Node.js**: `v20.x` or `v22.x` ([Download Node.js](https://nodejs.org/))
- **PostgreSQL**: `v14` or higher installed and running locally ([Download PostgreSQL](https://www.postgresql.org/download/))

---

### 2. Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd city_hospital
   ```

2. **Install project dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Verify `.env` in the root directory:
   ```env
   DATABASE_URL="postgresql://postgres:root@localhost:5432/city_hospital_db?schema=public"
   NODE_ENV="development"
   ```

4. **Initialize Database Schema & Client:**
   ```bash
   # Push Prisma schema to PostgreSQL
   npm run prisma:push

   # Seed default hospital settings, departments, doctors, test accounts, and catalogs
   npm run db:seed
   ```

5. **Start Application in Development Mode:**
   ```bash
   npm run dev:electron
   ```
   *(Starts the Vite dev server on port 5173, runs TypeScript compiler in watch mode, and boots Electron)*

---

## 🔑 Default Login Credentials

Initial data seeded by `npm run db:seed`:

| Role | Username | Password | Default Scope |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | `admin123` | Full administrative control, all modules & masters |
| **Receptionist** | `reception` | `reception123` | Patient registration, search, OPD queue encounters |

---

## 📦 Building the Production Windows Installer

To compile TypeScript, bundle renderer assets, pack Prisma native query engines into `app.asar.unpacked`, and build the standalone Windows NSIS setup package:

```bash
npm run dist:win
```

### Build Outputs:
- 📦 **Windows Installer**: `dist/City Hospital HMS Setup 1.0.0.exe` (One-click or custom directory NSIS installer with desktop shortcut and start menu launcher)
- 📂 **Standalone Portable Folder**: `dist/win-unpacked/City Hospital HMS.exe`

---

## 📋 NPM Script Reference

| Command | Action |
| :--- | :--- |
| `npm run dev:electron` | Starts hot-reloading development environment |
| `npm run build` | Compiles both React renderer (`vite build`) and Electron main (`tsc`) |
| `npm run dist:win` | Performs clean production build and creates the Windows installer |
| `npm run prisma:generate` | Compiles type-safe Prisma client to `src/main/database/client` |
| `npm run prisma:push` | Synchronizes database tables directly with `prisma/schema.prisma` |
| `npm run db:seed` | Populates database with default hospital setup, users, and catalog data |
| `npm run test:db` | Diagnostic script to test PostgreSQL database connection |

---

## 🔒 Security & Data Integrity

- **Context Isolation**: Main process execution is isolated from the DOM via Electron `contextBridge`.
- **Password Security**: Passwords stored as one-way salted hashes using `bcryptjs`.
- **Prisma ASAR Architecture**: Query engine binaries (`query_engine-windows.dll.node`) are unpacked into `app.asar.unpacked` to ensure zero-friction native loading while keeping application code securely packaged in ASAR.
- **Audit Immutability**: Critical financial, clinical, and administrative modifications generate immutable audit entries.

---

## 📄 License

Proprietary Software — Developed for **City Hospital**.  
All rights reserved. Unauthorized reproduction or redistribution is prohibited.
