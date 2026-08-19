import React, { useEffect, useState } from 'react';
import { invokeIpc } from '../../lib/ipc';
import { useActivePatientStore } from '../../stores/activePatientStore';
import { BloodGroup, BloodGroupLabels } from '../../../shared/constants/enums';
import { PrintPreviewModal } from '../../components/common/PrintPreviewModal';
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

  // Print Preview
  const [printModal, setPrintModal] = useState<{ open: boolean; title: string; html: string }>({
    open: false,
    title: '',
    html: '',
  });

  const { setActivePatient } = useActivePatientStore();

  useEffect(() => {
    loadPatientData();
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
      <div style={{ padding: '3rem', textAlign: 'center', color: '#fda4af' }}>
        Patient record not found.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={onBack} className="btn btn-secondary btn-sm">
          <ArrowLeft size={16} />
          <span>Back to Directory</span>
        </button>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <span className="badge badge-emerald">Permanent Record</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Registered: {new Date(patient.registrationDate).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Patient Master Demographics Card */}
      <div className="card" style={{ background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h2 style={{ fontSize: '1.5rem', color: '#f8fafc' }}>{patient.fullName}</h2>
              <span className="badge badge-blue">MRN: {patient.mrn}</span>
            </div>
            {patient.guardianName && (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Guardian: {patient.guardianName}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem 1.5rem', fontSize: '0.85rem' }}>
            <div>
              <div style={{ color: 'var(--text-muted)' }}>Age / Gender</div>
              <div style={{ fontWeight: 700 }}>{patient.age ? `${patient.age} yrs` : '—'} / {patient.gender}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)' }}>Blood Group</div>
              <div style={{ fontWeight: 700 }}>{(patient.bloodGroup && BloodGroupLabels[patient.bloodGroup as BloodGroup]) || patient.bloodGroup || '—'}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)' }}>Phone</div>
              <div style={{ fontWeight: 700 }}>{patient.phone}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)' }}>NIC / CNIC</div>
              <div style={{ fontWeight: 700 }}>{patient.nic || '—'}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)' }}>Panel / Corporate</div>
              <div style={{ fontWeight: 700, color: 'var(--primary-400)' }}>
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
              <div key={v.id} className="card" style={{ borderLeft: '4px solid var(--primary-500)' }}>
                {/* Visit Header */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingBottom: '0.75rem',
                  borderBottom: '1px solid var(--border-subtle)',
                  marginBottom: '0.75rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontWeight: 800, color: 'var(--primary-400)' }}>#{v.tokenNumber}</span>
                    <span style={{ fontWeight: 700, fontSize: '1rem' }}>Visit {v.visitNumber}</span>
                    <span className="badge badge-slate">{v.visitType.replace('_', ' ')}</span>
                    <span className="badge badge-emerald">{v.status}</span>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {new Date(v.visitDateTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Dr. {v.doctor?.name} ({v.department?.name})
                    </div>
                  </div>
                </div>

                {/* Vitals Strip */}
                {vitals && (
                  <div style={{
                    background: 'var(--bg-surface-elevated)',
                    padding: '0.5rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8rem',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    marginBottom: '0.75rem',
                  }}>
                    <div><strong>BP:</strong> {vitals.systolicBp}/{vitals.diastolicBp} mmHg</div>
                    <div><strong>Pulse:</strong> {vitals.pulse} bpm</div>
                    <div><strong>Temp:</strong> {vitals.temperature} °F</div>
                    <div><strong>SpO2:</strong> {vitals.spo2}%</div>
                    <div><strong>Weight:</strong> {vitals.weight} kg</div>
                    <div><strong>Height:</strong> {vitals.height} cm</div>
                    <div><strong>BMI:</strong> {vitals.bmi} kg/m²</div>
                    {vitals.bloodGlucose && <div><strong>Glucose:</strong> {vitals.bloodGlucose} mg/dL</div>}
                  </div>
                )}

                {/* Clinical Notes & Diagnosis */}
                {consultation && (
                  <div style={{ marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '4px' }}>
                        <div style={{ color: 'var(--primary-400)', fontWeight: 700 }}>Chief Complaint:</div>
                        <div>{consultation.chiefComplaint}</div>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '4px' }}>
                        <div style={{ color: 'var(--primary-400)', fontWeight: 700 }}>Diagnosis:</div>
                        <div style={{ fontWeight: 700, color: '#f8fafc' }}>{consultation.diagnosis}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Prescriptions & Ordered Investigations */}
                {prescription && (
                  <div style={{
                    background: 'rgba(15, 118, 110, 0.08)',
                    border: '1px solid rgba(20, 184, 166, 0.2)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.75rem',
                    marginBottom: '0.75rem',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <div style={{ fontWeight: 700, color: 'var(--primary-400)', fontSize: '0.85rem' }}>
                        Prescription {prescription.prescriptionNo} (v{prescription.version})
                      </div>
                      <button
                        onClick={() => handlePrintPrescription(prescription.id)}
                        className="btn btn-secondary btn-sm"
                      >
                        <Printer size={13} />
                        <span>Print A4 Rx</span>
                      </button>
                    </div>

                    {/* Medicines List */}
                    <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {prescription.items?.map((it: any, idx: number) => (
                        <div key={it.id || idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-subtle)', paddingBottom: '2px' }}>
                          <span><strong>{it.medicineName}</strong> {it.strength ? `(${it.strength})` : ''} — {it.dose} ({it.frequency})</span>
                          <span style={{ color: 'var(--text-muted)' }}>{it.duration} • {it.foodRelation}</span>
                        </div>
                      ))}
                    </div>

                    {/* Advised Investigations */}
                    {prescription.investigations && prescription.investigations.length > 0 && (
                      <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: 'var(--accent-blue)' }}>
                        <strong>Investigations Requested:</strong> {prescription.investigations.map((i: any) => i.investigationName).join(', ')}
                      </div>
                    )}
                  </div>
                )}

                {/* Financial Summary */}
                {invoice && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(30, 41, 59, 0.5)',
                    padding: '0.5rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.85rem',
                  }}>
                    <div>
                      <span><strong>Invoice {invoice.invoiceNumber}:</strong> Total Rs. {Number(invoice.netTotal).toLocaleString()} • Paid: Rs. {Number(invoice.paidTotal).toLocaleString()}</span>
                      <span className={`badge ${invoice.status === 'PAID' ? 'badge-emerald' : 'badge-amber'}`} style={{ marginLeft: '8px' }}>
                        {invoice.status}
                      </span>
                    </div>

                    <button
                      onClick={() => handlePrintInvoice(invoice.id)}
                      className="btn btn-secondary btn-sm"
                    >
                      <Printer size={13} />
                      <span>Print A4 Slip</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
            No medical encounters recorded for this patient yet.
          </div>
        )}
      </div>

      {/* A4 Print Preview Modal */}
      <PrintPreviewModal
        isOpen={printModal.open}
        onClose={() => setPrintModal({ open: false, title: '', html: '' })}
        title={printModal.title}
        htmlContent={printModal.html}
      />
    </div>
  );
};
