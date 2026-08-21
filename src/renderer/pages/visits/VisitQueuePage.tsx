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
  Check,
  AlertCircle,
  Clock,
  Printer,
  FlaskConical,
  DollarSign,
  Search,
  RefreshCw,
  Calendar,
  Layers,
  ArrowUpDown,
  Zap,
  SlidersHorizontal,
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

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedVisitType, setSelectedVisitType] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<string>('');

  // Sort & Pagination States
  const [sortBy, setSortBy] = useState<'TOKEN_ASC' | 'TOKEN_DESC' | 'TIME_ASC' | 'TIME_DESC' | 'PATIENT_NAME' | 'PRIORITY'>('TOKEN_ASC');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
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
  }, [selectedDate, selectedDoctorId, selectedStatus]);

  const loadVisits = async () => {
    setLoading(true);
    try {
      const res = await invokeIpc<VisitDto[]>('visits:get-all', {
        date: selectedDate || undefined,
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

  const resetAllFilters = () => {
    setSearchQuery('');
    setSelectedDate(new Date().toISOString().split('T')[0]);
    setSelectedDeptId('');
    setSelectedDoctorId('');
    setSelectedStatus('');
    setSelectedVisitType('');
    setSelectedPriority('');
    setSortBy('TOKEN_ASC');
    setCurrentPage(1);
  };

  // 1. Filter Logic
  const filteredVisits = visits.filter((v) => {
    if (selectedDeptId && v.departmentId !== selectedDeptId) return false;
    if (selectedVisitType && v.visitType !== selectedVisitType) return false;
    if (selectedPriority && (v.priority || 'NORMAL') !== selectedPriority) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const pName = v.patient?.fullName?.toLowerCase() || '';
      const mrn = v.patient?.mrn?.toLowerCase() || '';
      const phone = v.patient?.phone?.toLowerCase() || '';
      const vNum = v.visitNumber?.toLowerCase() || '';
      const tok = String(v.tokenNumber);
      const doc = v.doctorName?.toLowerCase() || '';
      const dept = v.departmentName?.toLowerCase() || '';

      return (
        pName.includes(q) ||
        mrn.includes(q) ||
        phone.includes(q) ||
        vNum.includes(q) ||
        tok.includes(q) ||
        doc.includes(q) ||
        dept.includes(q)
      );
    }
    return true;
  });

  // 2. Sort Logic
  const sortedVisits = [...filteredVisits].sort((a, b) => {
    if (sortBy === 'TOKEN_ASC') return a.tokenNumber - b.tokenNumber;
    if (sortBy === 'TOKEN_DESC') return b.tokenNumber - a.tokenNumber;
    if (sortBy === 'TIME_ASC') return new Date(a.visitDateTime).getTime() - new Date(b.visitDateTime).getTime();
    if (sortBy === 'TIME_DESC') return new Date(b.visitDateTime).getTime() - new Date(a.visitDateTime).getTime();
    if (sortBy === 'PATIENT_NAME') return (a.patient?.fullName || '').localeCompare(b.patient?.fullName || '');
    if (sortBy === 'PRIORITY') {
      const pMap: Record<string, number> = { EMERGENCY: 3, URGENT: 2, NORMAL: 1 };
      return (pMap[b.priority || 'NORMAL'] || 1) - (pMap[a.priority || 'NORMAL'] || 1);
    }
    return 0;
  });

  // 3. Pagination Slicing
  const totalItems = sortedVisits.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItemIdx = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItemIdx = Math.min(currentPage * pageSize, totalItems);
  const paginatedVisits = sortedVisits.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Header & New Visit CTA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <CalendarClock size={24} color="var(--primary-400)" />
            <span>Live OPD Queue & Patient Encounters</span>
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Real-time clinical flow tracking from registration to triage, consultation, and billing
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {activePatient ? (
            <button onClick={() => setIsModalOpen(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <PlusCircle size={16} />
              <span>Create Visit for {activePatient.fullName}</span>
            </button>
          ) : (
            <button onClick={onNavigateToPatients} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <User size={16} />
              <span>Select Patient to Create Visit</span>
            </button>
          )}
        </div>
      </div>

      {/* Multi-Dimensional Filter Bar Card */}
      <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <SlidersHorizontal size={16} color="var(--primary-400)" />
            <span>Filter & Sort OPD Queue Encounters</span>
          </h3>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button onClick={resetAllFilters} className="btn btn-secondary btn-sm" style={{ fontSize: '0.8rem' }}>
              Reset Filters
            </button>
            <button onClick={loadVisits} className="btn btn-secondary btn-sm" title="Refresh Live Queue">
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
            </button>
          </div>
        </div>

        {/* Filter Inputs Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem', alignItems: 'end' }}>
          {/* Text Search */}
          <div style={{ position: 'relative' }}>
            <label className="label" style={{ fontSize: '0.75rem' }}>Search Encounter</label>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="input"
                style={{ paddingLeft: '2rem', fontSize: '0.8rem' }}
                placeholder="Name, MRN, Token, Visit #..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>

          {/* Date Selector */}
          <div>
            <label className="label" style={{ fontSize: '0.75rem' }}>Encounter Date</label>
            <input
              type="date"
              className="input"
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.5rem' }}
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Department Filter */}
          <div>
            <label className="label" style={{ fontSize: '0.75rem' }}>Department</label>
            <select
              className="input"
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.5rem' }}
              value={selectedDeptId}
              onChange={(e) => {
                setSelectedDeptId(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>

          {/* Doctor Filter */}
          <div>
            <label className="label" style={{ fontSize: '0.75rem' }}>Consulting Doctor</label>
            <select
              className="input"
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.5rem' }}
              value={selectedDoctorId}
              onChange={(e) => {
                setSelectedDoctorId(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Doctors</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>{d.name} ({d.specialty})</option>
              ))}
            </select>
          </div>

          {/* Clinical Stage Status */}
          <div>
            <label className="label" style={{ fontSize: '0.75rem' }}>Clinical Stage</label>
            <select
              className="input"
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.5rem' }}
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Stages</option>
              <option value="REGISTERED">Registered</option>
              <option value="WAITING">Waiting Vitals</option>
              <option value="VITALS_COMPLETED">Vitals Completed</option>
              <option value="WITH_DOCTOR">With Doctor</option>
              <option value="CONSULTATION_COMPLETED">Consultation Done</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>

          {/* Visit Type */}
          <div>
            <label className="label" style={{ fontSize: '0.75rem' }}>Visit Type</label>
            <select
              className="input"
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.5rem' }}
              value={selectedVisitType}
              onChange={(e) => {
                setSelectedVisitType(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Visit Types</option>
              <option value="NEW_CONSULTATION">New Consultation</option>
              <option value="FOLLOW_UP">Follow-up Visit</option>
              <option value="EMERGENCY">Emergency Triage</option>
            </select>
          </div>

          {/* Sorting Control */}
          <div>
            <label className="label" style={{ fontSize: '0.75rem' }}>Sort Sequence</label>
            <select
              className="input"
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.5rem' }}
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as any);
                setCurrentPage(1);
              }}
            >
              <option value="TOKEN_ASC">Token (Low → High)</option>
              <option value="TOKEN_DESC">Token (High → Low)</option>
              <option value="TIME_ASC">Reg. Time (Oldest First)</option>
              <option value="TIME_DESC">Reg. Time (Newest First)</option>
              <option value="PATIENT_NAME">Patient Name (A-Z)</option>
              <option value="PRIORITY">Priority (Emergency First)</option>
            </select>
          </div>
        </div>
      </div>

      {/* OPD Queue Table Card */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div className="table-container">
          <table className="table" style={{ width: '100%', fontSize: '0.85rem' }}>
            <thead>
              <tr>
                <th>Token</th>
                <th>Visit #</th>
                <th>Patient Details</th>
                <th>Consulting Doctor</th>
                <th>Department</th>
                <th>Visit Type</th>
                <th>Clinical Stage</th>
                <th>Billing Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedVisits.length > 0 ? (
                paginatedVisits.map((v) => {
                  return (
                    <tr key={v.id}>
                      <td style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--primary-400)' }}>
                        #{v.tokenNumber}
                      </td>
                      <td style={{ fontWeight: 700, fontSize: '0.85rem' }}>{v.visitNumber}</td>
                      <td>
                        <div style={{ fontWeight: 700 }}>{v.patient?.fullName || 'N/A'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          MRN: {v.patient?.mrn} • {v.patient?.age ? `${v.patient.age}y` : ''} {v.patient?.gender}
                        </div>
                      </td>
                      <td>{v.doctorName || v.doctor?.name || '—'}</td>
                      <td>{v.departmentName || '—'}</td>
                      <td>
                        <span className="badge badge-slate">{(v.visitType || '').replace('_', ' ')}</span>
                      </td>
                      <td>
                        <select
                          className="select"
                          value={v.status}
                          onChange={(e) => handleStatusChange(v.id, e.target.value as VisitStatus)}
                          style={{
                            fontSize: '0.75rem',
                            padding: '0.25rem 0.5rem',
                            background:
                              v.status === 'COMPLETED'
                                ? 'rgba(52, 211, 153, 0.15)'
                                : v.status === 'WITH_DOCTOR'
                                ? 'rgba(168, 85, 247, 0.15)'
                                : v.status === 'VITALS_COMPLETED'
                                ? 'rgba(56, 189, 248, 0.15)'
                                : 'rgba(251, 191, 36, 0.15)',
                            color:
                              v.status === 'COMPLETED'
                                ? '#34d399'
                                : v.status === 'WITH_DOCTOR'
                                ? '#c084fc'
                                : v.status === 'VITALS_COMPLETED'
                                ? '#38bdf8'
                                : '#fbbf24',
                            fontWeight: 700,
                            border: 'none',
                          }}
                        >
                          <option value="REGISTERED">1. Registered</option>
                          <option value="WAITING">2. Waiting Vitals</option>
                          <option value="VITALS_COMPLETED">3. Vitals Completed</option>
                          <option value="WITH_DOCTOR">4. With Doctor</option>
                          <option value="CONSULTATION_COMPLETED">5. Consult Done</option>
                          <option value="COMPLETED">6. Completed</option>
                          <option value="CANCELLED">Cancelled</option>
                        </select>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            v.paymentStatus === 'PAID'
                              ? 'badge-emerald'
                              : v.paymentStatus === 'PARTIALLY_PAID'
                              ? 'badge-amber'
                              : 'badge-rose'
                          }`}
                        >
                          {v.paymentStatus || 'UNBILLED'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                          <button
                            onClick={() => {
                              if (v.patient) setActivePatient(v.patient, v);
                              onNavigateToVitals();
                            }}
                            className="btn btn-secondary btn-sm"
                            title="Open Nursing Vitals & Triage Station"
                          >
                            <Activity size={13} color="var(--primary-400)" />
                            <span>Vitals</span>
                          </button>
                          <button
                            onClick={() => handlePrintVitalsSheet(v.id)}
                            className="btn btn-secondary btn-sm"
                            title="Print A4 OPD Encounter & Vitals Sheet"
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
                    {loading ? 'Fetching live queue...' : 'No OPD patient encounters found for selected filter criteria.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar Footer */}
        {sortedVisits.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', marginTop: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <span>
                Showing <strong>{startItemIdx}</strong> to <strong>{endItemIdx}</strong> of <strong>{totalItems}</strong> encounters
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span>Per page:</span>
                <select
                  className="input"
                  style={{ padding: '0.2rem 0.4rem', fontSize: '0.78rem' }}
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(1)}
                className="btn btn-secondary btn-sm"
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
              >
                First
              </button>

              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="btn btn-secondary btn-sm"
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
              >
                Prev
              </button>

              <span style={{ fontSize: '0.8rem', padding: '0 0.4rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
              </span>

              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="btn btn-secondary btn-sm"
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
              >
                Next
              </button>

              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(totalPages)}
                className="btn btn-secondary btn-sm"
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
              >
                Last
              </button>
            </div>
          </div>
        )}
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
              <select className="select" value={visitFormData.doctorId} onChange={(e) => handleDoctorChange(e.target.value)} required>
                <option value="">Select Doctor...</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.specialty}) — Fee: Rs. {d.consultationFee}
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
                <option value="">Select Department...</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
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
                <option value={VisitType.NEW_CONSULTATION}>New Consultation</option>
                <option value={VisitType.FOLLOW_UP}>Follow-up Visit</option>
                <option value={VisitType.EMERGENCY}>Emergency Triage</option>
              </select>
            </div>

            <div>
              <label className="form-label">Consultation Fee (Rs.)</label>
              <input
                type="number"
                className="input"
                value={visitFormData.customFee}
                onChange={(e) => setVisitFormData({ ...visitFormData, customFee: e.target.value })}
                placeholder="2000"
              />
            </div>
          </div>

          <div>
            <label className="form-label">Triage Priority</label>
            <select
              className="select"
              value={visitFormData.priority}
              onChange={(e) => setVisitFormData({ ...visitFormData, priority: e.target.value })}
            >
              <option value="NORMAL">Normal Priority</option>
              <option value="URGENT">Urgent Priority</option>
              <option value="EMERGENCY">Critical Emergency</option>
            </select>
          </div>

          <div>
            <label className="form-label">Visit Notes / Presenting Complaints</label>
            <textarea
              className="textarea"
              rows={3}
              value={visitFormData.notes}
              onChange={(e) => setVisitFormData({ ...visitFormData, notes: e.target.value })}
              placeholder="Primary symptoms or referral reason..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary" disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Creating Encounter...' : 'Issue Token & Generate Visit'}
            </button>
          </div>
        </form>
      </Modal>

      {/* A4 PRINT PREVIEW MODAL */}
      <Modal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="A4 OPD Encounter & Vitals Sheet Preview"
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
