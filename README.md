# 🏥 City Hospital — Hospital Management System (HMS)

> **Enterprise Desktop Healthcare Application for Outpatient & Clinical Operations**  
> Built with **Electron 34**, **React 19**, **TypeScript 5**, **PostgreSQL 14+**, and **Prisma ORM 6**.

---

## 📌 Executive Summary

**City Hospital HMS** is a standalone, offline-ready desktop hospital information system designed specifically for outpatient departments (OPD), clinical triage, doctor consultations, versioned electronic prescriptions, patient allergy safety, diagnostic laboratory requisitions & billing, point-of-sale (POS) cashiering, encrypted backups, and administrative governance.

---

## 🖥️ Application Architecture & Modules

The application is structured into 9 core clinical and operational modules accessible via the navigation sidebar, tied together by a **Global Patient Safety Banner** that keeps the active encounter in focus across screens.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Global Navigation Bar                            │
├─────────────────────────────────────────────────────────────────────────────┤
│ 🛡️ Active Patient Safety Banner (MRN | Name | Age/Gender | CNIC | Doctor)    │
├──────────────┬──────────────────────────────────────────────────────────────┤
│              │ 📊 Dashboard (Live OPD Queue, Daily Revenue, Metrics)        │
│              │ 👥 Patient Registry & Profiles (MRN, Demographics, Timeline) │
│              │ 📋 OPD Queue & Visit Encounters (Triage, Doctor Queuing)     │
│   Sidebar    │ 🩺 Triage & Vitals Recording (BP, Pulse, Temp, BMI, Sheet)   │
│  Navigation  │ 🧪 Lab Orders & Billing (Requisitions, Tariffs & Orders)    │
│              │ 💳 Billing & Cashier Desk (Invoices, POS Slips, Payments)    │
│              │ 📈 Reports & Analytics (Daily Collection, Doctor Revenue)    │
│              │ ⚙️ Master Data Management (Doctors, Tariffs, Users, Config)  │
│              │ 🛡️ System Audit Trail (Forensic Action Logging)             │
└──────────────┴──────────────────────────────────────────────────────────────┘
```

---

## 🌟 Detailed Feature Breakdown

### 1. 🛡️ Authentication & In-Memory Session Management
- Secure username/password authentication powered by **bcrypt** hashing.
- **In-Memory Session Security**: Credentials and session tokens are maintained in secure closures without storing sensitive PHI or tokens in `localStorage`.
- **Session Lifetime & Sliding Renewal**: 12-hour session TTL with sliding expiration on active IPC requests and a 15-minute periodic background garbage collection cleanup.
- **System Roles & RBAC**:
  - **`ADMINISTRATOR`**: Unrestricted access to master data, pricing tariffs, user management, audit logs, financial reports, and encrypted backups.
  - **`RECEPTION`**: Patient registration, OPD encounter queuing, token generation, patient profile lookups, billing, and cashiering.

### 2. 👥 Patient Registry, Allergies & Longitudinal EMR Profiles
- **Quick Patient Registration**: Generates unique auto-sequenced **Medical Record Numbers (MRN)** (e.g., `MRN-2026-000001`) with automatic duplicate CNIC detection.
- **Patient Allergy & Contraindication System**: Tracks patient drug and environmental allergies (`PatientAllergy` model). Prescribing contra-indicated medications triggers a clinical safety block.
- **Active-Patient Guardrails**: Soft-deactivation checks block creating visits or charges for inactive patient profiles.
- **Patient Profile Timeline (`PatientProfilePage`)**:
  - Full longitudinal visit history and vital sign trends.
  - Doctor consultation notes and diagnostic summaries.
  - Past electronic prescriptions with **1-click A4 Reprinting**.

### 3. 📋 Live OPD Queue & Atomic Counter Generation
- Real-time queue filtering by **Doctor** and **Encounter Status**:
  - `REGISTERED` → `TRIAGED` → `IN_CONSULTATION` → `COMPLETED` → `CANCELLED`.
- **Atomic Daily Queue Token Generation**: Uses `NumberingService.getNextTokenNumber()` with Prisma database row-locking to ensure gapless, concurrency-safe doctor queue numbers (e.g. `Token #1`, `Token #2`).

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

### 5. 📝 Doctor Consultation & Immutability Enforcement
- Comprehensive clinical documentation (HPI, Past Medical History, Physical Exam, Provisional/Final Diagnosis, Advice).
- **Immutability & Versioned Amendments**: Finalized consultation notes and prescriptions are locked against overwrites. Updates create versioned historical snapshot records (`ConsultationAmendment`, `PrescriptionAmendment`) with mandatory audit reason logging.
- **Interactive Multi-Item Rx Builder**:
  - Medicine search with catalog autocomplete.
  - Dosage forms (*Tablet, Capsule, Syrup, Injection, Ointment, Drops, Inhaler*), strengths, frequency (`1-0-1`, `TDS`), route, duration, and food instructions.
  - Automated allergy contraindication validation.
- **A4 Prescription Template**: Printable official Rx document featuring hospital header, PMC registration details, vitals box, Rx table, and legal disclaimer.

### 6. 🧪 Diagnostic Laboratory Orders & Billing Workflow
- **Database-Backed Lab Catalog**: Tariffs managed via `LabCatalogItem` model in PostgreSQL.
- **Streamlined Workflow**: Lab tests are prescribed and billed in the system while physical specimen sampling is handled manually outside the application. No mandatory specimen barcode entry required.
- **Relational Orders**: Billed tests automatically generate `LabOrder` and `LabOrderItem` records with `ORDERED` status.

