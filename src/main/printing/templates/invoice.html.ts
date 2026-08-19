import { HospitalSettingDto, InvoiceDto } from '../../../shared/types';
import { InvoiceStatus } from '../../../shared/constants/enums';

export function renderInvoiceHtml(params: {
  hospital: HospitalSettingDto;
  invoice: InvoiceDto;
}): string {
  const { hospital, invoice } = params;
  const currency = hospital.currencySymbol || 'Rs.';

  const isPaid = invoice.status === InvoiceStatus.PAID || Number(invoice.balanceTotal) <= 0;
  const isPartiallyPaid = invoice.status === InvoiceStatus.PARTIALLY_PAID && Number(invoice.balanceTotal) > 0;

  // Format Date & Time
  const createdDate = invoice.createdAt ? new Date(invoice.createdAt) : new Date();
  const formattedDate = createdDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const formattedTime = createdDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  // Extract Lab Sample Barcode if present in notes
  const barcodeMatch = invoice.notes?.match(/SMP-[A-Za-z0-9_-]+/);
  const sampleBarcode = barcodeMatch ? barcodeMatch[0] : null;

  // Determine if this is primarily a Lab/Diagnostic Bill
  const isLabBill = invoice.items?.some((i) =>
    i.serviceName?.toLowerCase().includes('lab') ||
    i.serviceName?.toLowerCase().includes('test') ||
    i.serviceName?.toLowerCase().includes('cbc') ||
    i.serviceName?.toLowerCase().includes('sugar') ||
    i.serviceName?.toLowerCase().includes('profile') ||
    i.serviceName?.toLowerCase().includes('x-ray') ||
    i.serviceName?.toLowerCase().includes('ultrasound')
  );

  const billTitle = isLabBill ? 'DIAGNOSTIC & LAB BILLING SLIP' : 'OFFICIAL OPD BILLING SLIP';

  // Items Rows
  const itemsRows = (invoice.items || [])
    .map((item, idx) => {
      const isLabItem = item.serviceName?.toLowerCase().includes('lab');
      const cleanServiceName = item.serviceName?.replace(/^Lab:\s*/i, '') || 'Medical Service';

      return `
      <tr>
        <td style="width: 38px; text-align: center; font-weight: 700; color: #64748b;">${idx + 1}</td>
        <td>
          <div style="font-weight: 700; color: #0f172a; font-size: 9.5pt;">
            ${cleanServiceName}
          </div>
          ${isLabItem ? `<div style="font-size: 7.5pt; color: #0f766e; font-weight: 600; text-transform: uppercase;">Diagnostic Laboratory Investigation</div>` : ''}
        </td>
        <td style="text-align: center; font-weight: 700;">${item.quantity}</td>
        <td style="text-align: right; color: #334155;">${currency} ${Number(item.unitPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
        <td style="text-align: right; color: #059669;">${item.discount > 0 ? `- ${currency} ${Number(item.discount).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}</td>
        <td style="text-align: right; font-weight: 800; color: #0f172a;">${currency} ${Number(item.netAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
      </tr>
    `;
    })
    .join('');

  // Payment Receipts Rows
  const paymentsRows = (invoice.payments || [])
    .map((p) => {
      const pDate = new Date(p.receivedAt).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      return `
      <tr>
        <td style="font-weight: 700; color: #0f766e;">${p.receiptNumber}</td>
        <td style="color: #64748b;">${pDate}</td>
        <td>
          <span style="display: inline-block; padding: 1px 6px; border-radius: 4px; background: #e0f2fe; color: #0369a1; font-weight: 700; font-size: 7.5pt;">
            ${p.paymentMethod}
          </span>
          ${p.transactionReference ? `<span style="font-size: 7.5pt; color: #64748b; margin-left: 4px;">(Ref: ${p.transactionReference})</span>` : ''}
        </td>
        <td style="text-align: right; font-weight: 800; color: #166534;">
          ${currency} ${Number(p.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </td>
      </tr>
    `;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${billTitle} - ${invoice.invoiceNumber} - ${invoice.patient?.fullName || 'Patient'}</title>
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
      font-size: 9.5pt;
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
        min-height: auto;
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
    .invoice-badge-box {
      background: #f0fdfa;
      border: 2px solid #0f766e;
      border-radius: 8px;
      padding: 6px 14px;
      text-align: center;
      min-width: 155px;
      box-shadow: 0 2px 4px rgba(15, 118, 110, 0.1);
    }
    .invoice-badge-title {
      font-size: 7.5pt;
      font-weight: 800;
      color: #0f766e;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .invoice-number-display {
      font-size: 14pt;
      font-weight: 900;
      color: #0f766e;
      line-height: 1.2;
      margin: 2px 0;
      letter-spacing: 0.5px;
    }
    .invoice-meta-text {
      font-size: 7.8pt;
      color: #64748b;
      margin-top: 2px;
      line-height: 1.3;
    }
    .status-tag {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 4px;
      font-size: 7.8pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-top: 4px;
    }
    .status-paid {
      background: #dcfce7;
      color: #15803d;
      border: 1.5px solid #86efac;
    }
    .status-unpaid {
      background: #fef3c7;
      color: #b45309;
      border: 1.5px solid #fde68a;
    }
    .status-partially-paid {
      background: #fef9c3;
      color: #a16207;
      border: 1.5px solid #fde047;
    }

    /* ---------------------------------------------------- */
    /* 2. PATIENT DEMOGRAPHICS & ENCOUNTER SUMMARY */
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
      font-size: 9pt;
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

    /* ---------------------------------------------------- */
    /* 3. SPECIMEN & DIAGNOSTIC DETAILS (FOR LAB BILLS) */
    /* ---------------------------------------------------- */
    .specimen-card {
      background: #f0fdfa;
      border: 1.5px solid #99f6e4;
      border-radius: 8px;
      padding: 8px 14px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }
    .specimen-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .barcode-box {
      font-family: 'Courier New', Courier, monospace;
      background: #ffffff;
      border: 1.5px solid #0f766e;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 11pt;
      font-weight: 900;
      color: #0f766e;
      letter-spacing: 1px;
    }
    .specimen-info {
      font-size: 8.5pt;
      color: #115e59;
    }

    /* ---------------------------------------------------- */
    /* 4. ITEMIZED CHARGES TABLE */
    /* ---------------------------------------------------- */
    .section-heading {
      font-size: 10pt;
      font-weight: 800;
      color: #0f766e;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1.5px solid #ccfbf1;
      padding-bottom: 4px;
      margin-bottom: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .invoice-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9pt;
      margin-bottom: 14px;
    }
    .invoice-table th {
      background: #0f766e;
      color: #ffffff;
      padding: 6px 10px;
      font-weight: 700;
      text-align: left;
      font-size: 8.5pt;
      letter-spacing: 0.03em;
      text-transform: uppercase;
    }
    .invoice-table th:first-child {
      border-top-left-radius: 6px;
    }
    .invoice-table th:last-child {
      border-top-right-radius: 6px;
    }
    .invoice-table td {
      padding: 7px 10px;
      border-bottom: 1px solid #e2e8f0;
    }
    .invoice-table tr:nth-child(even) td {
      background-color: #f8fafc;
    }

    /* ---------------------------------------------------- */
    /* 5. SUMMARY & PAYMENTS SECTION */
    /* ---------------------------------------------------- */
    .summary-grid {
      display: grid;
      grid-template-columns: 1.25fr 1fr;
      gap: 16px;
      margin-bottom: 14px;
    }
    .payments-card {
      border: 1.5px solid #cbd5e1;
      border-radius: 8px;
      padding: 10px 12px;
      background: #ffffff;
    }
    .payments-title {
      font-size: 8.5pt;
      font-weight: 800;
      color: #0f766e;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .payments-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8pt;
    }
    .payments-table th {
      background: #f1f5f9;
      color: #475569;
      padding: 4px 6px;
      text-align: left;
      font-weight: 700;
      border-bottom: 1px solid #cbd5e1;
    }
    .payments-table td {
      padding: 5px 6px;
      border-bottom: 1px solid #f1f5f9;
    }

    .totals-card {
      background: #f8fafc;
      border: 1.5px solid #cbd5e1;
      border-radius: 8px;
      padding: 10px 14px;
    }
    .total-line {
      display: flex;
      justify-content: space-between;
      font-size: 9pt;
      margin-bottom: 5px;
      color: #475569;
    }
    .total-line.net-payable {
      border-top: 1.5px solid #cbd5e1;
      padding-top: 6px;
      margin-top: 6px;
      font-size: 11.5pt;
      font-weight: 900;
      color: #0f766e;
    }
    .total-line.paid-line {
      color: #166534;
      font-weight: 700;
      font-size: 9.5pt;
    }
    .total-line.balance-line {
      border-top: 1.5px solid #cbd5e1;
      padding-top: 6px;
      margin-top: 6px;
      font-size: 11pt;
      font-weight: 900;
    }
    .balance-unpaid {
      color: #dc2626;
    }
    .balance-paid {
      color: #166534;
    }

    /* ---------------------------------------------------- */
    /* 6. FOOTER, CASHIER STAMP & SIGNATURE */
    /* ---------------------------------------------------- */
    .footer-container {
      margin-top: 18px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-top: 2px solid #0f766e;
      padding-top: 10px;
      font-size: 8pt;
      color: #64748b;
    }
    .signature-area {
      display: flex;
      gap: 24px;
    }
    .signature-box {
      text-align: center;
      width: 140px;
    }
    .signature-line {
      border-top: 1.5px solid #334155;
      margin-top: 36px;
      padding-top: 4px;
      font-weight: 700;
      color: #0f172a;
      font-size: 8pt;
    }
    .hospital-seal {
      font-size: 7pt;
      color: #94a3b8;
      margin-top: 1px;
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
      <div class="invoice-badge-box">
        <div class="invoice-badge-title">${billTitle}</div>
        <div class="invoice-number-display">${invoice.invoiceNumber}</div>
        <div class="invoice-meta-text">
          <div>${formattedDate} • ${formattedTime}</div>
          <div>
            <span class="status-tag ${isPaid ? 'status-paid' : isPartiallyPaid ? 'status-partially-paid' : 'status-unpaid'}">
              ${isPaid ? 'PAID' : isPartiallyPaid ? 'PARTIALLY PAID' : 'UNPAID (PENDING)'}
            </span>
          </div>
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
      <span class="field-value" style="font-size: 10pt; color: #0f766e;">${invoice.patient?.fullName || '—'}</span>
    </div>
    <div class="patient-field">
      <span class="field-label">MR Number</span>
      <span class="field-value" style="font-size: 9.5pt;">${invoice.patient?.mrn || '—'}</span>
    </div>
    <div class="patient-field">
      <span class="field-label">NIC / CNIC</span>
      <span class="field-value">${invoice.patient?.nic || '—'}</span>
    </div>
    <div class="patient-field">
      <span class="field-label">Contact Phone</span>
      <span class="field-value">${invoice.patient?.phone || '—'}</span>
    </div>

    <div class="patient-field">
      <span class="field-label">Prescribing Doctor</span>
      <span class="field-value">${invoice.doctorName || 'General OPD Specialist'}</span>
    </div>
    <div class="patient-field">
      <span class="field-label">Department</span>
      <span class="field-value">${invoice.departmentName || 'Outpatient Department'}</span>
    </div>
    <div class="patient-field">
      <span class="field-label">Panel / Corporate</span>
      <span class="field-value" style="color: #0369a1;">${invoice.panelClientName || invoice.patient?.panelClientName || 'Private (Self-Pay)'}</span>
    </div>
    <div class="patient-field">
      <span class="field-label">Employee ID</span>
      <span class="field-value" style="color: #0369a1;">${invoice.patient?.employeeId || 'N/A'}</span>
    </div>
  </div>

  <!-- ==================================================== -->
  <!-- 3. SPECIMEN & SAMPLING DETAILS (FOR LAB BILLS) -->
  <!-- ==================================================== -->
  ${
    sampleBarcode || isLabBill
      ? `
    <div class="specimen-card">
      <div class="specimen-left">
        ${
          sampleBarcode
            ? `
          <div>
            <div style="font-size: 6.8pt; font-weight: 800; color: #0f766e; text-transform: uppercase; margin-bottom: 2px;">Specimen Barcode #</div>
            <div class="barcode-box">${sampleBarcode}</div>
          </div>
        `
            : ''
        }
        <div class="specimen-info">
          <div><strong>Specimen Category:</strong> Laboratory Diagnostic Investigations</div>
          <div style="font-size: 7.8pt; color: #475569; margin-top: 1px;">
            ${invoice.notes || 'Specimen collected at hospital phlebotomy station for analysis.'}
          </div>
        </div>
      </div>
      <div style="font-size: 7.8pt; color: #0f766e; font-weight: 700; text-align: right;">
        <div>🧪 Laboratory Department</div>
        <div style="font-size: 7pt; color: #64748b; font-weight: 500;">Present slip for report collection</div>
      </div>
    </div>
  `
      : ''
  }

  <!-- ==================================================== -->
  <!-- 4. ITEMIZED CHARGES & INVESTIGATIONS TABLE -->
  <!-- ==================================================== -->
  <div class="section-heading">
    <span>Itemized Diagnostic Services & Charges</span>
    <span style="font-size: 7.5pt; font-weight: 600; color: #64748b; text-transform: none;">
      Total Items: ${invoice.items?.length || 0}
    </span>
  </div>

  <table class="invoice-table">
    <thead>
      <tr>
        <th style="width: 38px; text-align: center;">#</th>
        <th>Investigation / Service Description</th>
        <th style="text-align: center; width: 60px;">Qty</th>
        <th style="text-align: right; width: 110px;">Unit Price</th>
        <th style="text-align: right; width: 100px;">Discount</th>
        <th style="text-align: right; width: 120px;">Net Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows.length > 0 ? itemsRows : '<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 14px;">No billable items recorded.</td></tr>'}
    </tbody>
  </table>

  <!-- ==================================================== -->
  <!-- 5. SUMMARY & PAYMENTS BREAKDOWN -->
  <!-- ==================================================== -->
  <div class="summary-grid">
    <!-- Left: Payment Receipts History -->
    <div class="payments-card">
      <div class="payments-title">
        <span>Payment Receipts Recorded</span>
        <span style="font-size: 7pt; color: #64748b; font-weight: 600; text-transform: none;">
          ${(invoice.payments || []).length} Transaction(s)
        </span>
      </div>

      <table class="payments-table">
        <thead>
          <tr>
            <th>Receipt #</th>
            <th>Date/Time</th>
            <th>Method</th>
            <th style="text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${
            paymentsRows.length > 0
              ? paymentsRows
              : `<tr><td colspan="4" style="text-align: center; color: #94a3b8; padding: 12px; font-style: italic;">No payment collected yet. Bill is currently pending at cashier desk.</td></tr>`
          }
        </tbody>
      </table>

      ${
        invoice.notes
          ? `<div style="margin-top: 8px; font-size: 8pt; color: #475569; background: #f8fafc; padding: 6px 8px; border-radius: 4px; border-left: 2.5px solid #0f766e;">
              <strong>Remarks:</strong> ${invoice.notes}
            </div>`
          : ''
      }
    </div>

    <!-- Right: Financial Totals Box -->
    <div class="totals-card">
      <div class="total-line">
        <span>Subtotal:</span>
        <span style="font-weight: 700;">${currency} ${Number(invoice.subtotal).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
      </div>

      <div class="total-line">
        <span>Corporate / Discount:</span>
        <span style="color: #059669; font-weight: 700;">- ${currency} ${Number(invoice.discountTotal).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
      </div>

      ${
        invoice.taxTotal > 0
          ? `
        <div class="total-line">
          <span>Tax Amount:</span>
          <span>${currency} ${Number(invoice.taxTotal).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
      `
          : ''
      }

      <div class="total-line net-payable">
        <span>Net Total:</span>
        <span>${currency} ${Number(invoice.netTotal).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
      </div>

      <div class="total-line paid-line" style="margin-top: 4px;">
        <span>Amount Paid:</span>
        <span>${currency} ${Number(invoice.paidTotal).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
      </div>

      <div class="total-line balance-line ${isPaid ? 'balance-paid' : 'balance-unpaid'}">
        <span>${isPaid ? 'Balance Paid:' : 'Balance Due:'}</span>
        <span>${currency} ${Number(invoice.balanceTotal).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
      </div>
    </div>
  </div>

  <!-- ==================================================== -->
  <!-- 6. FOOTER, DISCLAIMER & AUTHORIZED SIGNATURES -->
  <!-- ==================================================== -->
  <div class="footer-container">
    <div style="max-width: 55%;">
      <div style="font-weight: 700; color: #0f766e; margin-bottom: 2px;">City Hospital Diagnostics & Billing Department</div>
      <div>${hospital.invoiceDisclaimer || 'This is an official computer-generated billing slip. Please retain this slip for laboratory test report collection.'}</div>
      <div style="margin-top: 3px; color: #94a3b8; font-size: 7.2pt;">
        Billing Officer ID: ${invoice.createdById} • Encounter Enc: ${invoice.visitId || 'OPD-ENC'}
      </div>
    </div>

    <div class="signature-area">
      <div class="signature-box">
        <div class="signature-line">Specimen Collector</div>
        <div class="hospital-seal">Phlebotomy Station</div>
      </div>

      <div class="signature-box">
        <div class="signature-line">Cashier / Billing Desk</div>
        <div class="hospital-seal">Authorized Signatory</div>
      </div>
    </div>
  </div>

</div>

</body>
</html>`;
}
