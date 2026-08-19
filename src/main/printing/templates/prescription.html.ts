import { HospitalSettingDto, PatientDto, PrescriptionDto, VisitVitalsDto } from '../../../shared/types';
import { BloodGroupLabels, FoodRelationLabels } from '../../../shared/constants/enums';

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
      <div class="vital-item"><strong>BP:</strong> ${vitals.systolicBp && vitals.diastolicBp ? `${vitals.systolicBp}/${vitals.diastolicBp} mmHg` : '—'}</div>
      <div class="vital-item"><strong>Pulse:</strong> ${vitals.pulse ? `${vitals.pulse} bpm` : '—'}</div>
      <div class="vital-item"><strong>Temp:</strong> ${vitals.temperature ? `${vitals.temperature} °F` : '—'}</div>
      <div class="vital-item"><strong>SpO2:</strong> ${vitals.spo2 ? `${vitals.spo2}%` : '—'}</div>
      <div class="vital-item"><strong>Weight:</strong> ${vitals.weight ? `${vitals.weight} kg` : '—'}</div>
      <div class="vital-item"><strong>Height:</strong> ${vitals.height ? `${vitals.height} cm` : '—'}</div>
      <div class="vital-item"><strong>BMI:</strong> ${vitals.bmi ? `${vitals.bmi} kg/m²` : '—'}</div>
      ${vitals.bloodGlucose ? `<div class="vital-item"><strong>Glucose:</strong> ${vitals.bloodGlucose} mg/dL (${vitals.glucoseType || 'Random'})</div>` : ''}
    </div>
  `
    : '';

  const medicinesRows = prescription.items
    .map(
      (item, idx) => `
    <tr>
      <td style="width: 30px; text-align: center;">${idx + 1}</td>
      <td>
        <div class="med-name">${item.medicineName} ${item.strength ? `(${item.strength})` : ''}</div>
        ${item.genericName ? `<div class="med-generic">${item.genericName}</div>` : ''}
        ${item.additionalNotes ? `<div class="med-notes">${item.additionalNotes}</div>` : ''}
      </td>
      <td>${item.dosageForm || '—'}</td>
      <td><strong>${item.dose}</strong></td>
      <td>${item.frequency}</td>
      <td>${item.route}</td>
      <td>${item.duration}</td>
      <td>
        <div>${item.foodRelation ? FoodRelationLabels[item.foodRelation] || item.foodRelation : ''}</div>
        ${item.instructions ? `<div class="med-inst">${item.instructions}</div>` : ''}
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
            <strong>${inv.investigationName}</strong>
            ${inv.instructions ? `<span class="inv-inst">(${inv.instructions})</span>` : ''}
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
  <title>Prescription - ${prescription.prescriptionNo}</title>
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
      border-bottom: 2.5px solid #0f766e;
      padding-bottom: 10px;
      margin-bottom: 12px;
    }
    .hospital-info h1 {
      margin: 0;
      color: #0f766e;
      font-size: 20pt;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .hospital-info .tagline {
      color: #475569;
      font-size: 9.5pt;
      font-style: italic;
      margin-bottom: 4px;
    }
    .hospital-info .meta {
      color: #64748b;
      font-size: 8.5pt;
    }
    .doctor-info {
      text-align: right;
      max-width: 45%;
    }
    .doctor-name {
      color: #0f172a;
      font-size: 13pt;
      font-weight: 700;
    }
    .doctor-spec {
      color: #0f766e;
      font-size: 10pt;
      font-weight: 600;
    }
    .doctor-reg {
      color: #64748b;
      font-size: 8.5pt;
    }
    .patient-banner {
      background: #f0fdfa;
      border: 1px solid #ccfbf1;
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 10px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px 12px;
      font-size: 9.5pt;
    }
    .patient-field strong {
      color: #0f766e;
    }
    .vitals-bar {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 6px 10px;
      margin-bottom: 12px;
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      font-size: 9pt;
    }
    .vital-item strong {
      color: #334155;
    }
    .clinical-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 12px;
    }
    .section-box {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 5px;
      padding: 8px 10px;
      margin-bottom: 10px;
    }
    .section-title {
      color: #0f766e;
      font-size: 10pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 2px;
    }
    .section-content {
      font-size: 9.5pt;
      color: #1e293b;
    }
    .rx-symbol {
      font-size: 22pt;
      font-weight: bold;
      color: #0f766e;
      font-family: serif;
      margin-bottom: 4px;
      display: inline-block;
    }
    .med-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      font-size: 9pt;
    }
    .med-table th {
      background: #0f766e;
      color: #ffffff;
      text-align: left;
      padding: 6px 8px;
      font-weight: 600;
    }
    .med-table td {
      padding: 6px 8px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: top;
    }
    .med-table tr:nth-child(even) {
      background-color: #f8fafc;
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
    .med-inst {
      font-size: 8pt;
      color: #047857;
    }
    .med-notes {
      font-size: 8pt;
      color: #b45309;
    }
    .inv-list {
      margin: 4px 0 0 16px;
      padding: 0;
      font-size: 9pt;
    }
    .inv-list li {
      margin-bottom: 3px;
    }
    .inv-inst {
      color: #0f766e;
      font-size: 8.5pt;
      margin-left: 4px;
    }
    .footer-container {
      margin-top: 25px;
      border-top: 1px dashed #cbd5e1;
      padding-top: 10px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      page-break-inside: avoid;
    }
    .disclaimer {
      font-size: 7.5pt;
      color: #64748b;
      max-width: 60%;
      line-height: 1.3;
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
      <h1>${hospital.hospitalName}</h1>
      <div class="tagline">${hospital.tagline || ''}</div>
      <div class="meta">${hospital.address}, ${hospital.city} | Ph: ${hospital.phone}</div>
      <div class="meta">Email: ${hospital.email} | Web: ${hospital.website || ''}</div>
    </div>
    <div class="doctor-info">
      <div class="doctor-name">${prescription.doctorName || ''}</div>
      <div class="doctor-spec">${prescription.doctorSpecialty || ''}</div>
      <div class="doctor-reg">${prescription.doctorPrintableTitle || ''}</div>
      <div class="doctor-reg" style="margin-top: 4px;"><strong>Rx No:</strong> ${prescription.prescriptionNo}</div>
      <div class="doctor-reg"><strong>Date:</strong> ${new Date(prescription.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
    </div>
  </div>

  <!-- Patient Safety Banner -->
  <div class="patient-banner">
    <div class="patient-field"><strong>Patient:</strong> ${patient.fullName}</div>
    <div class="patient-field"><strong>MRN:</strong> ${patient.mrn}</div>
    <div class="patient-field"><strong>Age/Gender:</strong> ${patient.age ? `${patient.age} yrs` : '—'} / ${patient.gender}</div>
    <div class="patient-field"><strong>Blood Group:</strong> ${BloodGroupLabels[patient.bloodGroup] || patient.bloodGroup}</div>
    <div class="patient-field"><strong>Phone:</strong> ${patient.phone}</div>
    <div class="patient-field"><strong>NIC:</strong> ${patient.nic || '—'}</div>
    <div class="patient-field"><strong>Employee ID:</strong> ${patient.employeeId || '—'}</div>
    <div class="patient-field"><strong>Panel:</strong> ${patient.panelClientName || 'Private / Cash'}</div>
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
        <div class="section-content"><strong>${prescription.diagnosis}</strong></div>
      </div>
    `
        : ''
    }
    ${
      prescription.clinicalNotes
        ? `
      <div class="section-box">
        <div class="section-title">Clinical Notes / Findings:</div>
        <div class="section-content">${prescription.clinicalNotes}</div>
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
        ${prescription.advice ? `<div>${prescription.advice}</div>` : ''}
        ${
          prescription.followUpDate
            ? `<div style="margin-top: 4px;"><strong>Next Visit / Follow-up:</strong> ${new Date(prescription.followUpDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>`
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
      ${hospital.prescriptionDisclaimer || ''}
      <div style="margin-top: 4px;">Generated by City Hospital Management System. Version: ${prescription.version}</div>
    </div>
    <div class="signature-box">
      <div class="sig-line"></div>
      <div class="sig-title">Doctor's Signature</div>
      <div style="font-size: 7.5pt; color: #64748b;">${prescription.doctorName || ''}</div>
    </div>
  </div>
</body>
</html>
  `;
}
