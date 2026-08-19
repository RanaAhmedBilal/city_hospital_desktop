import React, { useState, useEffect } from 'react';
import { useActivePatientStore } from '../../stores/activePatientStore';
import { useAuthStore } from '../../stores/authStore';
import { invokeIpc } from '../../lib/ipc';
import {
  ConsultationDto,
  PrescriptionDto,
  PrescriptionItemDto,
  PrescriptionInvestigationDto,
  MedicineDto,
  InvestigationDto,
} from '../../../shared/types';
import { FoodRelation, ClinicalRecordStatus } from '../../../shared/constants/enums';
import { PrintPreviewModal } from '../../components/common/PrintPreviewModal';
import { Modal } from '../../components/common/Modal';
import {
  Stethoscope,
  Pill,
  FileCheck,
  Plus,
  Trash2,
  Printer,
  History,
  CheckCircle,
  AlertCircle,
  Clock,
  Edit,
  Sparkles,
} from 'lucide-react';

interface ConsultationPageProps {
  onNavigateToBilling: () => void;
}

export const ConsultationPage: React.FC<ConsultationPageProps> = ({ onNavigateToBilling }) => {
  const { patient, visit, setActiveVisit } = useActivePatientStore();
  const { user } = useAuthStore();

  // Consultation State
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [historyOfIllness, setHistoryOfIllness] = useState('');
  const [pastHistory, setPastHistory] = useState('');
  const [examination, setExamination] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [advice, setAdvice] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [consultationStatus, setConsultationStatus] = useState<ClinicalRecordStatus>(ClinicalRecordStatus.DRAFT);
  const [consultationId, setConsultationId] = useState<string | null>(null);

  // Prescription State
  const [prescriptionId, setPrescriptionId] = useState<string | null>(null);
  const [prescriptionNo, setPrescriptionNo] = useState<string | null>(null);
  const [rxStatus, setRxStatus] = useState<ClinicalRecordStatus>(ClinicalRecordStatus.DRAFT);
  const [rxVersion, setRxVersion] = useState(1);
  const [rxItems, setRxItems] = useState<PrescriptionItemDto[]>([]);
  const [advisedInvestigations, setAdvisedInvestigations] = useState<PrescriptionInvestigationDto[]>([]);

  // Master Data Catalogs for autocomplete
  const [medicinesMaster, setMedicinesMaster] = useState<MedicineDto[]>([]);
  const [investigationsMaster, setInvestigationsMaster] = useState<InvestigationDto[]>([]);

  // Modals & Feedback
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [printModal, setPrintModal] = useState<{ open: boolean; title: string; html: string }>({
    open: false,
    title: '',
    html: '',
  });

  // Amendment Modal State
  const [isAmendModalOpen, setIsAmendModalOpen] = useState(false);
  const [amendReason, setAmendReason] = useState('');

  // Past History Accordion
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    loadMasters();
    if (visit) {
      loadEncounterClinicalData();
    }
  }, [visit]);

  const loadMasters = async () => {
    try {
      const [medsRes, invRes] = await Promise.all([
        invokeIpc<MedicineDto[]>('medicines:search', { limit: 100 }),
        invokeIpc<InvestigationDto[]>('investigations:search', { limit: 100 }),
      ]);
      if (medsRes.success && medsRes.data) setMedicinesMaster(medsRes.data);
      if (invRes.success && invRes.data) setInvestigationsMaster(invRes.data);
    } catch (err) {}
  };

  const loadEncounterClinicalData = async () => {
    if (!visit) return;
    try {
      const [cRes, rxRes] = await Promise.all([
        invokeIpc<ConsultationDto>('consultations:get-by-visit', { visitId: visit.id }),
        invokeIpc<PrescriptionDto>('prescriptions:get-by-visit', { visitId: visit.id }),
      ]);

      if (cRes.success && cRes.data) {
        setConsultationId(cRes.data.id);
        setChiefComplaint(cRes.data.chiefComplaint);
        setHistoryOfIllness(cRes.data.historyOfPresentIllness || '');
        setPastHistory(cRes.data.pastMedicalHistory || '');
        setExamination(cRes.data.physicalExamination || '');
        setDiagnosis(cRes.data.diagnosis);
        setClinicalNotes(cRes.data.clinicalNotes || '');
        setAdvice(cRes.data.advice || '');
        setFollowUpDate(cRes.data.followUpDate || '');
        setConsultationStatus(cRes.data.status);
      }

      if (rxRes.success && rxRes.data) {
        setPrescriptionId(rxRes.data.id);
        setPrescriptionNo(rxRes.data.prescriptionNo);
        setRxStatus(rxRes.data.status);
        setRxVersion(rxRes.data.version);
        setRxItems(rxRes.data.items || []);
        setAdvisedInvestigations(rxRes.data.investigations || []);
      }
    } catch (err) {
      console.error('Failed to load consultation:', err);
    }
  };

  // Medicine Item handlers
  const handleAddMedicineRow = () => {
    const newItem: PrescriptionItemDto = {
      medicineName: '',
      genericName: '',
      strength: '',
      dosageForm: 'Tablet',
      dose: '1 Tab',
      frequency: '1-0-1 (BD)',
      route: 'Oral',
      duration: '5 Days',
      foodRelation: FoodRelation.AFTER_FOOD,
      instructions: '',
      sortOrder: rxItems.length,
    };
    setRxItems([...rxItems, newItem]);
  };

  const handleSelectPredefinedMedicine = (idx: number, medId: string) => {
    const med = medicinesMaster.find((m) => m.id === medId);
    if (!med) return;
    const updated = [...rxItems];
    updated[idx] = {
      ...updated[idx],
      medicineId: med.id,
      medicineName: med.brandName,
      genericName: med.genericName,
      strength: med.strength,
      dosageForm: med.dosageForm,
      dose: med.defaultDosage || updated[idx].dose,
      frequency: med.defaultFrequency || updated[idx].frequency,
      route: med.defaultRoute || updated[idx].route,
      duration: med.defaultDuration || updated[idx].duration,
    };
    setRxItems(updated);
  };

  const handleUpdateMedicineRow = (idx: number, field: keyof PrescriptionItemDto, value: any) => {
    const updated = [...rxItems];
    updated[idx] = { ...updated[idx], [field]: value };
    setRxItems(updated);
  };

  const handleRemoveMedicineRow = (idx: number) => {
    setRxItems(rxItems.filter((_, i) => i !== idx));
  };

  // Investigation handlers
  const handleAddInvestigation = (invId: string) => {
    const inv = investigationsMaster.find((i) => i.id === invId);
    if (!inv) return;
    if (advisedInvestigations.some((i) => i.investigationId === inv.id || i.investigationName === inv.name)) return;

    setAdvisedInvestigations([
      ...advisedInvestigations,
      {
        investigationId: inv.id,
        investigationName: inv.name,
        instructions: '',
        sortOrder: advisedInvestigations.length,
      },
    ]);
  };

  const handleRemoveInvestigation = (idx: number) => {
    setAdvisedInvestigations(advisedInvestigations.filter((_, i) => i !== idx));
  };

  // Save / Finalize Handler
  const handleSaveClinicalEncounter = async (isFinalize: boolean) => {
    if (!patient || !visit) {
      setErrorMsg('No active visit encounter.');
      return;
    }
    if (!diagnosis.trim()) {
      setErrorMsg('Diagnosis is mandatory before saving or finalising.');
      return;
    }
    if (!chiefComplaint.trim()) {
      setErrorMsg('Chief complaint is required.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // 1. Save Consultation
      const consultPayload = {
        visitId: visit.id,
        patientId: patient.id,
        doctorId: visit.doctorId,
        chiefComplaint,
        historyOfPresentIllness: historyOfIllness,
        pastMedicalHistory: pastHistory,
        physicalExamination: examination,
        diagnosis,
        clinicalNotes,
        advice,
        followUpDate: followUpDate || null,
        isFinalized: isFinalize,
      };

      const cRes = await invokeIpc<ConsultationDto>('consultations:save', consultPayload);
      if (!cRes.success) throw new Error(cRes.error);
      setConsultationId(cRes.data!.id);
      setConsultationStatus(cRes.data!.status);

      // 2. Save Prescription
      const rxPayload = {
        visitId: visit.id,
        patientId: patient.id,
        doctorId: visit.doctorId,
        consultationId: cRes.data!.id,
        diagnosis,
        clinicalNotes,
        advice,
        followUpDate: followUpDate || null,
        isFinalized: isFinalize,
        items: rxItems,
        investigations: advisedInvestigations,
      };

      const rxRes = await invokeIpc<PrescriptionDto>('prescriptions:save', rxPayload);
      if (!rxRes.success) throw new Error(rxRes.error);
      setPrescriptionId(rxRes.data!.id);
      setPrescriptionNo(rxRes.data!.prescriptionNo);
      setRxStatus(rxRes.data!.status);

      if (isFinalize) {
        setSuccessMsg(`Prescription ${rxRes.data!.prescriptionNo} finalized successfully!`);
        setActiveVisit({ ...visit, status: 'CONSULTATION_COMPLETED' as any });
      } else {
        setSuccessMsg('Consultation and prescription draft saved.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save clinical encounter.');
    } finally {
      setSaving(false);
    }
  };

  // Amendment Handler
  const handleAmendPrescription = async () => {
    if (!prescriptionId || !amendReason.trim()) {
      setErrorMsg('Detailed amendment reason is required.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        prescriptionId,
        reason: amendReason.trim(),
        diagnosis,
        clinicalNotes,
        advice,
        followUpDate: followUpDate || null,
        items: rxItems,
        investigations: advisedInvestigations,
      };

      const res = await invokeIpc<PrescriptionDto>('prescriptions:amend', payload);
      if (res.success && res.data) {
        setRxStatus(res.data.status);
        setRxVersion(res.data.version);
        setIsAmendModalOpen(false);
        setAmendReason('');
        setSuccessMsg(`Prescription amended successfully to version v${res.data.version}.`);
      } else {
        setErrorMsg(res.error || 'Failed to amend prescription.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating amendment.');
    } finally {
      setSaving(false);
    }
  };

  const handlePrintPrescription = async () => {
    if (!prescriptionId && !visit) return;
    try {
      const res = await invokeIpc<string>('print:get-prescription-html', {
        prescriptionId: prescriptionId || visit?.id,
      });
      if (res.success && res.data) {
        setPrintModal({
          open: true,
          title: `A4 Prescription - ${patient?.fullName} (${prescriptionNo || 'Draft'})`,
          html: res.data,
        });
      }
    } catch (err) {
      console.error('Print Rx error:', err);
    }
  };

  if (!patient || !visit) {
    return (
      <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
        <Stethoscope size={40} color="var(--primary-400)" style={{ margin: '0 auto 1rem' }} />
        <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>No Active Consultation Selected</h3>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '450px', margin: '0 auto' }}>
          Select a patient from the OPD Queue with vitals recorded to launch the Doctor Consultation & Prescription station.
        </p>
      </div>
    );
  }

  const isFinalized = rxStatus === ClinicalRecordStatus.FINALIZED || rxStatus === ClinicalRecordStatus.AMENDED;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Action Toolbar Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h2 style={{ fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Stethoscope size={22} color="var(--primary-400)" />
            <span>Doctor Clinical Consultation</span>
          </h2>
          {prescriptionNo && (
            <span className="badge badge-purple">
              {prescriptionNo} (v{rxVersion})
            </span>
          )}
          <span className={`badge ${isFinalized ? 'badge-emerald' : 'badge-amber'}`}>
            {isFinalized ? 'Finalized' : 'Draft'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button onClick={() => setShowHistory(!showHistory)} className="btn btn-secondary btn-sm">
            <History size={14} />
            <span>{showHistory ? 'Hide History' : 'Review History'}</span>
          </button>

          {(prescriptionId || isFinalized) && (
            <button onClick={handlePrintPrescription} className="btn btn-secondary btn-sm">
              <Printer size={14} />
              <span>A4 Print Preview</span>
            </button>
          )}

          {!isFinalized ? (
            <>
              <button
                onClick={() => handleSaveClinicalEncounter(false)}
                disabled={saving}
                className="btn btn-secondary btn-sm"
              >
                Save Draft
              </button>
              <button
                onClick={() => handleSaveClinicalEncounter(true)}
                disabled={saving}
                className="btn btn-primary btn-sm"
              >
                <FileCheck size={15} />
                <span>Finalize Prescription</span>
              </button>
            </>
          ) : (
            <button onClick={() => setIsAmendModalOpen(true)} className="btn btn-secondary btn-sm">
              <Edit size={14} />
              <span>Amend Finalized Rx</span>
            </button>
          )}

          <button onClick={onNavigateToBilling} className="btn btn-secondary btn-sm">
            <span>Proceed to Billing</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid var(--accent-rose)', color: '#fda4af', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div style={{ background: 'rgba(52, 211, 153, 0.15)', border: '1px solid var(--accent-emerald)', color: '#6ee7b7', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <CheckCircle size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Vitals Summary Strip from Nurse */}
      {visit.latestVitals && (
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.5rem 1rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1.25rem',
          fontSize: '0.825rem',
          color: 'var(--text-secondary)',
        }}>
          <div><strong style={{ color: '#f43f5e' }}>BP:</strong> {visit.latestVitals.systolicBp && visit.latestVitals.diastolicBp ? `${visit.latestVitals.systolicBp}/${visit.latestVitals.diastolicBp} mmHg` : '—'}</div>
          <div><strong style={{ color: 'var(--primary-400)' }}>Pulse:</strong> {visit.latestVitals.pulse ? `${visit.latestVitals.pulse} bpm` : '—'}</div>
          <div><strong style={{ color: '#fbbf24' }}>Temp:</strong> {visit.latestVitals.temperature ? `${visit.latestVitals.temperature} °F` : '—'}</div>
          <div><strong style={{ color: '#38bdf8' }}>SpO2:</strong> {visit.latestVitals.spo2 ? `${visit.latestVitals.spo2}%` : '—'}</div>
          <div><strong>Weight:</strong> {visit.latestVitals.weight ? `${visit.latestVitals.weight} kg` : '—'}</div>
          <div><strong>BMI:</strong> <span style={{ color: 'var(--primary-400)', fontWeight: 700 }}>{visit.latestVitals.bmi ? `${visit.latestVitals.bmi} kg/m²` : '—'}</span></div>
          {visit.latestVitals.bloodGlucose && <div><strong>Glucose:</strong> {visit.latestVitals.bloodGlucose} mg/dL</div>}
        </div>
      )}

      {/* Consultation Clinical Notes Form */}
      <div className="card">
        <h3 style={{ fontSize: '1.05rem', marginBottom: '0.75rem', color: 'var(--primary-400)' }}>1. Clinical Findings & Diagnosis</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label className="form-label">Chief Complaint *</label>
            <textarea
              className="textarea"
              rows={2}
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              placeholder="e.g. Fever with chills for 3 days, dry cough"
              disabled={isFinalized}
              required
            />
          </div>

          <div>
            <label className="form-label">Provisional / Final Diagnosis *</label>
            <textarea
              className="textarea"
              rows={2}
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="e.g. Upper Respiratory Tract Infection (URTI) / Bronchitis"
              disabled={isFinalized}
              style={{ fontWeight: 600 }}
              required
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          <div>
            <label className="form-label">History of Present Illness</label>
            <textarea
              className="textarea"
              rows={2}
              value={historyOfIllness}
              onChange={(e) => setHistoryOfIllness(e.target.value)}
              placeholder="Onset, duration, progression, aggravating factors"
              disabled={isFinalized}
            />
          </div>

          <div>
            <label className="form-label">Physical Examination</label>
            <textarea
              className="textarea"
              rows={2}
              value={examination}
              onChange={(e) => setExamination(e.target.value)}
              placeholder="Chest clear, S1S2 audible, throat congested"
              disabled={isFinalized}
            />
          </div>

          <div>
            <label className="form-label">General Advice & Dietary Instructions</label>
            <textarea
              className="textarea"
              rows={2}
              value={advice}
              onChange={(e) => setAdvice(e.target.value)}
              placeholder="Bed rest, steam inhalation, plenty of warm fluids"
              disabled={isFinalized}
            />
          </div>
        </div>

        <div style={{ marginTop: '0.75rem', maxWidth: '300px' }}>
          <label className="form-label">Next Follow-Up Date</label>
          <input
            type="date"
            className="input"
            value={followUpDate}
            onChange={(e) => setFollowUpDate(e.target.value)}
            disabled={isFinalized}
          />
        </div>
      </div>

      {/* Prescription Rx Medicines Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 style={{ fontSize: '1.05rem', color: 'var(--primary-400)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Pill size={18} />
            <span>2. Prescribed Medications (Rx)</span>
          </h3>

          {!isFinalized && (
            <button onClick={handleAddMedicineRow} className="btn btn-secondary btn-sm">
              <Plus size={14} />
              <span>Add Medicine Item</span>
            </button>
          )}
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>#</th>
                <th style={{ width: '220px' }}>Medicine (Search/Custom)</th>
                <th style={{ width: '100px' }}>Form</th>
                <th style={{ width: '100px' }}>Dose</th>
                <th style={{ width: '110px' }}>Frequency</th>
                <th style={{ width: '90px' }}>Route</th>
                <th style={{ width: '90px' }}>Duration</th>
                <th>Meal / Food Relation</th>
                {!isFinalized && <th style={{ width: '50px' }}>Action</th>}
              </tr>
            </thead>
            <tbody>
              {rxItems.length > 0 ? (
                rxItems.map((item, idx) => (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td>
                      {!isFinalized ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <select
                            className="select"
                            value={item.medicineId || ''}
                            onChange={(e) => handleSelectPredefinedMedicine(idx, e.target.value)}
                            style={{ fontSize: '0.75rem', padding: '0.2rem' }}
                          >
                            <option value="">Quick pick from master...</option>
                            {medicinesMaster.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.brandName} ({m.strength}) — {m.genericName}
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            className="input"
                            value={item.medicineName}
                            onChange={(e) => handleUpdateMedicineRow(idx, 'medicineName', e.target.value)}
                            placeholder="Medicine brand name"
                            style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem', fontWeight: 600 }}
                          />
                        </div>
                      ) : (
                        <div>
                          <div style={{ fontWeight: 700 }}>{item.medicineName} {item.strength ? `(${item.strength})` : ''}</div>
                          {item.genericName && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{item.genericName}</div>}
                        </div>
                      )}
                    </td>
                    <td>
                      {!isFinalized ? (
                        <input
                          type="text"
                          className="input"
                          value={item.dosageForm || ''}
                          onChange={(e) => handleUpdateMedicineRow(idx, 'dosageForm', e.target.value)}
                          placeholder="Tab/Cap"
                          style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                        />
                      ) : (
                        item.dosageForm
                      )}
                    </td>
                    <td>
                      {!isFinalized ? (
                        <input
                          type="text"
                          className="input"
                          value={item.dose}
                          onChange={(e) => handleUpdateMedicineRow(idx, 'dose', e.target.value)}
                          placeholder="1 Tab"
                          style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                        />
                      ) : (
                        item.dose
                      )}
                    </td>
                    <td>
                      {!isFinalized ? (
                        <input
                          type="text"
                          className="input"
                          value={item.frequency}
                          onChange={(e) => handleUpdateMedicineRow(idx, 'frequency', e.target.value)}
                          placeholder="1-0-1"
                          style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                        />
                      ) : (
                        item.frequency
                      )}
                    </td>
                    <td>
                      {!isFinalized ? (
                        <input
                          type="text"
                          className="input"
                          value={item.route}
                          onChange={(e) => handleUpdateMedicineRow(idx, 'route', e.target.value)}
                          placeholder="Oral"
                          style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                        />
                      ) : (
                        item.route
                      )}
                    </td>
                    <td>
                      {!isFinalized ? (
                        <input
                          type="text"
                          className="input"
                          value={item.duration}
                          onChange={(e) => handleUpdateMedicineRow(idx, 'duration', e.target.value)}
                          placeholder="5 Days"
                          style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                        />
                      ) : (
                        item.duration
                      )}
                    </td>
                    <td>
                      {!isFinalized ? (
                        <select
                          className="select"
                          value={item.foodRelation}
                          onChange={(e) => handleUpdateMedicineRow(idx, 'foodRelation', e.target.value as FoodRelation)}
                          style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                        >
                          <option value="AFTER_FOOD">After Food (PC)</option>
                          <option value="BEFORE_FOOD">Before Food (AC)</option>
                          <option value="WITH_FOOD">With Food</option>
                          <option value="EMPTY_STOMACH">Empty Stomach</option>
                          <option value="NO_RESTRICTION">No Restriction</option>
                        </select>
                      ) : (
                        item.foodRelation
                      )}
                    </td>
                    {!isFinalized && (
                      <td>
                        <button
                          onClick={() => handleRemoveMedicineRow(idx)}
                          className="btn btn-danger btn-sm"
                          style={{ padding: '0.25rem 0.4rem' }}
                          title="Remove item"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>
                    No medicines added yet. Click "Add Medicine Item" or select from catalog.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Advised Investigations (Master Selector - No Lab Workflow) */}
      <div className="card">
        <h3 style={{ fontSize: '1.05rem', marginBottom: '0.75rem', color: 'var(--primary-400)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={18} />
          <span>3. Doctor-Advised Investigations & Diagnostics</span>
        </h3>

        {!isFinalized && (
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <select
              className="select"
              onChange={(e) => {
                if (e.target.value) handleAddInvestigation(e.target.value);
                e.target.value = '';
              }}
              style={{ maxWidth: '350px' }}
            >
              <option value="">Select Investigation to Prescribe...</option>
              {investigationsMaster.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  [{inv.category}] {inv.name}
                </option>
              ))}
            </select>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
              Select tests to advise the patient.
            </span>
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {advisedInvestigations.length > 0 ? (
            advisedInvestigations.map((inv, idx) => (
              <div
                key={inv.investigationId || idx}
                style={{
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.4rem 0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.85rem',
                  color: '#e0f2fe',
                }}
              >
                <span><strong>#{idx + 1}</strong> {inv.investigationName}</span>
                {!isFinalized && (
                  <button
                    onClick={() => handleRemoveInvestigation(idx)}
                    style={{ background: 'none', border: 'none', color: '#fda4af', cursor: 'pointer' }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No laboratory or radiological tests requested.
            </div>
          )}
        </div>
      </div>

      {/* Amendment Modal */}
      <Modal isOpen={isAmendModalOpen} onClose={() => setIsAmendModalOpen(false)} title="Amend Finalized Prescription" maxWidth="550px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            This prescription is currently finalized. Amending it will create a new version (v{rxVersion + 1}), preserving the complete audit history of previous versions.
          </p>

          <div>
            <label className="form-label">Clinical Amendment Justification *</label>
            <textarea
              className="textarea"
              rows={3}
              value={amendReason}
              onChange={(e) => setAmendReason(e.target.value)}
              placeholder="e.g. Dosage modified due to patient tolerance / Drug substitution"
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button onClick={() => setIsAmendModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button onClick={handleAmendPrescription} disabled={saving} className="btn btn-primary">
              <span>{saving ? 'Creating Amendment...' : 'Authorize & Create New Version'}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Print Preview Modal */}
      <PrintPreviewModal
        isOpen={printModal.open}
        onClose={() => setPrintModal({ open: false, title: '', html: '' })}
        title={printModal.title}
        htmlContent={printModal.html}
      />
    </div>
  );
};
