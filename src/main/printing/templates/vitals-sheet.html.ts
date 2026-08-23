import { HospitalSettingDto, PatientDto, VisitDto, VisitVitalsDto } from '../../../shared/types';
import { BloodGroupLabels, VisitTypeLabels } from '../../../shared/constants/enums';
import { escapeHtml, escapeHtmlOrDash } from '../utils/escapeHtml';

export function renderVitalsSheetHtml(params: {
  hospital: HospitalSettingDto;
  patient: PatientDto;
  visit: VisitDto;
  vitals?: VisitVitalsDto | null;
}): string {
  const { hospital, patient, visit, vitals } = params;

  // Format Dates
  const visitDate = visit.visitDateTime ? new Date(visit.visitDateTime) : new Date();
  const formattedDate = escapeHtml(visitDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }));
  const formattedTime = escapeHtml(visitDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }));

  const bloodGroupLabel = escapeHtml(patient.bloodGroup && (patient.bloodGroup as any) in BloodGroupLabels
    ? BloodGroupLabels[patient.bloodGroup as keyof typeof BloodGroupLabels]
    : patient.bloodGroup || '—');

  const visitTypeLabel = escapeHtml(visit.visitType && (visit.visitType as any) in VisitTypeLabels
    ? VisitTypeLabels[visit.visitType as keyof typeof VisitTypeLabels]
    : visit.visitType || 'New Consultation');

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
  <title>OPD Triage & Vitals Slip - Token #${escapeHtml(visit.tokenNumber)} - ${escapeHtml(patient.fullName)}</title>
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
      color: #1e293b;
      background: #ffffff;
      font-size: 9.5pt;
      line-height: 1.35;
    }
    .page-container {
      width: 210mm;
      min-height: 297mm;
      padding: 12mm 14mm;
      margin: 0 auto;
      background: #ffffff;
      display: flex;
      flex-direction: column;
    }

    /* Header & Branding */
    .header-container {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2.5px solid #0f766e;
      padding-bottom: 10px;
      margin-bottom: 12px;
    }
    .header-left {
      max-width: 65%;
    }
    .hospital-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 4px;
    }
    .hospital-logo {
      font-size: 26pt;
      line-height: 1;
    }
    .hospital-name {
      font-size: 17pt;
      font-weight: 800;
      color: #0f766e;
      margin: 0;
      letter-spacing: -0.3px;
    }
    .hospital-tagline {
      font-size: 8.5pt;
      color: #475569;
      font-style: italic;
    }
    .hospital-contact-details {
      font-size: 8pt;
      color: #64748b;
      margin-top: 4px;
      line-height: 1.3;
    }

    /* Token Badge */
    .header-right {
      text-align: right;
    }
    .token-box {
      background: #0f766e;
      color: #ffffff;
      border-radius: 8px;
      padding: 8px 16px;
      text-align: center;
      min-width: 140px;
      box-shadow: 0 2px 4px rgba(15, 118, 110, 0.2);
    }
    .token-label {
      font-size: 7.5pt;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      opacity: 0.9;
    }
    .token-number {
      font-size: 24pt;
      font-weight: 900;
      line-height: 1.1;
      margin: 1px 0;
    }
    .token-meta {
      font-size: 7.5pt;
      opacity: 0.95;
    }
    .badge-priority {
      background: #f59e0b;
      color: #ffffff;
      padding: 1px 5px;
      border-radius: 3px;
      font-weight: 800;
      font-size: 7pt;
      text-transform: uppercase;
    }

    /* Patient Demographics Banner */
    .patient-banner {
      background: #f0fdfa;
      border: 1px solid #ccfbf1;
      border-radius: 6px;
      padding: 9px 12px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px 12px;
      margin-bottom: 12px;
    }
    .patient-field {
      display: flex;
      flex-direction: column;
    }
    .field-label {
      font-size: 7pt;
      font-weight: 700;
      color: #0f766e;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .field-value {
      font-size: 9pt;
      font-weight: 600;
      color: #0f172a;
    }

    /* Section Headers */
    .section-title {
      font-size: 10pt;
      font-weight: 800;
      color: #0f766e;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1.5px solid #0f766e;
      padding-bottom: 3px;
      margin-bottom: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    /* Vitals Assessment Cards Grid */
    .vitals-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 14px;
    }
    .vital-card {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px 10px;
      text-align: center;
      box-shadow: 0 1px 2px rgba(0,0,0,0.03);
    }
    .vital-header {
      font-size: 7.5pt;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      margin-bottom: 3px;
    }
    .vital-value {
      font-size: 14pt;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.1;
    }
    .vital-unit {
      font-size: 7.5pt;
      font-weight: 600;
      color: #64748b;
    }
    .vital-subtext {
      font-size: 7.2pt;
      font-weight: 600;
      margin-top: 3px;
      padding: 1px 4px;
      border-radius: 3px;
      display: inline-block;
    }
    .vital-subtext.normal { background: #dcfce7; color: #15803d; }
    .vital-subtext.warning { background: #fef3c7; color: #b45309; }
    .vital-subtext.elevated { background: #ffedd5; color: #c2410c; }
    .vital-subtext.critical { background: #ffe4e6; color: #be123c; font-weight: 800; }

    /* Billing Notice Box */
    .billing-notice-box {
      background: #f8fafc;
      border: 1px dashed #94a3b8;
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .billing-notice-title {
      font-size: 8.5pt;
      font-weight: 700;
      color: #334155;
    }
    .billing-notice-desc {
      font-size: 7.8pt;
      color: #64748b;
    }
    .billing-status-badge {
      font-size: 8pt;
      font-weight: 800;
      padding: 3px 8px;
      border-radius: 4px;
      background: #fef3c7;
      color: #b45309;
      border: 1px solid #fde68a;
    }
    .billing-status-badge.paid {
      background: #dcfce7;
      color: #15803d;
      border-color: #bbf7d0;
    }

    /* Footer & Signatures */
    .footer-container {
      border-top: 1px solid #cbd5e1;
      padding-top: 8px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 7.5pt;
      color: #64748b;
    }
    .signature-box {
      text-align: center;
      min-width: 160px;
    }
    .signature-line {
      border-top: 1.5px solid #475569;
      padding-top: 3px;
      font-weight: 700;
      color: #1e293b;
      margin-top: 25px;
    }
    .hospital-seal {
      font-size: 7pt;
      color: #94a3b8;
      font-style: italic;
    }
  </style>
</head>
<body>

<div class="page-container">

  <!-- ==================================================== -->
  <!-- 1. HOSPITAL HEADER (LEFT-ALIGNED BRANDING) -->
  <!-- ==================================================== -->
  <div class="header-container">
    <div class="header-left">
      <div class="hospital-brand">
        <div class="hospital-logo">🏥</div>
        <div>
          <h1 class="hospital-name">${escapeHtml(hospital.hospitalName || 'CITY HOSPITAL')}</h1>
          <div class="hospital-tagline">${escapeHtml(hospital.tagline || 'Center for Medical Excellence & Compassionate Care')}</div>
        </div>
      </div>
      <div class="hospital-contact-details">
        <div><strong>Address:</strong> ${escapeHtml(hospital.address)}, ${escapeHtml(hospital.city)}</div>
        <div><strong>Helpline:</strong> ${escapeHtml(hospital.phone)} | <strong>Email:</strong> ${escapeHtml(hospital.email)}</div>
        ${hospital.taxNumber ? `<div><strong>Reg / NTN:</strong> ${escapeHtml(hospital.taxNumber)}</div>` : ''}
      </div>
    </div>

    <div class="header-right">
      <div class="token-box">
        <div class="token-label">OPD TOKEN</div>
        <div class="token-number">#${escapeHtml(visit.tokenNumber)}</div>
        <div class="token-meta">
          <div>Priority: <span class="badge-priority">${escapeHtml(visit.priority || 'NORMAL')}</span></div>
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
      <span class="field-value" style="font-size: 10.5pt; color: #0f766e;">${escapeHtml(patient.fullName)}</span>
    </div>
    <div class="patient-field">
      <span class="field-label">MR Number</span>
      <span class="field-value" style="font-size: 10pt;">${escapeHtml(patient.mrn)}</span>
    </div>
    <div class="patient-field">
      <span class="field-label">Age / Gender / Blood</span>
      <span class="field-value">${patient.age ? `${escapeHtml(patient.age)} Yrs` : '—'} / ${escapeHtml(patient.gender || '—')} / <strong style="color:#e11d48;">${bloodGroupLabel}</strong></span>
    </div>
    <div class="patient-field">
      <span class="field-label">Contact Phone</span>
      <span class="field-value">${escapeHtmlOrDash(patient.phone)}</span>
    </div>

    <div class="patient-field">
      <span class="field-label">Consulting Specialist</span>
      <span class="field-value">${escapeHtml(visit.doctorName || 'Assigned Specialist')}</span>
    </div>
    <div class="patient-field">
      <span class="field-label">Specialty & Dept</span>
      <span class="field-value">${escapeHtml(visit.doctorSpecialty || visit.departmentName || 'General OPD')}</span>
    </div>
    <div class="patient-field">
      <span class="field-label">Encounter / Visit Type</span>
      <span class="field-value">${visitTypeLabel}</span>
    </div>
    <div class="patient-field">
      <span class="field-label">Panel / Corporate Client</span>
      <span class="field-value" style="color: #0369a1;">${escapeHtml(patient?.panelClientName || 'Private (Self-Pay)')}</span>
    </div>
    <div class="patient-field">
      <span class="field-label">Employee Id</span>
      <span class="field-value" style="color: #0369a1;">${escapeHtmlOrDash(patient?.employeeId)}</span>
    </div>
  </div>

  <!-- ==================================================== -->
  <!-- 3. TRIAGE VITALS SIGNS ASSESSMENT -->
  <!-- ==================================================== -->
  <div class="section-title">
    <span>Initial Triage Assessment & Vital Signs</span>
    <span style="font-size: 7.5pt; font-weight: 600; color: #64748b; text-transform: none;">
      Recorded at: ${vitals?.recordedAt ? escapeHtml(new Date(vitals.recordedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })) : formattedTime}
    </span>
  </div>

  <div class="vitals-grid">
    <!-- Blood Pressure -->
    <div class="vital-card">
      <div class="vital-header">Blood Pressure</div>
      <div class="vital-value">
        ${vitals?.systolicBp && vitals?.diastolicBp ? `${escapeHtml(vitals.systolicBp)}/${escapeHtml(vitals.diastolicBp)}` : '—'}
        <span class="vital-unit">mmHg</span>
      </div>
      <div class="vital-subtext ${bpClass}">${escapeHtml(bpCategory || 'Not recorded')}</div>
    </div>

    <!-- Pulse Rate -->
    <div class="vital-card">
      <div class="vital-header">Heart / Pulse Rate</div>
      <div class="vital-value">
        ${vitals?.pulse ? escapeHtml(vitals.pulse) : '—'}
        <span class="vital-unit">bpm</span>
      </div>
      <div class="vital-subtext">${vitals?.pulse ? (vitals.pulse > 100 ? 'Tachycardia' : vitals.pulse < 60 ? 'Bradycardia' : 'Normal Rhythm') : '—'}</div>
    </div>

    <!-- Temperature -->
    <div class="vital-card">
      <div class="vital-header">Body Temperature</div>
      <div class="vital-value">
        ${vitals?.temperature ? escapeHtml(Number(vitals.temperature).toFixed(1)) : '—'}
        <span class="vital-unit">°F</span>
      </div>
      <div class="vital-subtext">${vitals?.temperature ? (Number(vitals.temperature) >= 100.4 ? 'Febrile / Fever' : 'Afebrile') : '—'}</div>
    </div>

    <!-- Oxygen Saturation -->
    <div class="vital-card">
      <div class="vital-header">Oxygen (SpO2)</div>
      <div class="vital-value">
        ${vitals?.spo2 ? `${escapeHtml(vitals.spo2)}%` : '—'}
      </div>
      <div class="vital-subtext ${vitals?.spo2 && vitals.spo2 < 94 ? 'critical' : 'normal'}">${vitals?.spo2 ? (vitals.spo2 >= 95 ? 'Normal (Room Air)' : 'Low Saturation') : '—'}</div>
    </div>

    <!-- Weight & Height -->
    <div class="vital-card">
      <div class="vital-header">Weight & Height</div>
      <div class="vital-value" style="font-size: 11pt;">
        ${vitals?.weight ? `${escapeHtml(vitals.weight)} kg` : '—'} / ${vitals?.height ? `${escapeHtml(vitals.height)} cm` : '—'}
      </div>
      <div class="vital-subtext">${vitals?.height ? `${(Number(vitals.height) / 30.48).toFixed(1)} ft` : '—'}</div>
    </div>

    <!-- BMI -->
    <div class="vital-card">
      <div class="vital-header">Body Mass Index (BMI)</div>
      <div class="vital-value">
        ${vitals?.bmi ? escapeHtml(Number(vitals.bmi).toFixed(1)) : '—'}
        <span class="vital-unit">kg/m²</span>
      </div>
      <div class="vital-subtext">${escapeHtml(bmiCategory || '—')}</div>
    </div>

    <!-- Blood Glucose -->
    <div class="vital-card">
      <div class="vital-header">Blood Sugar (BS)</div>
      <div class="vital-value">
        ${vitals?.bloodGlucose ? `${escapeHtml(vitals.bloodGlucose)}` : '—'}
        <span class="vital-unit">mg/dL</span>
      </div>
      <div class="vital-subtext">${escapeHtml(vitals?.glucoseType || 'Random Glucose')}</div>
    </div>

    <!-- Resp Rate & Pain -->
    <div class="vital-card">
      <div class="vital-header">Resp. Rate & Pain</div>
      <div class="vital-value" style="font-size: 11pt;">
        ${vitals?.respiratoryRate ? `${escapeHtml(vitals.respiratoryRate)}/min` : '—'} | Pain: ${vitals?.painScore != null ? `${escapeHtml(vitals.painScore)}/10` : '0/10'}
      </div>
      <div class="vital-subtext">${vitals?.observations ? escapeHtml(vitals.observations.substring(0, 24)) : 'Normal breathing'}</div>
    </div>
  </div>

  ${vitals?.observations ? `
    <div style="background: #f8fafc; border-left: 3.5px solid #0f766e; padding: 6px 12px; font-size: 8.5pt; margin-bottom: 14px; border-radius: 0 6px 6px 0;">
      <strong>Front-Desk Triage Notes / Patient Complaints:</strong> ${escapeHtml(vitals.observations)}
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
