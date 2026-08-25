import React, { useEffect, useState } from 'react';
import { invokeIpc } from '../../lib/ipc';
import { useActivePatientStore } from '../../stores/activePatientStore';
import { BloodGroup, BloodGroupLabels } from '../../../shared/constants/enums';
import { PanelClientDto } from '../../../shared/types';
import { PrintPreviewModal } from '../../components/common/PrintPreviewModal';
import { Modal } from '../../components/common/Modal';
import {
  ArrowLeft,
  Calendar,
  Activity,
  Stethoscope,
  Pill,
  Receipt,
  Printer,
  Clock,
  Shield,
  FileCheck,
  Edit2,
  AlertCircle,
  Check,
} from 'lucide-react';

interface PatientProfilePageProps {
  patientId: string;
  onBack: () => void;
  onSelectVisitForConsultation: (visit: any) => void;
}

export const PatientProfilePage: React.FC<PatientProfilePageProps> = ({
  patientId,
  onBack,
  onSelectVisitForConsultation,
}) => {
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [panelClients, setPanelClients] = useState<PanelClientDto[]>([]);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    guardianName: '',
    age: '',
    gender: 'MALE',
    bloodGroup: 'UNKNOWN',
    phone: '',
    alternatePhone: '',
    address: '',
    city: 'Metropolis',
    nic: '',
    employeeId: '',
    panelClientId: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    notes: '',
  });

  // Print Preview
  const [printModal, setPrintModal] = useState<{ open: boolean; title: string; html: string }>({
    open: false,
    title: '',
    html: '',
  });

  const { setActivePatient } = useActivePatientStore();

  useEffect(() => {
    loadPatientData();
    loadPanelClients();
  }, [patientId]);

  const loadPatientData = async () => {
    setLoading(true);
    try {
      const res = await invokeIpc('patients:get-by-id', { id: patientId });
      if (res.success && res.data) {
        setPatient(res.data);
        setActivePatient(res.data);
      }
    } catch (err) {
      console.error('Failed to load patient profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPanelClients = async () => {
    try {
      const res = await invokeIpc<PanelClientDto[]>('config:get-panel-clients', { activeOnly: true });
      if (res.success && res.data) setPanelClients(res.data);
    } catch (err) {}
  };

  const handleOpenEditModal = () => {
    if (!patient) return;
    setFormData({
      fullName: patient.fullName || '',
      guardianName: patient.guardianName || '',
      age: patient.age != null ? String(patient.age) : '',
      gender: patient.gender || 'MALE',
      bloodGroup: patient.bloodGroup || 'UNKNOWN',
      phone: patient.phone || '',
      alternatePhone: patient.alternatePhone || '',
      address: patient.address || '',
      city: patient.city || 'Metropolis',
      nic: patient.nic || '',
      employeeId: patient.employeeId || '',
      panelClientId: patient.panelClientId || '',
      emergencyContactName: patient.emergencyContactName || '',
      emergencyContactPhone: patient.emergencyContactPhone || '',
      notes: patient.notes || '',
    });
    setFormError(null);
    setFormSuccess(null);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setIsSubmitting(true);

    try {
      const payload: any = {
        id: patient.id,
        fullName: formData.fullName.trim(),
        guardianName: formData.guardianName.trim() || undefined,
        age: formData.age ? parseInt(formData.age, 10) : undefined,
        gender: formData.gender,
        bloodGroup: formData.bloodGroup,
        phone: formData.phone.trim(),
        alternatePhone: formData.alternatePhone.trim() || undefined,
        address: formData.address.trim() || undefined,
        city: formData.city.trim() || undefined,
        nic: formData.nic.trim() || undefined,
        employeeId: formData.employeeId.trim() || undefined,
        panelClientId: formData.panelClientId || undefined,
        emergencyContactName: formData.emergencyContactName.trim() || undefined,
        emergencyContactPhone: formData.emergencyContactPhone.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      };

      const res = await invokeIpc<any>('patients:update', payload);
      if (res.success && res.data) {
        setFormSuccess('Patient demographics updated successfully!');
        setTimeout(() => {
          setIsEditModalOpen(false);
          loadPatientData();
        }, 1200);
      } else {
        setFormError(res.error || 'Failed to update patient demographics.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Update failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintPrescription = async (prescriptionId: string) => {
    try {
      const res = await invokeIpc<string>('print:get-prescription-html', { prescriptionId });
      if (res.success && res.data) {
        setPrintModal({
          open: true,
          title: `A4 Prescription - ${patient.fullName}`,
          html: res.data,
        });
      }
    } catch (err) {
      console.error('Failed to print Rx:', err);
    }
  };

  const handlePrintInvoice = async (invoiceId: string) => {
    try {
      const res = await invokeIpc<string>('print:get-invoice-html', { invoiceId });
      if (res.success && res.data) {
        setPrintModal({
          open: true,
          title: `A4 Billing Slip - ${patient.fullName}`,
          html: res.data,
        });
      }
    } catch (err) {
      console.error('Failed to print invoice:', err);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading comprehensive medical history...
      </div>
    );
  }

  if (!patient) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Patient record not found.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <button onClick={onBack} className="btn btn-secondary btn-sm">
          <ArrowLeft size={16} />
          <span>Back to Directory</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={handleOpenEditModal} className="btn btn-secondary btn-sm">
            <Edit2 size={14} />
            <span>Edit Demographics</span>
          </button>
          <span className="badge badge-emerald">Permanent Record</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Registered: {new Date(patient.registrationDate).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Patient Master Demographics Card */}
      <div className="card" style={{ background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)', color: '#f8fafc' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h2 style={{ fontSize: '1.5rem', color: '#ffffff', fontWeight: 800 }}>{patient.fullName}</h2>
              <span className="badge badge-blue">MRN: {patient.mrn}</span>
            </div>
            {patient.guardianName && (
              <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: '2px' }}>
                Guardian: {patient.guardianName}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem 1.5rem', fontSize: '0.85rem' }}>
            <div>
              <div style={{ color: '#94a3b8', fontWeight: 500 }}>Age / Gender</div>
              <div style={{ fontWeight: 700, color: '#f8fafc' }}>{patient.age ? `${patient.age} yrs` : '—'} / {patient.gender}</div>
            </div>
            <div>
              <div style={{ color: '#94a3b8', fontWeight: 500 }}>Blood Group</div>
              <div style={{ fontWeight: 700, color: '#f8fafc' }}>{(patient.bloodGroup && BloodGroupLabels[patient.bloodGroup as BloodGroup]) || patient.bloodGroup || '—'}</div>
            </div>
            <div>
              <div style={{ color: '#94a3b8', fontWeight: 500 }}>Phone</div>
              <div style={{ fontWeight: 700, color: '#f8fafc' }}>{patient.phone}</div>
            </div>
            <div>
              <div style={{ color: '#94a3b8', fontWeight: 500 }}>NIC / CNIC</div>
              <div style={{ fontWeight: 700, color: '#f8fafc' }}>{patient.nic || '—'}</div>
            </div>
            <div>
              <div style={{ color: '#94a3b8', fontWeight: 500 }}>Panel / Corporate</div>
              <div style={{ fontWeight: 700, color: '#2dd4bf' }}>
                {patient.panelClient?.name || 'Private / Self Pay'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Historical Encounters Timeline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock size={20} color="var(--primary-400)" />
          <span>Patient Encounters Timeline ({patient.visits?.length || 0} Visits)</span>
        </h3>

        {patient.visits && patient.visits.length > 0 ? (
          patient.visits.map((v: any) => {
            const vitals = v.vitals?.[0];
            const consultation = v.consultations?.[0];
            const prescription = v.prescriptions?.[0];
            const invoice = v.invoices?.[0];

            return (
              <div
                key={v.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  borderLeft: '4px solid var(--primary-500)',
                }}
              >
                {/* Visit Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontWeight: 800, color: 'var(--primary-400)', fontSize: '1rem' }}>
                      Token #{v.tokenNumber}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {new Date(v.visitDateTime).toLocaleString()}
                    </span>
                    <span className="badge badge-purple">{v.visitType}</span>
                    <span className={`badge ${v.status === 'COMPLETED' ? 'badge-emerald' : 'badge-slate'}`}>
                      {v.status}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {consultation && (
                      <button
                        onClick={() => onSelectVisitForConsultation(v)}
                        className="btn btn-secondary btn-sm"
                        title="Resume or Edit Consultation notes"
                      >
                        <Stethoscope size={14} />
                        <span>Open Clinical Note</span>
                      </button>
                    )}

                    {prescription && (
                      <button
                        onClick={() => handlePrintPrescription(prescription.id)}
                        className="btn btn-secondary btn-sm"
                        title="Print A4 Prescription"
                      >
                        <Printer size={14} />
                        <span>Print Rx</span>
                      </button>
                    )}

                    {invoice && (
                      <button
                        onClick={() => handlePrintInvoice(invoice.id)}
                        className="btn btn-secondary btn-sm"
                        title="Print Invoice Slip"
                      >
                        <Receipt size={14} />
                        <span>Print Bill</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Visit Summary Grid */}
                <div className="responsive-grid-4" style={{ fontSize: '0.85rem' }}>
                  {/* Doctor & Dept */}
                  <div style={{ background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '4px' }}>Attending Physician</div>
                    <div style={{ fontWeight: 700 }}>{v.doctor?.name || '—'}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{v.department?.name}</div>
                  </div>

                  {/* Vitals Summary */}
                  <div style={{ background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Activity size={12} color="#ec4899" />
                      <span>Vitals Summary</span>
                    </div>
                    {vitals ? (
                      <div style={{ fontWeight: 600 }}>
                        BP: {vitals.bpSystolic && vitals.bpDiastolic ? `${vitals.bpSystolic}/${vitals.bpDiastolic}` : '—'} | Pulse: {vitals.pulseRate || '—'}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>No vitals recorded</span>
                    )}
                  </div>

                  {/* Clinical Diagnosis / Chief Complaint */}
                  <div style={{ background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '4px' }}>Diagnosis / Chief Complaint</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {consultation?.primaryDiagnosis || consultation?.chiefComplaint || '—'}
                    </div>
                  </div>

                  {/* Billing Snapshot */}
                  <div style={{ background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '4px' }}>Invoice Status</div>
                    {invoice ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, color: 'var(--primary-400)' }}>Rs. {invoice.netTotal.toLocaleString()}</span>
                        <span className="badge badge-purple">{invoice.status}</span>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>Unbilled encounter</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="card" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No clinical visits or encounters recorded for this patient yet.
          </div>
        )}
      </div>

      {/* Edit Demographics Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Patient Demographics (${patient.mrn})`}
        maxWidth="700px"
      >
        <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {formError && (
            <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid var(--accent-rose)', color: '#fda4af', padding: '0.6rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <AlertCircle size={16} />
              <span>{formError}</span>
            </div>
          )}

          {formSuccess && (
            <div style={{ background: 'rgba(52, 211, 153, 0.15)', border: '1px solid var(--accent-emerald)', color: '#6ee7b7', padding: '0.6rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Check size={16} />
              <span>{formSuccess}</span>
            </div>
          )}

          <div className="responsive-grid-2">
            <div>
              <label className="form-label">Full Name *</label>
              <input
                type="text"
                className="input"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="e.g. Johnathan Doe"
                required
              />
            </div>

            <div>
              <label className="form-label">Father / Husband Name</label>
              <input
                type="text"
                className="input"
                value={formData.guardianName}
                onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                placeholder="Guardian name"
              />
            </div>
          </div>

          <div className="responsive-grid-3">
            <div>
              <label className="form-label">Age (Years) *</label>
              <input
                type="number"
                className="input"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                placeholder="e.g. 35"
                min="0"
                max="130"
                required
              />
            </div>

            <div>
              <label className="form-label">Gender *</label>
              <select
                className="select"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="form-label">Blood Group</label>
              <select
                className="select"
                value={formData.bloodGroup}
                onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
              >
                <option value="UNKNOWN">Unknown</option>
                <option value="A_POSITIVE">A+</option>
                <option value="A_NEGATIVE">A-</option>
                <option value="B_POSITIVE">B+</option>
                <option value="B_NEGATIVE">B-</option>
                <option value="AB_POSITIVE">AB+</option>
                <option value="AB_NEGATIVE">AB-</option>
                <option value="O_POSITIVE">O+</option>
                <option value="O_NEGATIVE">O-</option>
              </select>
            </div>
          </div>

          <div className="responsive-grid-2">
            <div>
              <label className="form-label">Primary Phone *</label>
              <input
                type="text"
                className="input"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="e.g. +1 555 019 2831"
                required
              />
            </div>

            <div>
              <label className="form-label">NIC / National ID (CNIC)</label>
              <input
                type="text"
                className="input"
                value={formData.nic}
                onChange={(e) => setFormData({ ...formData, nic: e.target.value })}
                placeholder="e.g. 42101-1234567-1"
              />
            </div>
          </div>

          <div className="responsive-grid-2">
            <div>
              <label className="form-label">Panel / Corporate Sponsor</label>
              <select
                className="select"
                value={formData.panelClientId}
                onChange={(e) => setFormData({ ...formData, panelClientId: e.target.value })}
              >
                <option value="">None (Private / Self Pay)</option>
                {panelClients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.discountPercent}% Discount)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Employee ID (For Panel Patients)</label>
              <input
                type="text"
                className="input"
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                placeholder="Corporate Employee Badge #"
              />
            </div>
          </div>

          <div>
            <label className="form-label">Residential Address</label>
            <input
              type="text"
              className="input"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Street address, apartment, locality"
            />
          </div>

          <div className="responsive-grid-2">
            <div>
              <label className="form-label">Emergency Contact Name</label>
              <input
                type="text"
                className="input"
                value={formData.emergencyContactName}
                onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                placeholder="Name of relative / next of kin"
              />
            </div>

            <div>
              <label className="form-label">Emergency Contact Phone</label>
              <input
                type="text"
                className="input"
                value={formData.emergencyContactPhone}
                onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                placeholder="Emergency contact phone"
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <button type="button" onClick={() => setIsEditModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary">
              <Edit2 size={16} />
              <span>{isSubmitting ? 'Updating...' : 'Save Demographics Changes'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* A4 Print Modal */}
      <PrintPreviewModal
        isOpen={printModal.open}
        onClose={() => setPrintModal({ ...printModal, open: false })}
        title={printModal.title}
        htmlContent={printModal.html}
      />
    </div>
  );
};
