import React, { useState, useEffect } from 'react';
import { useActivePatientStore } from '../../stores/activePatientStore';
import { invokeIpc } from '../../lib/ipc';
import { VisitDto, DoctorDto, DepartmentDto, PatientDto } from '../../../shared/types';
import { VisitStatus, VisitType } from '../../../shared/constants/enums';
import { Modal } from '../../components/common/Modal';
import {
  CalendarClock,
  PlusCircle,
  Activity,
  Receipt,
  User,
  Filter,
  CheckCircle,
  AlertCircle,
  Clock,
  Printer,
  FlaskConical,
  DollarSign,
} from 'lucide-react';

interface VisitQueuePageProps {
  onNavigateToVitals: () => void;
  onNavigateToLab: () => void;
  onNavigateToBilling: () => void;
  onNavigateToPatients: () => void;
}

export const VisitQueuePage: React.FC<VisitQueuePageProps> = ({
  onNavigateToVitals,
  onNavigateToLab,
  onNavigateToBilling,
  onNavigateToPatients,
}) => {
  const [visits, setVisits] = useState<VisitDto[]>([]);
  const [doctors, setDoctors] = useState<DoctorDto[]>([]);
  const [departments, setDepartments] = useState<DepartmentDto[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Print State
  const [printHtml, setPrintHtml] = useState<string | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isPrintingDirect, setIsPrintingDirect] = useState(false);

  // New Visit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [visitFormData, setVisitFormData] = useState({
    doctorId: '',
    departmentId: '',
    visitType: VisitType.NEW_CONSULTATION,
    priority: 'NORMAL',
    notes: '',
    customFee: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { patient: activePatient, setActivePatient, setActiveVisit } = useActivePatientStore();

  useEffect(() => {
    loadVisits();
    loadMasters();
  }, [selectedDoctorId, selectedStatus]);

  const loadVisits = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await invokeIpc<VisitDto[]>('visits:get-all', {
        date: today,
        doctorId: selectedDoctorId || undefined,
        status: selectedStatus || undefined,
      });
      if (res.success && res.data) {
        setVisits(res.data);
      }
    } catch (err) {
      console.error('Failed to load visits:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMasters = async () => {
    try {
      const [docRes, deptRes] = await Promise.all([
        invokeIpc<DoctorDto[]>('config:get-doctors', { activeOnly: true }),
        invokeIpc<DepartmentDto[]>('config:get-departments'),
      ]);
      if (docRes.success && docRes.data) setDoctors(docRes.data);
      if (deptRes.success && deptRes.data) setDepartments(deptRes.data);
    } catch (err) {}
  };

  const handlePrintVitalsSheet = async (visitId: string) => {
    try {
      setIsPrintingDirect(true);
      const res = await invokeIpc<string>('print:get-vitals-sheet-html', { visitId });
      if (res.success && res.data) {
        setPrintHtml(res.data);
        setIsPrintModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to load vitals sheet:', err);
    } finally {
      setIsPrintingDirect(false);
    }
  };

  const handleExecuteDirectPrint = async () => {
    if (!printHtml) return;
    try {
      setIsPrintingDirect(true);
      const res = await invokeIpc('print:direct', { html: printHtml, options: { silent: false } });
      if (res.success) {
        setIsPrintModalOpen(false);
      }
    } catch (err) {
      console.error('Print failed:', err);
    } finally {
      setIsPrintingDirect(false);
    }
  };

  const handleDoctorChange = (doctorId: string) => {
    const doc = doctors.find((d) => d.id === doctorId);
    setVisitFormData({
      ...visitFormData,
      doctorId,
      departmentId: doc ? doc.departmentId : visitFormData.departmentId,
      customFee: doc ? String(doc.consultationFee) : '',
    });
  };

  const handleCreateVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePatient) {
      setFormError('Please select or register a patient first.');
      return;
    }
    setFormError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        patientId: activePatient.id,
        doctorId: visitFormData.doctorId,
        departmentId: visitFormData.departmentId,
        visitType: visitFormData.visitType,
        priority: visitFormData.priority,
        notes: visitFormData.notes.trim() || undefined,
        customFee: visitFormData.customFee ? parseFloat(visitFormData.customFee) : undefined,
      };

      const res = await invokeIpc<VisitDto>('visits:create', payload);
      if (res.success && res.data) {
        setActiveVisit(res.data);
        setIsModalOpen(false);
        setVisitFormData({
          doctorId: '',
          departmentId: '',
          visitType: VisitType.NEW_CONSULTATION,
          priority: 'NORMAL',
          notes: '',
          customFee: '',
        });
        loadVisits();
      } else {
        setFormError(res.error || 'Failed to create visit encounter.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Error creating visit.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (visitId: string, newStatus: VisitStatus) => {
    try {
      const res = await invokeIpc('visits:update-status', { visitId, status: newStatus });
      if (res.success) {
        loadVisits();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Action and Filter Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-surface)', padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)' }}>
            <Filter size={16} color="var(--text-muted)" />
            <select
              className="select"
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              style={{ border: 'none', background: 'transparent', padding: '0', fontSize: '0.85rem' }}
            >
              <option value="">All Consulting Doctors</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.specialty})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-surface)', padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)' }}>
            <select
              className="select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{ border: 'none', background: 'transparent', padding: '0', fontSize: '0.85rem' }}
            >
              <option value="">All Visit Statuses</option>
              <option value="REGISTERED">Registered</option>
              <option value="WAITING">Waiting Vitals</option>
              <option value="VITALS_COMPLETED">Vitals Completed</option>
              <option value="WITH_DOCTOR">With Doctor</option>
              <option value="CONSULTATION_COMPLETED">Consultation Done</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {activePatient ? (
            <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
              <PlusCircle size={16} />
              <span>Create Visit for {activePatient.fullName}</span>
            </button>
          ) : (
            <button onClick={onNavigateToPatients} className="btn btn-primary">
              <User size={16} />
              <span>Select Patient to Create Visit</span>
            </button>
          )}
        </div>
      </div>

      {/* OPD Queue Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem' }}>Today's OPD Queue & Clinical Status</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Live workflow tracking from registration to triage, consultation, and billing</p>
          </div>
          <button onClick={loadVisits} className="btn btn-secondary btn-sm">
            Refresh Queue
          </button>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Token</th>
                <th>Visit #</th>
                <th>Patient Details</th>
                <th>Consulting Doctor</th>
                <th>Department</th>
                <th>Visit Type</th>
                <th>Clinical Stage</th>
                <th>Billing</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visits.length > 0 ? (
                visits.map((v) => {
                  return (
                    <tr key={v.id}>
                      <td style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--primary-400)' }}>
                        #{v.tokenNumber}
                      </td>
                      <td style={{ fontWeight: 700, fontSize: '0.85rem' }}>{v.visitNumber}</td>
                      <td>
                        <div style={{ fontWeight: 700 }}>{v.patient?.fullName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          MRN: {v.patient?.mrn} • {v.patient?.age ? `${v.patient.age}y` : ''} {v.patient?.gender}
                        </div>
                      </td>
                      <td>{v.doctorName}</td>
                      <td>{v.departmentName}</td>
                      <td>
                        <span className="badge badge-slate">{v.visitType.replace('_', ' ')}</span>
                      </td>
                      <td>
                        <select
                          className="select"
                          value={v.status}
                          onChange={(e) => handleStatusChange(v.id, e.target.value as VisitStatus)}
                          style={{
                            fontSize: '0.75rem',
                            padding: '0.25rem 0.5rem',
                            fontWeight: 600,
                            borderColor: v.status === 'CONSULTATION_COMPLETED' ? 'var(--accent-emerald)' : undefined,
                          }}
                        >
                          <option value="REGISTERED">Registered</option>
                          <option value="WAITING">Waiting Vitals</option>
                          <option value="VITALS_COMPLETED">Vitals Completed</option>
                          <option value="WITH_DOCTOR">With Doctor</option>
                          <option value="CONSULTATION_COMPLETED">Consultation Done</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="CANCELLED">Cancelled</option>
                        </select>
                      </td>
                      <td>
                        <span className={`badge ${v.paymentStatus === 'PAID' ? 'badge-emerald' : 'badge-amber'}`}>
                          {v.paymentStatus}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <button
                            onClick={() => {
                              if (v.patient) setActivePatient(v.patient, v);
                              onNavigateToVitals();
                            }}
                            className="btn btn-secondary btn-sm"
                            title="Record / View Vitals"
                          >
                            <Activity size={13} />
                            <span>Vitals</span>
                          </button>
                          <button
                            onClick={() => handlePrintVitalsSheet(v.id)}
                            className="btn btn-secondary btn-sm"
                            title="Print A4 Triage Slip"
                            disabled={isPrintingDirect}
                          >
                            <Printer size={13} />
                          </button>
                          <button
                            onClick={() => {
                              if (v.patient) setActivePatient(v.patient, v);
                              onNavigateToLab();
                            }}
                            className="btn btn-secondary btn-sm"
                            title="Prescribe Lab Tests & Take Sample"
                          >
                            <FlaskConical size={13} color="#38bdf8" />
                            <span>Lab</span>
                          </button>
                          <button
                            onClick={() => {
                              if (v.patient) setActivePatient(v.patient, v);
                              onNavigateToBilling();
                            }}
                            className="btn btn-primary btn-sm"
                            title="Billing Slip / Invoicing & Cashier"
                          >
                            <Receipt size={13} />
                            <span>Bill</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2.5rem' }}>
                    {loading ? 'Fetching live queue...' : 'No patient visits found for selected filter.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Visit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`Create Encounter for ${activePatient?.fullName}`} maxWidth="600px">
        <form onSubmit={handleCreateVisit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {formError && (
            <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid var(--accent-rose)', color: '#fda4af', padding: '0.6rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <AlertCircle size={16} />
              <span>{formError}</span>
            </div>
          )}

          <div className="responsive-grid-2">
            <div>
              <label className="form-label">Consulting Doctor *</label>
              <select
                className="select"
                value={visitFormData.doctorId}
                onChange={(e) => handleDoctorChange(e.target.value)}
                required
              >
                <option value="">Select Doctor</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} — {d.specialty} (Rs. {d.consultationFee})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Department *</label>
              <select
                className="select"
                value={visitFormData.departmentId}
                onChange={(e) => setVisitFormData({ ...visitFormData, departmentId: e.target.value })}
                required
              >
                <option value="">Select Department</option>
                {departments.map((dep) => (
                  <option key={dep.id} value={dep.id}>
                    {dep.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="responsive-grid-2">
            <div>
              <label className="form-label">Visit Type</label>
              <select
                className="select"
                value={visitFormData.visitType}
                onChange={(e) => setVisitFormData({ ...visitFormData, visitType: e.target.value as VisitType })}
              >
                <option value="NEW_CONSULTATION">New Consultation</option>
                <option value="FOLLOW_UP">Follow-up</option>
                <option value="EMERGENCY">Emergency</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="form-label">Priority</label>
              <select
                className="select"
                value={visitFormData.priority}
                onChange={(e) => setVisitFormData({ ...visitFormData, priority: e.target.value })}
              >
                <option value="NORMAL">Normal</option>
                <option value="URGENT">Urgent</option>
                <option value="EMERGENCY">Emergency (STAT)</option>
              </select>
            </div>
          </div>

          <div className="responsive-grid-2">
            <div>
              <label className="form-label">Consultation Fee (Rs.)</label>
              <input
                type="number"
                className="input"
                value={visitFormData.customFee}
                onChange={(e) => setVisitFormData({ ...visitFormData, customFee: e.target.value })}
                placeholder="Fee amount"
              />
            </div>
          </div>

          <div>
            <label className="form-label">Visit Reason / Clinical Notes</label>
            <textarea
              className="textarea"
              rows={2}
              value={visitFormData.notes}
              onChange={(e) => setVisitFormData({ ...visitFormData, notes: e.target.value })}
              placeholder="Presenting complaint or reception notes"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary">
              <CalendarClock size={16} />
              <span>{isSubmitting ? 'Creating...' : 'Issue Token & Generate Charge'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* A4 Vitals & Encounter Print Preview Modal */}
      <Modal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="A4 OPD Encounter & Vitals Assessment Sheet"
        maxWidth="950px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div
            style={{
              height: '75vh',
              maxHeight: '780px',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              backgroundColor: '#334155',
            }}
          >
            {printHtml ? (
              <iframe
                title="A4 Sheet Preview"
                srcDoc={printHtml}
                style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
              />
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Loading sheet preview...</div>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '0.75rem',
            }}
          >
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              📄 A4 format with left-aligned hospital branding and clinical consultation note section.
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="btn btn-secondary"
                disabled={isPrintingDirect}
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleExecuteDirectPrint}
                className="btn btn-primary"
                disabled={isPrintingDirect}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Printer size={16} />
                <span>{isPrintingDirect ? 'Sending to Printer...' : 'Print Now (A4)'}</span>
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
