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
  Search,
  User,
  Users,
  ShieldAlert,
  Zap,
  Sparkles,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';

interface VitalsTriagePageProps {
  onNavigateToBilling: () => void;
  onNavigateToLab: () => void;
}

export const VitalsTriagePage: React.FC<VitalsTriagePageProps> = ({
  onNavigateToBilling,
  onNavigateToLab,
}) => {
  const { patient, visit, setActivePatient, setActiveVisit } = useActivePatientStore();

  // OPD Queue State
  const [queueVisits, setQueueVisits] = useState<VisitDto[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [queueSearch, setQueueSearch] = useState('');
  const [queueFilter, setQueueFilter] = useState<'ALL' | 'WAITING' | 'VITALS_COMPLETED'>('WAITING');
  const [sortBy, setSortBy] = useState<'TOKEN_ASC' | 'TOKEN_DESC' | 'TIME_ASC' | 'TIME_DESC' | 'PATIENT_NAME'>('TOKEN_ASC');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Vitals State
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
    avpu: 'ALERT',
    observations: '',
  });

  // Calculate BMI dynamically
  const heightM = parseFloat(formData.height) / 100;
  const weightKg = parseFloat(formData.weight);
  const computedBmi = heightM > 0 && weightKg > 0 ? (weightKg / (heightM * heightM)).toFixed(1) : '—';

  const getBmiCategory = (bmiVal: number) => {
    if (isNaN(bmiVal) || bmiVal <= 0) return '';
    if (bmiVal < 18.5) return 'Underweight';
    if (bmiVal < 25) return 'Normal Weight';
    if (bmiVal < 30) return 'Overweight';
    return 'Obese';
  };

  useEffect(() => {
    loadOpdQueue();
  }, []);

  useEffect(() => {
    if (patient) {
      loadVitalsHistory();
    }
  }, [patient]);

  const loadOpdQueue = async () => {
    setLoadingQueue(true);
    try {
      const res = await invokeIpc<VisitDto[]>('visits:get-all', {
        date: new Date().toISOString().split('T')[0],
      });
      if (res.success && res.data) {
        setQueueVisits(res.data);

        // Auto-select first waiting patient if no active patient is selected in store
        if (!visit && res.data.length > 0) {
          const waiting = res.data.find((v) => v.status === 'WAITING' || v.status === 'REGISTERED') || res.data[0];
          if (waiting && waiting.patient) {
            setActivePatient(waiting.patient, waiting);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch OPD queue:', err);
    } finally {
      setLoadingQueue(false);
    }
  };

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

  // Preset Normal Adult Vitals
  const handleLoadNormalPreset = () => {
    setFormData({
      temperature: '98.6',
      pulse: '76',
      respiratoryRate: '18',
      systolicBp: '120',
      diastolicBp: '80',
      spo2: '98',
      weight: formData.weight || '70',
      height: formData.height || '175',
      bloodGlucose: formData.bloodGlucose,
      glucoseType: formData.glucoseType,
      painScore: '0',
      avpu: 'ALERT',
      observations: formData.observations,
    });
  };

  // Evaluate Triage Level & Category
  const computeTriageCategory = () => {
    const sys = parseInt(formData.systolicBp, 10);
    const dia = parseInt(formData.diastolicBp, 10);
    const pulse = parseInt(formData.pulse, 10);
    const temp = parseFloat(formData.temperature);
    const spo2 = parseFloat(formData.spo2);
    const pain = parseInt(formData.painScore, 10);

    let critical = false;
    let urgent = false;
    let semiUrgent = false;

    if ((spo2 && spo2 < 90) || (sys && (sys > 180 || sys < 80)) || (pulse && (pulse > 130 || pulse < 45)) || (temp && temp > 103)) {
      critical = true;
    } else if ((spo2 && spo2 >= 90 && spo2 <= 94) || (sys && (sys >= 140 || sys <= 90)) || (temp && temp >= 101) || (pain && pain >= 7)) {
      urgent = true;
    } else if ((pain && pain >= 4) || (temp && temp >= 99.5)) {
      semiUrgent = true;
    }

    if (critical) {
      return {
        level: 'Level 1 — EMERGENCY / CRITICAL',
        color: '#f43f5e',
        bg: 'rgba(244, 63, 94, 0.15)',
        border: '#f43f5e',
        icon: ShieldAlert,
        desc: 'Immediate resuscitation required. High physiological risk.',
      };
    }
    if (urgent) {
      return {
        level: 'Level 2 — URGENT / HIGH RISK',
        color: '#f59e0b',
        bg: 'rgba(245, 158, 11, 0.15)',
        border: '#f59e0b',
        icon: AlertTriangle,
        desc: 'Rapid physician assessment needed. Vital signs abnormal.',
      };
    }
    if (semiUrgent) {
      return {
        level: 'Level 3 — SEMI-URGENT',
        color: '#38bdf8',
        bg: 'rgba(56, 189, 248, 0.12)',
        border: '#38bdf8',
        icon: Activity,
        desc: 'Standard consultation queue. Moderate discomfort.',
      };
    }
    return {
      level: 'Level 4 — ROUTINE / STABLE',
      color: '#34d399',
      bg: 'rgba(52, 211, 153, 0.12)',
      border: '#34d399',
      icon: CheckCircle,
      desc: 'Normal adult vital parameters. Ready for doctor OPD queue.',
    };
  };

  const triageCategory = computeTriageCategory();
  const TriageIcon = triageCategory.icon;

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
      setErrorMsg('Please select an active patient encounter from the OPD Queue.');
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
        setSuccessMsg(`Vitals recorded for ${patient.fullName}! Triage Level: ${triageCategory.level.split('—')[0]}.`);
        loadVitalsHistory();
        loadOpdQueue(); // Refresh queue list

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

  // Filter & Sort queue visits
  const filteredQueue = queueVisits.filter((v) => {
    if (queueFilter === 'WAITING' && v.status !== 'WAITING' && v.status !== 'REGISTERED') return false;
    if (queueFilter === 'VITALS_COMPLETED' && v.status !== 'VITALS_COMPLETED') return false;

    if (queueSearch) {
      const q = queueSearch.toLowerCase();
      const pName = v.patient?.fullName.toLowerCase() || '';
      const mrn = v.patient?.mrn.toLowerCase() || '';
      const tok = String(v.tokenNumber);
      return pName.includes(q) || mrn.includes(q) || tok.includes(q);
    }
    return true;
  });

  const sortedQueue = [...filteredQueue].sort((a, b) => {
    if (sortBy === 'TOKEN_ASC') return a.tokenNumber - b.tokenNumber;
    if (sortBy === 'TOKEN_DESC') return b.tokenNumber - a.tokenNumber;
    if (sortBy === 'TIME_ASC') return new Date(a.visitDateTime).getTime() - new Date(b.visitDateTime).getTime();
    if (sortBy === 'TIME_DESC') return new Date(b.visitDateTime).getTime() - new Date(a.visitDateTime).getTime();
    if (sortBy === 'PATIENT_NAME') return (a.patient?.fullName || '').localeCompare(b.patient?.fullName || '');
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sortedQueue.length / pageSize));
  const paginatedQueue = sortedQueue.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 340px) minmax(0, 1fr)', gap: '1.25rem', alignItems: 'start' }}>
      {/* ---------------------------------------------------- */}
      {/* LEFT PANEL: OPD PATIENT QUEUE DESK */}
      {/* ---------------------------------------------------- */}
      <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Users size={18} color="var(--primary-400)" />
            <span>OPD Queue Desk</span>
          </h3>
          <button onClick={loadOpdQueue} className="btn btn-secondary btn-sm" title="Refresh Queue">
            <RefreshCw size={13} className={loadingQueue ? 'spin' : ''} />
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ position: 'relative' }}>
          <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="input"
            style={{ paddingLeft: '2rem', fontSize: '0.8rem' }}
            placeholder="Search patient, MRN, token..."
            value={queueSearch}
            onChange={(e) => {
              setQueueSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '0.3rem', fontSize: '0.75rem' }}>
          <button
            onClick={() => {
              setQueueFilter('WAITING');
              setCurrentPage(1);
            }}
            className={`btn btn-sm ${queueFilter === 'WAITING' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1, padding: '0.3rem 0.2rem', fontSize: '0.72rem' }}
          >
            Awaiting ({queueVisits.filter((v) => v.status === 'WAITING' || v.status === 'REGISTERED').length})
          </button>

          <button
            onClick={() => {
              setQueueFilter('VITALS_COMPLETED');
              setCurrentPage(1);
            }}
            className={`btn btn-sm ${queueFilter === 'VITALS_COMPLETED' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1, padding: '0.3rem 0.2rem', fontSize: '0.72rem' }}
          >
            Vitals Done ({queueVisits.filter((v) => v.status === 'VITALS_COMPLETED').length})
          </button>

          <button
            onClick={() => {
              setQueueFilter('ALL');
              setCurrentPage(1);
            }}
            className={`btn btn-sm ${queueFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1, padding: '0.3rem 0.2rem', fontSize: '0.72rem' }}
          >
            All ({queueVisits.length})
          </button>
        </div>

        {/* Sort & Page Size Controls Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: '0.5rem', alignItems: 'center' }}>
          <select
            className="input"
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.4rem' }}
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as any);
              setCurrentPage(1);
            }}
          >
            <option value="TOKEN_ASC">Sort: Token (Low → High)</option>
            <option value="TOKEN_DESC">Sort: Token (High → Low)</option>
            <option value="TIME_ASC">Sort: Reg. Time (Oldest First)</option>
            <option value="TIME_DESC">Sort: Reg. Time (Newest First)</option>
            <option value="PATIENT_NAME">Sort: Patient Name (A-Z)</option>
          </select>

          <select
            className="input"
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.4rem' }}
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
          >
            <option value={5}>5 / page</option>
            <option value={10}>10 / page</option>
            <option value={20}>20 / page</option>
          </select>
        </div>

        {/* Queue List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minHeight: '300px' }}>
          {loadingQueue ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading OPD queue...</div>
          ) : paginatedQueue.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No patients found in queue filter.</div>
          ) : (
            paginatedQueue.map((v) => {
              const isSelected = visit?.id === v.id;
              const isDone = v.status === 'VITALS_COMPLETED';

              return (
                <div
                  key={v.id}
                  onClick={() => {
                    if (v.patient) setActivePatient(v.patient, v);
                  }}
                  style={{
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    background: isSelected ? 'rgba(56, 189, 248, 0.12)' : 'var(--bg-surface)',
                    border: isSelected ? '1.5px solid var(--primary-400)' : '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, background: isSelected ? 'var(--primary-400)' : 'rgba(255,255,255,0.1)', color: isSelected ? '#0f172a' : 'var(--text-primary)', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                      Token #{v.tokenNumber}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: isDone ? '#34d399' : '#fbbf24', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      {isDone ? <CheckCircle size={11} /> : <Clock size={11} />}
                      <span>{isDone ? 'Vitals Recorded' : 'Awaiting Vitals'}</span>
                    </span>
                  </div>

                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    {v.patient?.fullName || 'OPD Patient'}
                  </div>

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>MRN: {v.patient?.mrn || '—'}</span>
                    <span style={{ color: 'var(--primary-400)' }}>{v.doctorName || v.doctor?.name || 'Attending Doc'}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Bar */}
        {sortedQueue.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.6rem', fontSize: '0.75rem' }}>
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="btn btn-secondary btn-sm"
              style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
            >
              Prev
            </button>

            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
              Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({sortedQueue.length} total)
            </span>

            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="btn btn-secondary btn-sm"
              style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------- */}
      {/* RIGHT MAIN PANEL: VITALS ENTRY & TRIAGE STATION */}
      {/* ---------------------------------------------------- */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {!patient || !visit ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
            <Activity size={44} color="var(--primary-400)" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No Active OPD Encounter Selected</h3>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '460px', margin: '0 auto' }}>
              Please click on any patient from the <strong>OPD Queue Desk</strong> on the left panel to select them and begin vitals triage.
            </p>
          </div>
        ) : (
          <>
            {/* Top Patient Banner & Actions Header */}
            <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{patient.fullName}</h2>
                    <span style={{ fontSize: '0.75rem', background: 'rgba(56, 189, 248, 0.15)', color: 'var(--primary-400)', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>
                      Token #{visit.tokenNumber}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>MRN: {patient.mrn}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Gender: <strong>{patient.gender}</strong> • Age: <strong>{patient.age} yrs</strong> • Doctor: <strong style={{ color: 'var(--primary-400)' }}>{visit.doctorName || visit.doctor?.name || 'Consultant'}</strong>
                  </div>
                </div>

                {/* Quick Header Actions */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button onClick={handleLoadNormalPreset} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#38bdf8' }}>
                    <Zap size={14} />
                    <span>Adult Normal Preset</span>
                  </button>

                  <button onClick={() => handlePrintVitalsSheet(visit.id)} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Printer size={14} />
                    <span>A4 Triage Sheet</span>
                  </button>

                  <button onClick={onNavigateToLab} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <FlaskConical size={14} />
                    <span>Lab Orders</span>
                  </button>

                  <button onClick={onNavigateToBilling} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Receipt size={14} />
                    <span>Billing Desk</span>
                  </button>
                </div>
              </div>

              {/* Dynamic Triage Risk Classification Box */}
              <div
                style={{
                  background: triageCategory.bg,
                  border: `1.5px solid ${triageCategory.border}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <TriageIcon size={22} color={triageCategory.color} />
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: triageCategory.color }}>
                      Clinical Triage Level: {triageCategory.level}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      {triageCategory.desc}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Computed BMI: <span style={{ color: 'var(--primary-400)' }}>{computedBmi}</span> ({getBmiCategory(parseFloat(computedBmi)) || '—'})
                </div>
              </div>
            </div>

            {/* Error / Success Notifications */}
            {errorMsg && (
              <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid var(--accent-rose)', color: '#fda4af', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div style={{ background: 'rgba(52, 211, 153, 0.15)', border: '1.5px solid var(--accent-emerald)', color: '#6ee7b7', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.88rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                  <CheckCircle size={18} />
                  <span><strong>{successMsg}</strong> Status: <span style={{ color: '#fbbf24', fontWeight: 800 }}>UNPAID (Encounter Bill Generated)</span></span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={onNavigateToBilling} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <DollarSign size={14} />
                    <span>Pay Bill</span>
                  </button>
                  <button onClick={onNavigateToLab} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <FlaskConical size={14} />
                    <span>Order Labs</span>
                  </button>
                </div>
              </div>
            )}

            {/* Vitals Input Form */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <form onSubmit={(e) => handleRecordVitals(e, true)} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Row 1: BP, Pulse, Temp, SpO2 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
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
                    />
                  </div>
                </div>

                {/* Row 2: SpO2, Respiratory Rate, Weight, Height */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
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
                    />
                  </div>

                  <div>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Ruler size={14} color="#a855f7" />
                      <span>Height (cm)</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      className="input"
                      value={formData.height}
                      onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                      placeholder="175"
                    />
                  </div>
                </div>

                {/* Row 3: Glucose, Glucose Type, Pain Scale, Alertness AVPU */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
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

                  <div>
                    <label className="form-label">AVPU Alertness Scale</label>
                    <select
                      className="select"
                      value={formData.avpu}
                      onChange={(e) => setFormData({ ...formData, avpu: e.target.value })}
                    >
                      <option value="ALERT">A — Fully Alert</option>
                      <option value="VOICE">V — Responds to Voice</option>
                      <option value="PAIN">P — Responds to Pain</option>
                      <option value="UNRESPONSIVE">U — Unresponsive</option>
                    </select>
                  </div>
                </div>

                {/* Chief Complaints / Observations Textarea */}
                <div>
                  <label className="form-label">Clinical Observations & Triage Chief Complaints</label>
                  <textarea
                    className="textarea"
                    rows={2}
                    value={formData.observations}
                    onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                    placeholder="Patient posture, alert status, fever duration, pallor, cyanosis, edema, or triage findings..."
                  />
                </div>

                {/* Submit Buttons */}
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

            {/* Historical Vitals Table */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
          </>
        )}
      </div>

      {/* ---------------------------------------------------- */}
      {/* A4 PRINT PREVIEW MODAL */}
      {/* ---------------------------------------------------- */}
      <Modal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title={`A4 OPD Encounter & Vitals Sheet — Token #${visit?.tokenNumber || ''}`}
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
