import { HospitalSettingDto, PatientDto, PrescriptionDto, VisitVitalsDto } from '../../../shared/types';
import { BloodGroupLabels, FoodRelationLabels } from '../../../shared/constants/enums';
import { escapeHtml, escapeHtmlOrDash } from '../utils/escapeHtml';

export function renderPrescriptionHtml(params: {
  hospital: HospitalSettingDto;
  prescription: PrescriptionDto;
  patient: PatientDto;
  vitals?: VisitVitalsDto | null;
}): string {
  const { hospital, prescription, patient, vitals } = params;

  const vitalsHtml = vitals
    ? `
    <div class="vitals-bar">
      <div class="vital-item"><strong>BP:</strong> ${vitals.systolicBp && vitals.diastolicBp ? `${escapeHtml(vitals.systolicBp)}/${escapeHtml(vitals.diastolicBp)} mmHg` : '—'}</div>
      <div class="vital-item"><strong>Pulse:</strong> ${vitals.pulse ? `${escapeHtml(vitals.pulse)} bpm` : '—'}</div>
      <div class="vital-item"><strong>Temp:</strong> ${vitals.temperature ? `${escapeHtml(vitals.temperature)} °F` : '—'}</div>
      <div class="vital-item"><strong>SpO2:</strong> ${vitals.spo2 ? `${escapeHtml(vitals.spo2)}%` : '—'}</div>
      <div class="vital-item"><strong>Weight:</strong> ${vitals.weight ? `${escapeHtml(vitals.weight)} kg` : '—'}</div>
      <div class="vital-item"><strong>Height:</strong> ${vitals.height ? `${escapeHtml(vitals.height)} cm` : '—'}</div>
      <div class="vital-item"><strong>BMI:</strong> ${vitals.bmi ? `${escapeHtml(vitals.bmi)} kg/m²` : '—'}</div>
      ${vitals.bloodGlucose ? `<div class="vital-item"><strong>Glucose:</strong> ${escapeHtml(vitals.bloodGlucose)} mg/dL (${escapeHtml(vitals.glucoseType || 'Random')})</div>` : ''}
    </div>
  `
    : '';

  const medicinesRows = prescription.items
    .map(
      (item, idx) => `
    <tr>
      <td style="width: 30px; text-align: center;">${idx + 1}</td>
      <td>
        <div class="med-name">${escapeHtml(item.medicineName)} ${item.strength ? `(${escapeHtml(item.strength)})` : ''}</div>
        ${item.genericName ? `<div class="med-generic">${escapeHtml(item.genericName)}</div>` : ''}
        ${item.additionalNotes ? `<div class="med-notes">${escapeHtml(item.additionalNotes)}</div>` : ''}
      </td>
      <td>${escapeHtmlOrDash(item.dosageForm)}</td>
      <td><strong>${escapeHtml(item.dose)}</strong></td>
      <td>${escapeHtml(item.frequency)}</td>
      <td>${escapeHtml(item.route)}</td>
      <td>${escapeHtml(item.duration)}</td>
      <td>
        <div>${escapeHtml(item.foodRelation ? FoodRelationLabels[item.foodRelation] || item.foodRelation : '')}</div>
        ${item.instructions ? `<div class="med-inst">${escapeHtml(item.instructions)}</div>` : ''}
      </td>
    </tr>
  `
    )
    .join('');

  const investigationsList =
    prescription.investigations && prescription.investigations.length > 0
      ? `
    <div class="section-box">
      <div class="section-title">Investigations / Tests Advised:</div>
      <ol class="inv-list">
        ${prescription.investigations
          .map(
            (inv) => `
          <li>
            <strong>${escapeHtml(inv.investigationName)}</strong>
            ${inv.instructions ? `<span class="inv-inst">(${escapeHtml(inv.instructions)})</span>` : ''}
          </li>
        `
          )
          .join('')}
      </ol>
    </div>
  `
      : '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Prescription - ${escapeHtml(prescription.prescriptionNo)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm 15mm 15mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      margin: 0;
      padding: 0;
      font-size: 11.5pt;
      line-height: 1.4;
      background: #ffffff;
    }
    .header-container {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2.5px solid #0284c7;
      padding-bottom: 12px;
      margin-bottom: 14px;
    }
    .hospital-info h1 {
      font-size: 20pt;
      font-weight: 700;
      color: #0369a1;
      margin: 0 0 2px 0;
      letter-spacing: -0.5px;
    }
    .hospital-info .tagline {
      font-size: 9.5pt;
      color: #475569;
      font-style: italic;
      margin-bottom: 4px;
    }
    .hospital-info .meta {
      font-size: 8.5pt;
      color: #64748b;
    }
    .doctor-info {
      text-align: right;
    }
    .doctor-name {
      font-size: 13pt;
      font-weight: 700;
      color: #0f172a;
    }
    .doctor-spec {
      font-size: 9.5pt;
      font-weight: 600;
      color: #0284c7;
    }
    .doctor-reg {
      font-size: 8.5pt;
      color: #64748b;
    }
    .patient-banner {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 14px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px 12px;
      margin-bottom: 14px;
    }
    .patient-field {
      font-size: 9pt;
      color: #334155;
    }
    .patient-field strong {
      color: #0f172a;
    }
    .vitals-bar {
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      border-radius: 6px;
      padding: 8px 12px;
      display: flex;
      flex-wrap: wrap;
      gap: 12px 18px;
      margin-bottom: 14px;
    }
    .vital-item {
      font-size: 8.5pt;
      color: #0369a1;
    }
    .clinical-row {
      margin-bottom: 14px;
    }
    .section-box {
      margin-bottom: 12px;
    }
    .section-title {
      font-size: 9.5pt;
      font-weight: 700;
      color: #0369a1;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 2px;
    }
    .section-content {
      font-size: 10pt;
      color: #334155;
    }
    .rx-symbol {
      font-size: 22pt;
      font-weight: 700;
      color: #0284c7;
      font-family: 'Times New Roman', serif;
      line-height: 1;
      margin-bottom: 4px;
    }
    .med-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
    }
    .med-table th {
      background: #f1f5f9;
      color: #334155;
      font-size: 8.5pt;
      font-weight: 700;
      text-align: left;
      padding: 6px 8px;
      border: 1px solid #cbd5e1;
    }
    .med-table td {
      font-size: 9pt;
      padding: 7px 8px;
      border: 1px solid #e2e8f0;
      vertical-align: top;
    }
    .med-name {
      font-weight: 700;
      color: #0f172a;
    }
    .med-generic {
      font-size: 8pt;
      color: #64748b;
      font-style: italic;
    }
    .med-notes {
      font-size: 8pt;
      color: #d97706;
    }
    .med-inst {
      font-size: 8pt;
      color: #475569;
    }
    .inv-list {
      margin: 4px 0 0 18px;
      padding: 0;
      font-size: 9.5pt;
    }
    .inv-list li {
      margin-bottom: 3px;
    }
    .inv-inst {
      font-size: 8.5pt;
      color: #64748b;
      font-style: italic;
    }
    .footer-container {
      margin-top: 30px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding-top: 10px;
    }
    .disclaimer {
      font-size: 7.5pt;
      color: #94a3b8;
      max-width: 340px;
    }
    .signature-box {
      text-align: center;
      width: 200px;
    }
    .sig-line {
      border-bottom: 1.5px solid #334155;
      height: 40px;
      margin-bottom: 4px;
    }
    .sig-title {
      font-size: 8.5pt;
      font-weight: 600;
      color: #1e293b;
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header-container">
    <div class="hospital-info">
      <h1>${escapeHtml(hospital.hospitalName)}</h1>
      <div class="tagline">${escapeHtml(hospital.tagline || '')}</div>
      <div class="meta">${escapeHtml(hospital.address)}, ${escapeHtml(hospital.city)} | Ph: ${escapeHtml(hospital.phone)}</div>
      <div class="meta">Email: ${escapeHtml(hospital.email)} | Web: ${escapeHtml(hospital.website || '')}</div>
    </div>
    <div class="doctor-info">
      <div class="doctor-name">${escapeHtml(prescription.doctorName || '')}</div>
      <div class="doctor-spec">${escapeHtml(prescription.doctorSpecialty || '')}</div>
      <div class="doctor-reg">${escapeHtml(prescription.doctorPrintableTitle || '')}</div>
      <div class="doctor-reg" style="margin-top: 4px;"><strong>Rx No:</strong> ${escapeHtml(prescription.prescriptionNo)}</div>
      <div class="doctor-reg"><strong>Date:</strong> ${escapeHtml(new Date(prescription.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }))}</div>
    </div>
  </div>

  <!-- Patient Safety Banner -->
  <div class="patient-banner">
    <div class="patient-field"><strong>Patient:</strong> ${escapeHtml(patient.fullName)}</div>
    <div class="patient-field"><strong>MRN:</strong> ${escapeHtml(patient.mrn)}</div>
    <div class="patient-field"><strong>Age/Gender:</strong> ${patient.age ? `${escapeHtml(patient.age)} yrs` : '—'} / ${escapeHtml(patient.gender)}</div>
    <div class="patient-field"><strong>Blood Group:</strong> ${escapeHtml(BloodGroupLabels[patient.bloodGroup] || patient.bloodGroup)}</div>
    <div class="patient-field"><strong>Phone:</strong> ${escapeHtml(patient.phone)}</div>
    <div class="patient-field"><strong>NIC:</strong> ${escapeHtmlOrDash(patient.nic)}</div>
    <div class="patient-field"><strong>Employee ID:</strong> ${escapeHtmlOrDash(patient.employeeId)}</div>
    <div class="patient-field"><strong>Panel:</strong> ${escapeHtml(patient.panelClientName || 'Private / Cash')}</div>
  </div>

  <!-- Vitals Strip -->
  ${vitalsHtml}

  <!-- Clinical Information -->
  <div class="clinical-row">
    ${
      prescription.diagnosis
        ? `
      <div class="section-box">
        <div class="section-title">Diagnosis:</div>
        <div class="section-content"><strong>${escapeHtml(prescription.diagnosis)}</strong></div>
      </div>
    `
        : ''
    }
    ${
      prescription.clinicalNotes
        ? `
      <div class="section-box">
        <div class="section-title">Clinical Notes / Findings:</div>
        <div class="section-content">${escapeHtml(prescription.clinicalNotes)}</div>
      </div>
    `
        : ''
    }
  </div>

  <!-- Prescription Rx Table -->
  <div style="margin-top: 6px;">
    <div class="rx-symbol">℞</div>
    <table class="med-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Medicine & Generic</th>
          <th>Form</th>
          <th>Dose</th>
          <th>Frequency</th>
          <th>Route</th>
          <th>Duration</th>
          <th>Instructions & Meal</th>
        </tr>
      </thead>
      <tbody>
        ${medicinesRows.length > 0 ? medicinesRows : '<tr><td colspan="8" style="text-align: center; color: #94a3b8;">No medicines prescribed.</td></tr>'}
      </tbody>
    </table>
  </div>

  <!-- Advised Investigations -->
  ${investigationsList}

  <!-- General Advice & Follow-up -->
  ${
    prescription.advice || prescription.followUpDate
      ? `
    <div class="section-box">
      <div class="section-title">Advice & Follow-Up:</div>
      <div class="section-content">
        ${prescription.advice ? `<div>${escapeHtml(prescription.advice)}</div>` : ''}
        ${
          prescription.followUpDate
            ? `<div style="margin-top: 4px;"><strong>Next Visit / Follow-up:</strong> ${escapeHtml(new Date(prescription.followUpDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }))}</div>`
            : ''
        }
      </div>
    </div>
  `
      : ''
  }

  <!-- Footer & Signature -->
  <div class="footer-container">
    <div class="disclaimer">
      ${escapeHtml(hospital.prescriptionDisclaimer || '')}
      <div style="margin-top: 4px;">Generated by City Hospital Management System. Version: ${escapeHtml(prescription.version)}</div>
    </div>
    <div class="signature-box">
      <div class="sig-line"></div>
      <div class="sig-title">Doctor's Signature</div>
      <div style="font-size: 7.5pt; color: #64748b;">${escapeHtml(prescription.doctorName || '')}</div>
    </div>
  </div>
</body>
</html>
  `;
}
