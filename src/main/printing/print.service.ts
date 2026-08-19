import { BrowserWindow } from 'electron';
import { ConfigService } from '../services/config.service';
import { PatientService } from '../services/patient.service';
import { PrescriptionService } from '../services/prescription.service';
import { BillingService } from '../services/billing.service';
import { VisitService } from '../services/visit.service';
import { renderPrescriptionHtml } from './templates/prescription.html';
import { renderInvoiceHtml } from './templates/invoice.html';
import { renderVitalsSheetHtml } from './templates/vitals-sheet.html';

export class PrintService {
  /**
   * Render A4 HTML string for Triage & Vitals Sheet with Left-aligned Hospital Header
   */
  static async getVitalsSheetHtml(visitId: string): Promise<string> {
    const hospital = await ConfigService.getHospitalSetting();
    const visit = await VisitService.getVisitById(visitId);
    if (!visit) throw new Error('Visit encounter not found.');

    const patient = await PatientService.getPatientById(visit.patientId);
    if (!patient) throw new Error('Patient record not found.');

    const vitals = visit.latestVitals || null;

    return renderVitalsSheetHtml({
      hospital,
      patient: PatientService['formatPatient'](patient),
      visit,
      vitals,
    });
  }

  /**
   * Render HTML string for Prescription
   */
  static async getPrescriptionHtml(prescriptionId: string): Promise<string> {
    const hospital = await ConfigService.getHospitalSetting();
    const rx = await PrescriptionService.getPrescriptionByVisit(prescriptionId);
    // Alternatively fetch by direct prescription ID if needed:
    const rxRecord = rx || (await (async () => {
      // Direct fetch if ID passed
      const item = await import('../database/prisma').then((m) =>
        m.prisma.prescription.findUnique({
          where: { id: prescriptionId },
          include: {
            doctor: true,
            items: { orderBy: { sortOrder: 'asc' } },
            investigations: { orderBy: { sortOrder: 'asc' } },
            amendments: true,
          },
        })
      );
      return item ? PrescriptionService['formatPrescription'](item) : null;
    })());

    if (!rxRecord) throw new Error('Prescription not found.');

    const patient = await PatientService.getPatientById(rxRecord.patientId);
    const vitals = patient.visits?.find((v: any) => v.id === rxRecord.visitId)?.vitals?.[0] || null;

    return renderPrescriptionHtml({
      hospital,
      prescription: rxRecord,
      patient: PatientService['formatPatient'](patient),
      vitals,
    });
  }

  /**
   * Render HTML string for Invoice
   */
  static async getInvoiceHtml(invoiceId: string): Promise<string> {
    const hospital = await ConfigService.getHospitalSetting();
    const invoice = await BillingService.getInvoiceById(invoiceId);
    if (!invoice) throw new Error('Invoice not found.');

    return renderInvoiceHtml({
      hospital,
      invoice,
    });
  }

  /**
   * Direct silent / system print via hidden BrowserWindow
   */
  static async printDirect(html: string, options?: { silent?: boolean; deviceName?: string }): Promise<boolean> {
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    await new Promise((r) => setTimeout(r, 150));

    return new Promise((resolve, _reject) => {
      printWindow.webContents.print(
        {
          silent: options?.silent || false,
          printBackground: true,
          deviceName: options?.deviceName || '',
          pageSize: 'A4',
          margins: {
            marginType: 'custom',
            top: 12,
            bottom: 12,
            left: 15,
            right: 15,
          },
        },
        (success, errorType) => {
          printWindow.close();
          if (success) {
            resolve(true);
          } else {
            console.error('Print failed:', errorType);
            resolve(false);
          }
        }
      );
    });
  }

  /**
   * Generate vector A4 PDF Buffer
   */
  static async generatePdf(html: string): Promise<Buffer> {
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    try {
      const data = await printWindow.webContents.printToPDF({
        pageSize: 'A4',
        printBackground: true,
        margins: {
          marginType: 'custom',
          top: 0.4,
          bottom: 0.4,
          left: 0.5,
          right: 0.5,
        },
      });
      printWindow.close();
      return data;
    } catch (err) {
      printWindow.close();
      throw err;
    }
  }
}
