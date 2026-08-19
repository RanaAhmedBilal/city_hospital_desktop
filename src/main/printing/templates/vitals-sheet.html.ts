import { HospitalSettingDto, PatientDto, VisitDto, VisitVitalsDto } from '../../../shared/types';
import { BloodGroupLabels, VisitTypeLabels } from '../../../shared/constants/enums';

export function renderVitalsSheetHtml(params: {
  hospital: HospitalSettingDto;
  patient: PatientDto;
  visit: VisitDto;
  vitals?: VisitVitalsDto | null;
}): string {
  const { hospital, patient, visit, vitals } = params;

  // Format Dates
  const visitDate = visit.visitDateTime ? new Date(visit.visitDateTime) : new Date();
  const formattedDate = visitDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const formattedTime = visitDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const bloodGroupLabel = patient.bloodGroup && (patient.bloodGroup as any) in BloodGroupLabels
    ? BloodGroupLabels[patient.bloodGroup as keyof typeof BloodGroupLabels]
    : patient.bloodGroup || '—';

  const visitTypeLabel = visit.visitType && (visit.visitType as any) in VisitTypeLabels
    ? VisitTypeLabels[visit.visitType as keyof typeof VisitTypeLabels]
    : visit.visitType || 'New Consultation';

  // Blood Pressure Categorization
  let bpCategory = '';
  let bpClass = 'normal';
  if (vitals?.systolicBp && vitals?.diastolicBp) {
    const s = vitals.systolicBp;
    const d = vitals.diastolicBp;
    if (s >= 180 || d >= 120) {
      bpCategory = 'Hypertensive Crisis';
      bpClass = 'critical';
    } else if (s >= 140 || d >= 90) {
      bpCategory = 'Stage 2 HTN';
      bpClass = 'elevated';
    } else if (s >= 130 || d >= 80) {
      bpCategory = 'Stage 1 HTN';
      bpClass = 'elevated';
    } else if (s >= 120 && d < 80) {
      bpCategory = 'Elevated BP';
      bpClass = 'warning';
    } else if (s < 90 || d < 60) {
      bpCategory = 'Hypotension';
      bpClass = 'warning';
    } else {
      bpCategory = 'Normal BP';
      bpClass = 'normal';
    }
  }

  // BMI Category
  let bmiCategory = '';
  if (vitals?.bmi) {
    const bmiVal = Number(vitals.bmi);
    if (bmiVal < 18.5) bmiCategory = '(Underweight)';
    else if (bmiVal < 25) bmiCategory = '(Normal Weight)';
    else if (bmiVal < 30) bmiCategory = '(Overweight)';
    else bmiCategory = '(Obese)';
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>OPD Triage & Vitals Slip - Token #${visit.tokenNumber} - ${patient.fullName}</title>
  <style>
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      font-size: 10pt;
      line-height: 1.35;
    }

    @media screen {
      body {
        background-color: #ffffff;
        padding: 0;
        margin: 0;
      }
      .a4-sheet {
        width: 100%;
        min-height: 265mm;
        display: flex;
        flex-direction: column;
        background: #ffffff;
        padding: 12mm 15mm;
        box-sizing: border-box;
        margin: 0 auto;
      }
    }

    @media print {
      @page {
        size: A4 portrait;
        margin: 10mm 14mm 10mm 14mm;
      }
      body {
        background: #ffffff;
        padding: 0;
        margin: 0;
      }
      .a4-sheet {
        width: 100%;
        min-height: 270mm;
        display: flex;
        flex-direction: column;
        padding: 0;
        box-shadow: none;
        border-radius: 0;
        margin: 0;
      }
    }

    /* ---------------------------------------------------- */
    /* 1. HEADER (LEFT-ALIGNED HOSPITAL BRANDING) */
    /* ---------------------------------------------------- */
    .header-container {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2.5px solid #0f766e;
      padding-bottom: 10px;
      margin-bottom: 14px;
    }
    .header-left {
      display: flex;
      flex-direction: column;
      max-width: 65%;
    }
    .hospital-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 4px;
    }
    .hospital-logo {
      width: 42px;
      height: 42px;
      background: #0f766e;
      color: #ffffff;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22pt;
      font-weight: 900;
    }
    .hospital-name {
      margin: 0;
      color: #0f766e;
      font-size: 19pt;
      font-weight: 800;
      letter-spacing: -0.4px;
      line-height: 1.15;
    }
    .hospital-tagline {
      color: #475569;
      font-size: 9pt;
      font-weight: 600;
      letter-spacing: 0.2px;
      margin-top: 1px;
    }
    .hospital-contact-details {
      color: #334155;
      font-size: 8.5pt;
      line-height: 1.35;
      margin-top: 4px;
    }

    .header-right {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      text-align: right;
    }
    .token-box {
      background: #f0fdfa;
      border: 2px solid #0f766e;
      border-radius: 8px;
      padding: 6px 14px;
      text-align: center;
      min-width: 135px;
      box-shadow: 0 2px 4px rgba(15, 118, 110, 0.1);
    }
    .token-label {
      font-size: 7.5pt;
      font-weight: 800;
      color: #0f766e;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .token-number {
      font-size: 24pt;
      font-weight: 900;
      color: #0f766e;
      line-height: 1;
      margin: 2px 0;
    }
    .token-meta {
      font-size: 7.8pt;
      color: #64748b;
      margin-top: 3px;
      line-height: 1.3;
    }

    /* ---------------------------------------------------- */
    /* 2. PATIENT & ENCOUNTER BANNER */
    /* ---------------------------------------------------- */
    .patient-banner {
      background: #f8fafc;
      border: 1.5px solid #cbd5e1;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 14px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px 14px;
      font-size: 9.5pt;
    }
    .patient-field {
      display: flex;
      flex-direction: column;
    }
    .field-label {
      font-size: 7pt;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 1px;
    }
    .field-value {
      font-weight: 700;
      color: #0f172a;
    }
    .badge-priority {
      display: inline-block;
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 7.5pt;
      font-weight: 800;
      background: #e0f2fe;
      color: #0369a1;
      text-transform: uppercase;
    }

    /* ---------------------------------------------------- */
    /* 3. VITALS ASSESSMENT CARDS */
    /* ---------------------------------------------------- */
    .section-title {
      font-size: 10.5pt;
      font-weight: 800;
      color: #0f766e;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1.5px solid #ccfbf1;
      padding-bottom: 4px;
      margin-bottom: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .vitals-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 14px;
    }
    .vital-card {
      border: 1.5px solid #cbd5e1;
      border-radius: 8px;
      padding: 8px 12px;
      background: #ffffff;
    }
    .vital-header {
      font-size: 7.5pt;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      margin-bottom: 3px;
    }
    .vital-value {
      font-size: 15pt;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.1;
    }
    .vital-unit {
      font-size: 9pt;
      font-weight: 500;
      color: #64748b;
      margin-left: 2px;
    }
    .vital-subtext {
      font-size: 7.8pt;
      font-weight: 600;
      color: #0f766e;
      margin-top: 3px;
    }
    .vital-subtext.elevated { color: #d97706; }
    .vital-subtext.critical { color: #dc2626; font-weight: 800; }
    .vital-subtext.warning { color: #ea580c; }

    /* ---------------------------------------------------- */
    /* 4. BILLING & TOKEN STATUS NOTICE */
    /* ---------------------------------------------------- */
    .billing-notice-box {
      background: #f0fdf4;
      border: 1.5px solid #86efac;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .billing-notice-title {
      font-size: 9pt;
      font-weight: 800;
      color: #166534;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .billing-notice-desc {
      font-size: 8.5pt;
      color: #15803d;
      margin-top: 2px;
    }
    .billing-status-badge {
      background: #fef3c7;
      color: #b45309;
      border: 1px solid #fde68a;
      font-weight: 800;
      font-size: 8.5pt;
      padding: 4px 10px;
      border-radius: 6px;
      text-transform: uppercase;
    }
    .billing-status-badge.paid {
      background: #dcfce7;
      color: #15803d;
      border-color: #86efac;
    }

    /* ---------------------------------------------------- */
    /* 5. FOOTER & STAMP */
    /* ---------------------------------------------------- */
    .footer-container {
      margin-top: auto;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-top: 2px solid #0f766e;
      padding-top: 10px;
      font-size: 8pt;
      color: #64748b;
    }
    .signature-box {
      text-align: center;
      width: 220px;
    }
    .signature-line {
      border-top: 1.5px solid #334155;
      margin-top: 40px;
      padding-top: 4px;
      font-weight: 700;
      color: #0f172a;
      font-size: 8.5pt;
    }
    .hospital-seal {
      font-size: 7.5pt;
      color: #94a3b8;
      margin-top: 2px;
    }
  </style>
</head>
<body>

<div class="a4-sheet">

  <!-- ==================================================== -->
  <!-- 1. HOSPITAL HEADER (LEFT-ALIGNED BRANDING) -->
  <!-- ==================================================== -->
  <div class="header-container">
    <div class="header-left">
      <div class="hospital-brand">
        <div class="hospital-logo">🏥</div>
        <div>
          <h1 class="hospital-name">${hospital.hospitalName || 'CITY HOSPITAL'}</h1>
          <div class="hospital-tagline">${hospital.tagline || 'Center for Medical Excellence & Compassionate Care'}</div>
        </div>
      </div>
      <div class="hospital-contact-details">
        <div><strong>Address:</strong> ${hospital.address}, ${hospital.city}</div>
        <div><strong>Helpline:</strong> ${hospital.phone} | <strong>Email:</strong> ${hospital.email}</div>
        ${hospital.taxNumber ? `<div><strong>Reg / NTN:</strong> ${hospital.taxNumber}</div>` : ''}
      </div>
    </div>

    <div class="header-right">
      <div class="token-box">
        <div class="token-label">OPD TOKEN</div>
        <div class="token-number">#${visit.tokenNumber}</div>
        <div class="token-meta">
          <div>Priority: <span class="badge-priority">${visit.priority || 'NORMAL'}</span></div>
          <div>${formattedDate} • ${formattedTime}</div>
        </div>
      </div>
    </div>
  </div>

  <!-- ==================================================== -->
  <!-- 2. PATIENT DEMOGRAPHICS & ENCOUNTER SUMMARY -->
  <!-- ==================================================== -->
  <div class="patient-banner">
    <div class="patient-field">
      <span class="field-label">Patient Name</span>
      <span class="field-value" style="font-size: 10.5pt; color: #0f766e;">${patient.fullName}</span>
    </div>
    <div class="patient-field">
      <span class="field-label">MR Number</span>
      <span class="field-value" style="font-size: 10pt;">${patient.mrn}</span>
    </div>
    <div class="patient-field">
      <span class="field-label">Age / Gender / Blood</span>
      <span class="field-value">${patient.age ? `${patient.age} Yrs` : '—'} / ${patient.gender || '—'} / <strong style="color:#e11d48;">${bloodGroupLabel}</strong></span>
    </div>
    <div class="patient-field">
      <span class="field-label">Contact Phone</span>
      <span class="field-value">${patient.phone || '—'}</span>
    </div>

    <div class="patient-field">
      <span class="field-label">Consulting Specialist</span>
      <span class="field-value">${visit.doctorName || 'Assigned Specialist'}</span>
    </div>
    <div class="patient-field">
      <span class="field-label">Specialty & Dept</span>
      <span class="field-value">${visit.doctorSpecialty || visit.departmentName || 'General OPD'}</span>
    </div>
    <div class="patient-field">
      <span class="field-label">Encounter / Visit Type</span>
      <span class="field-value">${visitTypeLabel}</span>
    </div>
    <div class="patient-field">
      <span class="field-label">Panel / Corporate Client</span>
      <span class="field-value" style="color: #0369a1;">${patient?.panelClientName || 'Private (Self-Pay)'}</span>
    </div>
    <div class="patient-field">
      <span class="field-label">Employee Id</span>
      <span class="field-value" style="color: #0369a1;">${patient?.employeeId || 'N/A'}</span>
    </div>
  </div>

  <!-- ==================================================== -->
  <!-- 3. TRIAGE VITALS SIGNS ASSESSMENT -->
  <!-- ==================================================== -->
  <div class="section-title">
    <span>Initial Triage Assessment & Vital Signs</span>
    <span style="font-size: 7.5pt; font-weight: 600; color: #64748b; text-transform: none;">
      Recorded at: ${vitals?.recordedAt ? new Date(vitals.recordedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : formattedTime}
    </span>
  </div>

  <div class="vitals-grid">
    <!-- Blood Pressure -->
    <div class="vital-card">
      <div class="vital-header">Blood Pressure</div>
      <div class="vital-value">
        ${vitals?.systolicBp && vitals?.diastolicBp ? `${vitals.systolicBp}/${vitals.diastolicBp}` : '—'}
        <span class="vital-unit">mmHg</span>
      </div>
      <div class="vital-subtext ${bpClass}">${bpCategory || 'Not recorded'}</div>
    </div>

    <!-- Pulse Rate -->
    <div class="vital-card">
      <div class="vital-header">Heart / Pulse Rate</div>
      <div class="vital-value">
        ${vitals?.pulse || '—'}
        <span class="vital-unit">bpm</span>
      </div>
      <div class="vital-subtext">${vitals?.pulse ? (vitals.pulse > 100 ? 'Tachycardia' : vitals.pulse < 60 ? 'Bradycardia' : 'Normal Rhythm') : '—'}</div>
    </div>

    <!-- Temperature -->
    <div class="vital-card">
      <div class="vital-header">Body Temperature</div>
      <div class="vital-value">
        ${vitals?.temperature ? Number(vitals.temperature).toFixed(1) : '—'}
        <span class="vital-unit">°F</span>
      </div>
      <div class="vital-subtext">${vitals?.temperature ? (Number(vitals.temperature) >= 100.4 ? 'Febrile / Fever' : 'Afebrile') : '—'}</div>
    </div>

    <!-- Oxygen Saturation -->
    <div class="vital-card">
      <div class="vital-header">Oxygen (SpO2)</div>
      <div class="vital-value">
        ${vitals?.spo2 ? `${vitals.spo2}%` : '—'}
      </div>
      <div class="vital-subtext ${vitals?.spo2 && vitals.spo2 < 94 ? 'critical' : 'normal'}">${vitals?.spo2 ? (vitals.spo2 >= 95 ? 'Normal (Room Air)' : 'Low Saturation') : '—'}</div>
    </div>

    <!-- Weight & Height -->
    <div class="vital-card">
      <div class="vital-header">Weight & Height</div>
      <div class="vital-value" style="font-size: 11pt;">
        ${vitals?.weight ? `${vitals.weight} kg` : '—'} / ${vitals?.height ? `${vitals.height} cm` : '—'}
      </div>
      <div class="vital-subtext">${vitals?.height ? `${(Number(vitals.height) / 30.48).toFixed(1)} ft` : '—'}</div>
    </div>

    <!-- BMI -->
    <div class="vital-card">
      <div class="vital-header">Body Mass Index (BMI)</div>
      <div class="vital-value">
        ${vitals?.bmi ? Number(vitals.bmi).toFixed(1) : '—'}
        <span class="vital-unit">kg/m²</span>
      </div>
      <div class="vital-subtext">${bmiCategory || '—'}</div>
    </div>

    <!-- Blood Glucose -->
    <div class="vital-card">
      <div class="vital-header">Blood Sugar (BS)</div>
      <div class="vital-value">
        ${vitals?.bloodGlucose ? `${vitals.bloodGlucose}` : '—'}
        <span class="vital-unit">mg/dL</span>
      </div>
      <div class="vital-subtext">${vitals?.glucoseType || 'Random Glucose'}</div>
    </div>

    <!-- Resp Rate & Pain -->
    <div class="vital-card">
      <div class="vital-header">Resp. Rate & Pain</div>
      <div class="vital-value" style="font-size: 11pt;">
        ${vitals?.respiratoryRate ? `${vitals.respiratoryRate}/min` : '—'} | Pain: ${vitals?.painScore != null ? `${vitals.painScore}/10` : '0/10'}
      </div>
      <div class="vital-subtext">${vitals?.observations ? vitals.observations.substring(0, 24) : 'Normal breathing'}</div>
    </div>
  </div>

  ${vitals?.observations ? `
    <div style="background: #f8fafc; border-left: 3.5px solid #0f766e; padding: 6px 12px; font-size: 8.5pt; margin-bottom: 14px; border-radius: 0 6px 6px 0;">
      <strong>Front-Desk Triage Notes / Patient Complaints:</strong> ${vitals.observations}
    </div>
  ` : ''}

  <!-- ==================================================== -->
  <!-- 4. BILLING & TOKEN STATUS NOTICE -->
  <!-- ==================================================== -->
  <div class="billing-notice-box">
    <div>
      <div class="billing-notice-title">OPD Encounter Status & Billing Notice</div>
      <div class="billing-notice-desc">
        Consultation fee is recorded in system. Present this slip at the billing / cashier desk for payment processing and receipt generation.
      </div>
    </div>
    <div>
      <span class="billing-status-badge ${visit.paymentStatus === 'PAID' ? 'paid' : ''}">
        ${visit.paymentStatus === 'PAID' ? 'Bill Paid' : 'Bill: Unpaid (Pending)'}
      </span>
    </div>
  </div>

  <!-- Empty Clinical / Writing Space between Vitals & Footer -->
  <div style="flex: 1; min-height: 85mm;"></div>

  <!-- ==================================================== -->
  <!-- 5. FOOTER, DISCLAIMER & STAMP BOX -->
  <!-- ==================================================== -->
  <div class="footer-container">
    <div style="max-width: 60%;">
      <div style="font-weight: 700; color: #0f766e; margin-bottom: 2px;">City Hospital OPD Management System</div>
      <div>This Triage Slip is computer-generated upon visit registration and vital signs triage recording.</div>
      <div style="margin-top: 2px; color: #94a3b8;">${hospital.prescriptionDisclaimer || 'Valid for OPD visit day. Retain this slip for pharmacy, laboratory sampling, and billing counter.'}</div>
    </div>

    <div class="signature-box">
      <div class="signature-line">
        Front-Desk Triage Desk
      </div>
      <div class="hospital-seal">Authorized Reception Counter</div>
    </div>
  </div>

</div>

</body>
</html>`;
}
