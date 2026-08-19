import { ipcMain } from 'electron';
import { AuthService } from '../services/auth.service';
import { PatientService } from '../services/patient.service';
import { VisitService } from '../services/visit.service';
import { VitalsService } from '../services/vitals.service';
import { ConsultationService } from '../services/consultation.service';
import { PrescriptionService } from '../services/prescription.service';
import { BillingService } from '../services/billing.service';
import { ReportService } from '../services/report.service';
import { ConfigService } from '../services/config.service';
import { BackupService } from '../services/backup.service';
import { AuditService } from '../services/audit.service';
import { PrintService } from '../printing/print.service';
import { LabService } from '../services/lab.service';
import { serializeForIpc } from './serializer';
import * as schemas from '../../shared/validation/schemas';

export function registerIpcHandlers() {
  /**
   * Helper wrapper to handle validation, authentication, and error formatting
   */
  function handle<T = any>(
    channel: string,
    handler: (payload: T, sessionUser?: any) => Promise<any>,
    options?: {
      permission?: string;
      schema?: any;
    }
  ) {
    ipcMain.handle(channel, async (_event, req: { token?: string; payload?: T }) => {
      try {
        let user;
        if (options?.permission) {
          if (!req?.token) throw new Error('Authentication required.');
          user = AuthService.requirePermission(req.token, options.permission);
        } else if (req?.token) {
          user = AuthService.getSession(req.token);
        }

        let parsedPayload = req?.payload;
        if (options?.schema) {
          const result = options.schema.safeParse(req?.payload);
          if (!result.success) {
            const errorMsg = result.error.errors.map((e: any) => e.message).join(', ');
            return { success: false, error: errorMsg };
          }
          parsedPayload = result.data;
        }

        const data = await handler(parsedPayload as T, user);
        return { success: true, data: serializeForIpc(data) };
      } catch (err: any) {
        if (!err.message?.includes('Authentication required') && !err.message?.includes('Forbidden')) {
          console.error(`IPC [${channel}] Error:`, err);
        }
        return { success: false, error: err.message || 'An unexpected error occurred.' };
      }
    });
  }

  // ----------------------------------------------------
  // 1. AUTHENTICATION
  // ----------------------------------------------------
  handle('auth:login', async (payload) => {
    return await AuthService.login(payload.username, payload.password);
  }, { schema: schemas.LoginSchema });

  handle('auth:logout', async (_, user) => {
    // handled by token lookup in logout
    return true;
  });

  handle('auth:get-current-user', async (_, user) => {
    if (!user) {
      throw new Error('Authentication required. Please log in.');
    }
    return user;
  });

  // ----------------------------------------------------
  // 2. PATIENTS
  // ----------------------------------------------------
  handle('patients:register', async (payload, user) => {
    return await PatientService.registerPatient(payload, user.id);
  }, { permission: 'patient:create', schema: schemas.CreatePatientSchema });

  handle('patients:search', async (payload) => {
    return await PatientService.searchPatients(payload?.query || '', payload?.limit);
  }, { permission: 'patient:read' });

  handle('patients:get-by-id', async (payload) => {
    return await PatientService.getPatientById(payload.id);
  }, { permission: 'patient:read' });

  handle('patients:update', async (payload, user) => {
    return await PatientService.updatePatient(payload.id, payload, user.id);
  }, { permission: 'patient:update_demographics' });

  // ----------------------------------------------------
  // 3. VISITS & QUEUE
  // ----------------------------------------------------
  handle('visits:create', async (payload, user) => {
    return await VisitService.createVisit(payload, user.id);
  }, { permission: 'visit:create', schema: schemas.CreateVisitSchema });

  handle('visits:get-all', async (payload) => {
    return await VisitService.getVisits(payload || {});
  }, { permission: 'visit:read' });

  handle('visits:update-status', async (payload, user) => {
    return await VisitService.updateStatus(payload.visitId, payload.status, user.id);
  }, { permission: 'visit:update_status', schema: schemas.UpdateVisitStatusSchema });

  // ----------------------------------------------------
  // 4. VITALS
  // ----------------------------------------------------
  handle('vitals:record', async (payload, user) => {
    return await VitalsService.recordVitals(payload, user.id);
  }, { permission: 'vitals:record', schema: schemas.RecordVitalsSchema });

  handle('vitals:get-history', async (payload) => {
    return await VitalsService.getPatientVitalsHistory(payload.patientId);
  }, { permission: 'vitals:read' });

  // ----------------------------------------------------
  // 5. CONSULTATIONS
  // ----------------------------------------------------
  handle('consultations:save', async (payload, user) => {
    return await ConsultationService.saveConsultation(payload, user.id);
  }, { permission: 'consultation:create', schema: schemas.SaveConsultationSchema });

  handle('consultations:amend', async (payload, user) => {
    return await ConsultationService.amendConsultation(payload, user.id);
  }, { permission: 'consultation:amend', schema: schemas.AmendConsultationSchema });

  handle('consultations:get-by-visit', async (payload) => {
    return await ConsultationService.getConsultationByVisit(payload.visitId);
  }, { permission: 'consultation:read' });

  // ----------------------------------------------------
  // 6. PRESCRIPTIONS & MEDICINES
  // ----------------------------------------------------
  handle('prescriptions:save', async (payload, user) => {
    return await PrescriptionService.savePrescription(payload, user.id);
  }, { permission: 'prescription:create', schema: schemas.SavePrescriptionSchema });

  handle('prescriptions:amend', async (payload, user) => {
    return await PrescriptionService.amendPrescription(payload, user.id);
  }, { permission: 'prescription:amend', schema: schemas.AmendPrescriptionSchema });

  handle('prescriptions:get-by-visit', async (payload) => {
    return await PrescriptionService.getPrescriptionByVisit(payload.visitId);
  }, { permission: 'patient:read' });

  handle('medicines:search', async (payload) => {
    return await ConfigService.searchMedicines(payload?.query || '', payload?.limit);
  });

  handle('medicines:save', async (payload, user) => {
    return await ConfigService.saveMedicine(payload, user.id);
  }, { permission: 'admin:manage_masters', schema: schemas.MedicineSchema });

  handle('investigations:search', async (payload) => {
    return await ConfigService.searchInvestigations(payload?.query || '', payload?.limit);
  });

  handle('investigations:save', async (payload, user) => {
    return await ConfigService.saveInvestigation(payload, user.id);
  }, { permission: 'admin:manage_masters', schema: schemas.InvestigationSchema });

  // ----------------------------------------------------
  // 7. BILLING & INVOICING
  // ----------------------------------------------------
  handle('billing:add-charge', async (payload, user) => {
    return await BillingService.addVisitCharge(payload, user.id);
  }, { permission: 'billing:create_charge', schema: schemas.CreateVisitChargeSchema });

  handle('billing:get-charges', async (payload) => {
    return await BillingService.getVisitCharges(payload.visitId);
  }, { permission: 'patient:read' });

  handle('billing:finalize-invoice', async (payload, user) => {
    return await BillingService.finalizeInvoice(payload, user.id);
  }, { permission: 'billing:create_invoice', schema: schemas.FinalizeInvoiceSchema });

  handle('billing:record-payment', async (payload, user) => {
    return await BillingService.recordPayment(payload, user.id);
  }, { permission: 'billing:receive_payment', schema: schemas.RecordPaymentSchema });

  handle('billing:apply-adjustment', async (payload, user) => {
    return await BillingService.applyAdjustment(payload, user.id);
  }, { permission: 'billing:adjust_financial', schema: schemas.FinancialAdjustmentSchema });

  handle('billing:get-invoice-by-id', async (payload) => {
    return await BillingService.getInvoiceById(payload.id);
  }, { permission: 'billing:print_slip' });

  handle('billing:get-invoices', async (payload) => {
    return await BillingService.getInvoices(payload || {});
  }, { permission: 'billing:print_slip' });

  // ----------------------------------------------------
  // 8. PRINTING & PDF EXPORT
  // ----------------------------------------------------
  handle('print:get-prescription-html', async (payload) => {
    return await PrintService.getPrescriptionHtml(payload.prescriptionId || payload.visitId);
  }, { permission: 'prescription:print' });

  handle('print:get-vitals-sheet-html', async (payload) => {
    return await PrintService.getVitalsSheetHtml(payload.visitId);
  }, { permission: 'vitals:read' });

  handle('print:get-invoice-html', async (payload) => {
    return await PrintService.getInvoiceHtml(payload.invoiceId);
  }, { permission: 'billing:print_slip' });

  handle('print:direct', async (payload) => {
    return await PrintService.printDirect(payload.html, payload.options);
  });

  handle('print:generate-pdf', async (payload) => {
    const pdfBuffer = await PrintService.generatePdf(payload.html);
    return pdfBuffer.toString('base64');
  });

  // ----------------------------------------------------
  // 9. LAB ORDERS & DIAGNOSTIC SAMPLING
  // ----------------------------------------------------
  handle('lab:get-catalog', async () => {
    return await LabService.getLabCatalog();
  });

  handle('lab:order-and-create-bill', async (payload, user) => {
    return await LabService.orderLabTestsAndCreateBill(payload, user.id);
  }, { permission: 'billing:create_charge' });

  // ----------------------------------------------------
  // 10. CONFIGURATION & MASTER DATA
  // ----------------------------------------------------
  handle('config:get-hospital-setting', async () => {
    return await ConfigService.getHospitalSetting();
  });

  handle('config:update-hospital-setting', async (payload, user) => {
    return await ConfigService.updateHospitalSetting(payload, user.id);
  }, { permission: 'admin:manage_masters' });

  handle('config:get-departments', async () => {
    return await ConfigService.getDepartments();
  });

  handle('config:save-department', async (payload, user) => {
    return await ConfigService.saveDepartment(payload, user.id);
  }, { permission: 'admin:manage_masters', schema: schemas.DepartmentSchema });

  handle('config:get-doctors', async (payload) => {
    return await ConfigService.getDoctors(payload?.activeOnly);
  });

  handle('config:save-doctor', async (payload, user) => {
    return await ConfigService.saveDoctor(payload, user.id);
  }, { permission: 'admin:manage_masters', schema: schemas.DoctorSchema });

  handle('config:get-services', async (payload) => {
    return await ConfigService.getServices(payload?.activeOnly);
  });

  handle('config:save-service', async (payload, user) => {
    return await ConfigService.saveService(payload, user.id);
  }, { permission: 'admin:manage_masters', schema: schemas.ServiceSchema });

  handle('config:get-investigations', async (payload) => {
    return await ConfigService.getInvestigations(!payload?.activeOnly);
  });

  handle('config:save-investigation', async (payload, user) => {
    return await ConfigService.saveInvestigation(payload, user.id);
  }, { permission: 'admin:manage_masters', schema: schemas.InvestigationSchema });

  handle('config:toggle-investigation-status', async (payload, user) => {
    return await ConfigService.toggleInvestigationStatus(payload.id, user.id);
  }, { permission: 'admin:manage_masters' });

  handle('config:get-panel-clients', async (payload) => {
    return await ConfigService.getPanelClients(payload?.activeOnly);
  });

  handle('config:save-panel-client', async (payload, user) => {
    return await ConfigService.savePanelClient(payload, user.id);
  }, { permission: 'admin:manage_masters', schema: schemas.PanelClientSchema });

  handle('config:get-users', async () => {
    return await ConfigService.getUsers();
  }, { permission: 'admin:manage_users' });

  handle('config:save-user', async (payload, user) => {
    return await ConfigService.saveUser(payload, user.id);
  }, { permission: 'admin:manage_users' });

  // ----------------------------------------------------
  // 10. REPORTS & AUDIT LOGS & BACKUPS
  // ----------------------------------------------------
  handle('reports:daily-collection', async (payload) => {
    return await ReportService.getDailyCollection(payload?.date);
  }, { permission: 'report:view_financial' });

  handle('reports:doctor-stats', async (payload) => {
    return await ReportService.getDoctorWiseStats(payload || {});
  }, { permission: 'report:view_operational' });

  handle('reports:department-stats', async (payload) => {
    return await ReportService.getDepartmentWiseStats(payload || {});
  }, { permission: 'report:view_operational' });

  handle('reports:panel-billing', async (payload) => {
    return await ReportService.getPanelClientBilling(payload || {});
  }, { permission: 'report:view_financial' });

  handle('reports:investigations', async (payload) => {
    return await ReportService.getInvestigationStats(payload || {});
  }, { permission: 'report:view_operational' });

  handle('audit:get-logs', async (payload) => {
    return await AuditService.getLogs(payload || {});
  }, { permission: 'admin:audit_logs' });

  handle('backup:create', async (_, user) => {
    return await BackupService.createBackup(user.id);
  }, { permission: 'admin:backup_restore' });

  handle('backup:list', async () => {
    return await BackupService.listBackups();
  }, { permission: 'admin:backup_restore' });
}
