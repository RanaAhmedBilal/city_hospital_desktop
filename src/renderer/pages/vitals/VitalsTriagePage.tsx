import React, { useState, useEffect } from 'react';
import { useActivePatientStore } from '../../stores/activePatientStore';
import { invokeIpc } from '../../lib/ipc';
import { VisitVitalsDto, VisitDto } from '../../../shared/types';
import { Modal } from '../../components/common/Modal';
import {
  Activity,
  Heart,
  Thermometer,
  Wind,
  Weight,
  Ruler,
  Droplet,
  CheckCircle,
  Check,
  AlertCircle,
  Clock,
  Printer,
  FileText,
  FlaskConical,
  Receipt,
  DollarSign,
} from 'lucide-react';

interface VitalsTriagePageProps {
  onNavigateToBilling: () => void;
  onNavigateToLab: () => void;
}

export const VitalsTriagePage: React.FC<VitalsTriagePageProps> = ({
  onNavigateToBilling,
  onNavigateToLab,
}) => {
  const { patient, visit, setActiveVisit } = useActivePatientStore();

  const [vitalsHistory, setVitalsHistory] = useState<VisitVitalsDto[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Print State
  const [printHtml, setPrintHtml] = useState<string | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isPrintingDirect, setIsPrintingDirect] = useState(false);

  const [formData, setFormData] = useState({
    temperature: '98.6',
    pulse: '76',
    respiratoryRate: '18',
    systolicBp: '120',
    diastolicBp: '80',
    spo2: '98',
    weight: '70',
    height: '175',
    bloodGlucose: '',
    glucoseType: 'RANDOM',
    painScore: '0',
    observations: '',
  });

  // Calculate BMI dynamically
  const heightM = parseFloat(formData.height) / 100;
  const weightKg = parseFloat(formData.weight);
  const computedBmi = heightM > 0 && weightKg > 0 ? (weightKg / (heightM * heightM)).toFixed(1) : '—';

  useEffect(() => {
    if (patient) {
      loadVitalsHistory();
    }
  }, [patient]);

  const loadVitalsHistory = async () => {
    if (!patient) return;
    setLoadingHistory(true);
    try {
      const res = await invokeIpc<VisitVitalsDto[]>('vitals:get-history', { patientId: patient.id });
      if (res.success && res.data) setVitalsHistory(res.data);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handlePrintVitalsSheet = async (targetVisitId?: string) => {
    const vId = targetVisitId || visit?.id;
    if (!vId) return;
    try {
      setIsPrintingDirect(true);
      const res = await invokeIpc<string>('print:get-vitals-sheet-html', { visitId: vId });
      if (res.success && res.data) {
        setPrintHtml(res.data);
        setIsPrintModalOpen(true);
      } else {
        setErrorMsg(res.error || 'Failed to generate A4 Vitals print sheet.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Print error.');
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
    } catch (err: any) {
      console.error('Direct print failed:', err);
    } finally {
      setIsPrintingDirect(false);
    }
  };

  const handleRecordVitals = async (e: React.FormEvent, shouldPrint: boolean = false) => {
    e.preventDefault();
    if (!patient || !visit) {
      setErrorMsg('Please select an active patient and visit encounter from the queue.');
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);

    try {
      const payload = {
        visitId: visit.id,
        patientId: patient.id,
        temperature: formData.temperature ? parseFloat(formData.temperature) : null,
        pulse: formData.pulse ? parseInt(formData.pulse, 10) : null,
        respiratoryRate: formData.respiratoryRate ? parseInt(formData.respiratoryRate, 10) : null,
        systolicBp: formData.systolicBp ? parseInt(formData.systolicBp, 10) : null,
        diastolicBp: formData.diastolicBp ? parseInt(formData.diastolicBp, 10) : null,
        spo2: formData.spo2 ? parseFloat(formData.spo2) : null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        height: formData.height ? parseFloat(formData.height) : null,
        bloodGlucose: formData.bloodGlucose ? parseFloat(formData.bloodGlucose) : null,
        glucoseType: formData.glucoseType || null,
        painScore: formData.painScore ? parseInt(formData.painScore, 10) : null,
        observations: formData.observations.trim() || null,
      };

      const res = await invokeIpc<VisitVitalsDto>('vitals:record', payload);
      if (res.success && res.data) {
        setSuccessMsg('Vitals saved! Consultation Bill is recorded as UNPAID (Pending Payment).');
        loadVitalsHistory();
        // Update active visit state
        setActiveVisit({ ...visit, status: 'VITALS_COMPLETED' as any, latestVitals: res.data });

        if (shouldPrint) {
          handlePrintVitalsSheet(visit.id);
        }
      } else {
        setErrorMsg(res.error || 'Failed to record vitals.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error recording vitals.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!patient || !visit) {
    return (
      <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
        <Activity size={40} color="var(--primary-400)" style={{ margin: '0 auto 1rem' }} />
        <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>No Active Encounter Selected</h3>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '450px', margin: '0 auto' }}>
          Please go to the OPD Queue or Patients directory, select a patient with an active visit, and then open the Triage / Vitals Station.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Vitals Entry Form Card */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={20} color="var(--primary-400)" />
              <span>Record Clinical Vitals — Token #{visit.tokenNumber}</span>
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Patient: <strong style={{ color: 'var(--text-primary)' }}>{patient.fullName}</strong> ({patient.mrn}) • Doctor: <strong style={{ color: 'var(--primary-400)' }}>{visit.doctorName || 'Attending Doctor'}</strong>
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => handlePrintVitalsSheet(visit.id)}
              className="btn btn-secondary btn-sm"
              disabled={isPrintingDirect}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Printer size={15} color="var(--primary-400)" />
              <span>Print A4 Triage Sheet</span>
            </button>

            <button onClick={onNavigateToLab} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <FlaskConical size={14} color="#38bdf8" />
              <span>Order Lab Tests</span>
            </button>

            <button onClick={onNavigateToBilling} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Receipt size={14} />
              <span>Billing Counter</span>
            </button>
          </div>
        </div>

        {errorMsg && (
          <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid var(--accent-rose)', color: '#fda4af', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem' }}>
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div style={{ background: 'rgba(52, 211, 153, 0.15)', border: '1.5px solid var(--accent-emerald)', color: '#6ee7b7', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.88rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
              <CheckCircle size={18} />
              <span><strong>{successMsg}</strong> Status: <span style={{ color: '#fbbf24', fontWeight: 800 }}>UNPAID (Pending Cashier)</span></span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={onNavigateToBilling} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <DollarSign size={14} />
                <span>Pay Consultation Bill</span>
              </button>
              <button onClick={onNavigateToLab} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <FlaskConical size={14} />
                <span>Order Lab Tests</span>
              </button>
            </div>
          </div>
        )}

        <form onSubmit={(e) => handleRecordVitals(e, true)} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Grid 1: Cardiovascular & Respiratory */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Heart size={14} color="#f43f5e" />
                <span>Systolic BP (mmHg)</span>
              </label>
              <input
                type="number"
                className="input"
                value={formData.systolicBp}
                onChange={(e) => setFormData({ ...formData, systolicBp: e.target.value })}
                placeholder="120"
                min="40"
                max="300"
              />
            </div>

            <div>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Heart size={14} color="#f43f5e" />
                <span>Diastolic BP (mmHg)</span>
              </label>
              <input
                type="number"
                className="input"
                value={formData.diastolicBp}
                onChange={(e) => setFormData({ ...formData, diastolicBp: e.target.value })}
                placeholder="80"
                min="20"
                max="200"
              />
            </div>

            <div>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Activity size={14} color="var(--primary-400)" />
                <span>Pulse Rate (bpm)</span>
              </label>
              <input
                type="number"
                className="input"
                value={formData.pulse}
                onChange={(e) => setFormData({ ...formData, pulse: e.target.value })}
                placeholder="76"
                min="20"
                max="300"
              />
            </div>

            <div>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Thermometer size={14} color="#fbbf24" />
                <span>Temperature (°F)</span>
              </label>
              <input
                type="number"
                step="0.1"
                className="input"
                value={formData.temperature}
                onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                placeholder="98.6"
                min="70"
                max="120"
              />
            </div>
          </div>

          {/* Grid 2: Respiratory & Anthropometrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Wind size={14} color="#38bdf8" />
                <span>Oxygen (SpO2 %)</span>
              </label>
              <input
                type="number"
                step="0.1"
                className="input"
                value={formData.spo2}
                onChange={(e) => setFormData({ ...formData, spo2: e.target.value })}
                placeholder="98"
                min="40"
                max="100"
              />
            </div>

            <div>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Wind size={14} color="#38bdf8" />
                <span>Resp. Rate (/min)</span>
              </label>
              <input
                type="number"
                className="input"
                value={formData.respiratoryRate}
                onChange={(e) => setFormData({ ...formData, respiratoryRate: e.target.value })}
                placeholder="18"
                min="5"
                max="100"
              />
            </div>

            <div>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Weight size={14} color="#a855f7" />
                <span>Weight (kg)</span>
              </label>
              <input
                type="number"
                step="0.1"
                className="input"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                placeholder="70"
                min="0.5"
                max="500"
              />
            </div>

            <div>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Ruler size={14} color="#a855f7" />
                <span>Height (cm) — BMI: <strong style={{ color: 'var(--primary-400)' }}>{computedBmi}</strong></span>
              </label>
              <input
                type="number"
                step="0.1"
                className="input"
                value={formData.height}
                onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                placeholder="175"
                min="20"
                max="300"
              />
            </div>
          </div>

          {/* Grid 3: Metabolic & Pain */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Droplet size={14} color="#ef4444" />
                <span>Blood Glucose (mg/dL)</span>
              </label>
              <input
                type="number"
                step="0.1"
                className="input"
                value={formData.bloodGlucose}
                onChange={(e) => setFormData({ ...formData, bloodGlucose: e.target.value })}
                placeholder="e.g. 110"
              />
            </div>

            <div>
              <label className="form-label">Glucose Sample Type</label>
              <select
                className="select"
                value={formData.glucoseType}
                onChange={(e) => setFormData({ ...formData, glucoseType: e.target.value })}
              >
                <option value="RANDOM">Random (BSR)</option>
                <option value="FASTING">Fasting (BSF)</option>
                <option value="POST_PRANDIAL">Post-Prandial (2hr PC)</option>
              </select>
            </div>

            <div>
              <label className="form-label">Pain Score (0 - 10)</label>
              <select
                className="select"
                value={formData.painScore}
                onChange={(e) => setFormData({ ...formData, painScore: e.target.value })}
              >
                <option value="0">0 - No Pain</option>
                <option value="1">1 - Very Mild</option>
                <option value="2">2 - Discomforting</option>
                <option value="3">3 - Tolerable</option>
                <option value="4">4 - Distressing</option>
                <option value="5">5 - Moderate</option>
                <option value="6">6 - Severe</option>
                <option value="7">7 - Very Severe</option>
                <option value="8">8 - Horrible</option>
                <option value="9">9 - Excruciating</option>
                <option value="10">10 - Unbearable</option>
              </select>
            </div>
          </div>

          <div>
            <label className="form-label">Clinical Observations / Chief Complaints</label>
            <textarea
              className="textarea"
              rows={2}
              value={formData.observations}
              onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
              placeholder="Patient posture, alert status, fever duration, pallor, cyanosis, edema, or triage findings..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              disabled={submitting}
              onClick={(e) => handleRecordVitals(e, false)}
              className="btn btn-secondary"
            >
              <Check size={16} />
              <span>{submitting ? 'Saving...' : 'Save Vitals Only'}</span>
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary btn-lg"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Printer size={17} />
              <span>{submitting ? 'Saving & Generating Sheet...' : 'Save & Print A4 Sheet'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Historical Vitals Trend */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={18} color="var(--primary-400)" />
            <span>Historical Vitals Log for {patient.fullName}</span>
          </h3>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Date / Time</th>
                <th>Blood Pressure</th>
                <th>Pulse</th>
                <th>Temp</th>
                <th>SpO2</th>
                <th>Weight</th>
                <th>Height</th>
                <th>BMI</th>
                <th>Glucose</th>
                <th>Pain</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {vitalsHistory.length > 0 ? (
                vitalsHistory.map((v) => (
                  <tr key={v.id}>
                    <td>{new Date(v.recordedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                    <td style={{ fontWeight: 700 }}>
                      {v.systolicBp && v.diastolicBp ? `${v.systolicBp}/${v.diastolicBp} mmHg` : '—'}
                    </td>
                    <td>{v.pulse ? `${v.pulse} bpm` : '—'}</td>
                    <td>{v.temperature ? `${v.temperature} °F` : '—'}</td>
                    <td>{v.spo2 ? `${v.spo2}%` : '—'}</td>
                    <td>{v.weight ? `${v.weight} kg` : '—'}</td>
                    <td>{v.height ? `${v.height} cm` : '—'}</td>
                    <td style={{ fontWeight: 700, color: 'var(--primary-400)' }}>{v.bmi ? `${v.bmi}` : '—'}</td>
                    <td>{v.bloodGlucose ? `${v.bloodGlucose} mg/dL` : '—'}</td>
                    <td>{v.painScore !== null ? `${v.painScore}/10` : '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => handlePrintVitalsSheet(v.visitId)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
                      >
                        <Printer size={12} />
                        <span>Print A4</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>
                    {loadingHistory ? 'Loading vitals history...' : 'No historical vitals found for this patient.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* A4 PRINT PREVIEW MODAL */}
      {/* ---------------------------------------------------- */}
      <Modal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title={`A4 OPD Encounter & Vitals Sheet — Token #${visit.tokenNumber}`}
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
                title="A4 Vitals Sheet Preview"
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
              📄 Ready for direct A4 thermal or laser printer output with left-aligned hospital header.
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