### 7. 💳 Point-of-Sale (POS) Billing & Financial Precision
- **4-Decimal Financial Precision**: All financial calculations use `Decimal.js` with `.toDecimalPlaces(4)` precision for unit prices, panel discounts, subtotals, and net totals.
- **Multi-Tender Payments**: Cash, Credit/Debit Card, Bank Transfer, Online / UPI, and Corporate Panel claims.
- **Print Templates**:
  - **Thermal 80mm POS Slip**: Rapid cashier receipt for patient tokens and counter payments.
  - **A4 Detailed Tax Invoice**: Formal itemized statement with hospital tax credentials.

### 8. 📊 Executive Reports, Backups & Security
- **Daily Collection Summary & Doctor Productivity**: Analytics on collections, payment modes, and consultation counts.
- **AES-256-GCM Encrypted PostgreSQL Backups**: Dynamic connection parsing generates `.sql.enc` encrypted backup archives.
- **Strict Shell Security**: Whitelisted URL scheme and hostname parser (`isAllowedExternalUrl`) blocks untrusted external link navigation.
- **Forensic Audit Trail (`/audit`)**: Tamper-evident activity logs capturing entity type, action performed, user ID, and timestamp.

---

## 🛠️ Technology Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Runtime Desktop Shell** | **Electron 34.2** | Context-isolated preload bridge, Node.js IPC backend |
| **Renderer Frontend** | **React 19** + **TypeScript 5.7** | Fast SPA UI with functional components & hooks |
| **Build Tooling** | **Vite 6** | Ultra-fast HMR and optimized production bundle |
| **Database & ORM** | **PostgreSQL 14+** + **Prisma ORM 6.4** | Type-safe schema migrations & query engine |
| **Testing Runner** | **Vitest 4** | Automated unit test suite (`npm test`) |
| **State Management** | **Zustand 5** | Lightweight auth & active patient session stores |
| **Icons & Styling** | **Lucide React** + Custom CSS Tokens | Responsive layout with light & dark theme support |
| **Distribution / Packaging**| **Electron Builder 26** | Windows NSIS installer with selective ASAR unpacking |

---

## 📁 Repository Directory Structure

```text
city_hospital/
├── build/                        # Application icons (icon.ico, icon.png)
├── prisma/
│   ├── migrations/               # PostgreSQL database migrations
│   └── schema.prisma             # Relational schema (20+ models)
├── scripts/
│   ├── copy-prisma-client.js     # Post-build script copying Prisma runtime to dist-electron
│   └── create-icon.js            # Script generating Windows multi-size ICO binary
├── src/
│   ├── main/                     # Electron Main Process (Node.js)
│   │   ├── database/             # Prisma client wrapper & database seeders
│   │   ├── ipc/                  # IPC router handlers (Auth, Patients, Visits, Vitals, Billing, Admin)
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
│   │   ├── test/                 # Test suites & E2E integration scenario runner
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
├── vitest.config.ts              # Vitest unit test configuration
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

### 2. Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/RanaAhmedBilal/city_hospital_desktop.git
   cd city_hospital
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Verify `.env` in the root directory:
   ```env
   DATABASE_URL="postgresql://postgres:root@localhost:5432/city_hospital_db?schema=public"
   NODE_ENV="development"
   ```

4. **Initialize Database Schema & Seed Data:**
   ```bash
   # Synchronize Prisma schema to PostgreSQL
   npm run prisma:push

   # Seed default settings, departments, doctors, test accounts, and catalogs
   npm run db:seed
   ```

5. **Start Application in Development Mode:**
   ```bash
   npm run dev:electron
   ```
   *(Boots Vite dev server on port 5173, runs TypeScript compiler in watch mode, and launches Electron)*

---

## 🧪 Automated Testing & Verification

```bash
# Run unit test suite (Vitest)
npm test

# Run 11-step End-to-End integration acceptance test suite against PostgreSQL
npm run test:e2e
```

---

## 🔑 Default Login Credentials

Initial data seeded by `npm run db:seed`:

| Role | Username | Password | Default Scope |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | `admin123` | Full administrative control, all modules, masters, & backup management |
| **Receptionist** | `reception` | `reception123` | Patient registration, search, OPD queue, billing, & cashiering |
| **Consulting Doctor** | `dr.sarah` | `doctor123` | Clinical charting, prescription writing, & doctor OPD queue |

---

## 📦 Building the Production Windows Installer

To compile TypeScript, bundle renderer assets, pack Prisma native query engines into `app.asar.unpacked`, and build the standalone Windows NSIS setup package:

```bash
npm run dist:win
```

### Build Outputs:
- 📦 **Windows Setup Installer**: `dist/City Hospital HMS Setup 1.0.0.exe`
- 📂 **Standalone Unpacked Directory**: `dist/win-unpacked/City Hospital HMS.exe`

---

## 📋 NPM Script Reference

| Command | Action |
| :--- | :--- |
| `npm run dev:electron` | Starts hot-reloading development environment |
| `npm test` | Executes unit tests via Vitest runner |
| `npm run test:e2e` | Runs full 11-step End-to-End acceptance integration test |
| `npm run build` | Compiles React renderer (`vite build`) and Electron main (`tsc`) |
| `npm run dist:win` | Performs clean production build and creates Windows installer |
| `npm run prisma:generate` | Compiles type-safe Prisma client to `src/main/database/client` |
| `npm run prisma:push` | Synchronizes database tables directly with `prisma/schema.prisma` |
| `npm run db:seed` | Populates database with default hospital setup, users, and catalog data |

---

## 📄 License

Proprietary Software — Developed for **City Hospital**.  
All rights reserved. Unauthorized reproduction or redistribution is prohibited.
