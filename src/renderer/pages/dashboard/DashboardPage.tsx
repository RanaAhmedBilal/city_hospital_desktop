import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useActivePatientStore } from '../../stores/activePatientStore';
import { invokeIpc } from '../../lib/ipc';
import { VisitDto, DailyCollectionSummary, DoctorDto, DepartmentDto } from '../../../shared/types';
import {
  Users,
  Activity,
  Stethoscope,
  Receipt,
  Clock,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  PlusCircle,
  Search,
  SlidersHorizontal,
  RefreshCw,
} from 'lucide-react';

interface DashboardPageProps {
  onNavigate: (tab: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { user, hasPermission } = useAuthStore();
  const { setActivePatient } = useActivePatientStore();

  const [visits, setVisits] = useState<VisitDto[]>([]);
  const [doctors, setDoctors] = useState<DoctorDto[]>([]);
  const [departments, setDepartments] = useState<DepartmentDto[]>([]);
  const [collection, setCollection] = useState<DailyCollectionSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters & Sorting for Dashboard Queue Table
  const [dashSearch, setDashSearch] = useState('');
  const [dashStatusFilter, setDashStatusFilter] = useState('');
  const [dashDeptFilter, setDashDeptFilter] = useState('');
  const [dashDocFilter, setDashDocFilter] = useState('');
  const [dashSortBy, setDashSortBy] = useState<'TOKEN_ASC' | 'TOKEN_DESC' | 'TIME_ASC' | 'TIME_DESC' | 'PATIENT_NAME'>('TOKEN_ASC');

  // Pagination for Dashboard Queue Table
  const [dashPage, setDashPage] = useState(1);
  const [dashPageSize, setDashPageSize] = useState(5);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const promises: Promise<any>[] = [];

      if (hasPermission('visit:read') || hasPermission('*')) {
        promises.push(
          invokeIpc<VisitDto[]>('visits:get-all', { date: today }).then((res) => {
            if (res.success && res.data) setVisits(res.data);
          })
        );
      }

      if (hasPermission('report:view_financial') || hasPermission('*')) {
        promises.push(
          invokeIpc<DailyCollectionSummary>('reports:daily-collection', { date: today }).then((res) => {
            if (res.success && res.data) setCollection(res.data);
          })
        );
      }

      // Load Master Dropdowns
      promises.push(
        invokeIpc<DoctorDto[]>('config:get-doctors', { activeOnly: true }).then((res) => {
          if (res.success && res.data) setDoctors(res.data);
        }),
        invokeIpc<DepartmentDto[]>('config:get-departments').then((res) => {
          if (res.success && res.data) setDepartments(res.data);
        })
      );

      await Promise.all(promises);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const waitingVitalsCount = visits.filter((v) => v.status === 'REGISTERED' || v.status === 'WAITING').length;
  const withDoctorCount = visits.filter((v) => v.status === 'VITALS_COMPLETED' || v.status === 'WITH_DOCTOR').length;
  const completedCount = visits.filter((v) => v.status === 'CONSULTATION_COMPLETED' || v.status === 'COMPLETED').length;
  const unbilledCount = visits.filter((v) => v.paymentStatus === 'UNBILLED').length;

  // Filter & Sort Logic for Dashboard Live Queue Table
  const filteredVisits = visits.filter((v) => {
    if (dashDeptFilter && v.departmentId !== dashDeptFilter) return false;
    if (dashDocFilter && v.doctorId !== dashDocFilter) return false;
    if (dashStatusFilter) {
      if (dashStatusFilter === 'WAITING' && !(v.status === 'REGISTERED' || v.status === 'WAITING')) return false;
      if (dashStatusFilter === 'READY_DOCTOR' && v.status !== 'VITALS_COMPLETED') return false;
      if (dashStatusFilter === 'WITH_DOCTOR' && v.status !== 'WITH_DOCTOR') return false;
      if (dashStatusFilter === 'CONSULTATION_COMPLETED' && v.status !== 'CONSULTATION_COMPLETED') return false;
      if (dashStatusFilter === 'COMPLETED' && v.status !== 'COMPLETED') return false;
    }
    if (dashSearch) {
      const q = dashSearch.toLowerCase();
      const pName = v.patient?.fullName?.toLowerCase() || '';
      const mrn = v.patient?.mrn?.toLowerCase() || '';
      const doc = v.doctorName?.toLowerCase() || '';
      const dept = v.departmentName?.toLowerCase() || '';
      const tok = String(v.tokenNumber);
      return pName.includes(q) || mrn.includes(q) || doc.includes(q) || dept.includes(q) || tok.includes(q);
    }
    return true;
  });

  const sortedVisits = [...filteredVisits].sort((a, b) => {
    if (dashSortBy === 'TOKEN_ASC') return a.tokenNumber - b.tokenNumber;
    if (dashSortBy === 'TOKEN_DESC') return b.tokenNumber - a.tokenNumber;
    if (dashSortBy === 'TIME_ASC') return new Date(a.visitDateTime).getTime() - new Date(b.visitDateTime).getTime();
    if (dashSortBy === 'TIME_DESC') return new Date(b.visitDateTime).getTime() - new Date(a.visitDateTime).getTime();
    if (dashSortBy === 'PATIENT_NAME') return (a.patient?.fullName || '').localeCompare(b.patient?.fullName || '');
    return 0;
  });

  // Pagination Math
  const totalItems = sortedVisits.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / dashPageSize));
  const startItemIdx = totalItems === 0 ? 0 : (dashPage - 1) * dashPageSize + 1;
  const endItemIdx = Math.min(dashPage * dashPageSize, totalItems);
  const paginatedVisits = sortedVisits.slice((dashPage - 1) * dashPageSize, dashPage * dashPageSize);

  const resetDashboardFilters = () => {
    setDashSearch('');
    setDashStatusFilter('');
    setDashDeptFilter('');
    setDashDocFilter('');
    setDashSortBy('TOKEN_ASC');
    setDashPage(1);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Welcome Banner */}
      <div
        className="responsive-flex-between"
        style={{
          background: 'linear-gradient(135deg, rgba(15, 118, 110, 0.25) 0%, rgba(30, 41, 59, 0.6) 100%)',
          border: '1px solid rgba(20, 184, 166, 0.3)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem 1.5rem',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.4rem', color: '#f8fafc' }}>
            Welcome back, {user?.fullName}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', marginTop: '4px' }}>
            City Hospital Management Portal • {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button onClick={() => onNavigate('patients')} className="btn btn-primary">
            <PlusCircle size={16} />
            <span>Register Patient</span>
          </button>
          <button onClick={() => onNavigate('visits')} className="btn btn-secondary">
            <Clock size={16} />
            <span>OPD Queue</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem',
      }}>
        {/* Total Today's Encounters */}
        <div className="card card-hover" onClick={() => onNavigate('visits')} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Today's Encounters</div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>{visits.length}</div>
            </div>
            <div style={{ padding: '8px', background: 'rgba(56, 189, 248, 0.15)', borderRadius: 'var(--radius-sm)', color: '#38bdf8' }}>
              <Users size={22} />
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>Live OPD registrations</span>
            <ArrowUpRight size={14} />
          </div>
        </div>

        {/* Triage / Waiting Vitals */}
        <div className="card card-hover" onClick={() => onNavigate('vitals')} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Awaiting Vitals</div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--accent-amber)', marginTop: '4px' }}>{waitingVitalsCount}</div>
            </div>
            <div style={{ padding: '8px', background: 'rgba(251, 191, 36, 0.15)', borderRadius: 'var(--radius-sm)', color: '#fbbf24' }}>
              <Activity size={22} />
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>Nurse triage queue</span>
            <ArrowUpRight size={14} />
          </div>
        </div>

        {/* Doctor Consultation Ready */}
        <div className="card card-hover" onClick={() => onNavigate('consultation')} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>In Consultation</div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--primary-400)', marginTop: '4px' }}>{withDoctorCount}</div>
            </div>
            <div style={{ padding: '8px', background: 'rgba(20, 184, 166, 0.15)', borderRadius: 'var(--radius-sm)', color: 'var(--primary-400)' }}>
              <Stethoscope size={22} />
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>Vitals completed • In queue</span>
            <ArrowUpRight size={14} />
          </div>
        </div>

        {/* Today's Revenue Collection */}
        <div className="card card-hover" onClick={() => onNavigate('billing')} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Today's Collection</div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#34d399', marginTop: '4px' }}>
                Rs. {collection?.totalCollected ? collection.totalCollected.toLocaleString() : '0'}
              </div>
            </div>
            <div style={{ padding: '8px', background: 'rgba(52, 211, 153, 0.15)', borderRadius: 'var(--radius-sm)', color: '#34d399' }}>
              <Receipt size={22} />
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>{unbilledCount} visits pending billing</span>
            <ArrowUpRight size={14} />
          </div>
        </div>
      </div>

      {/* Live Hospital OPD Queue Grid with Filters, Sorting, and Pagination */}
      <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem' }}>Live Patient Encounters & Queue</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Click any encounter to load clinical safety profile and take action</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button onClick={resetDashboardFilters} className="btn btn-secondary btn-sm" style={{ fontSize: '0.8rem' }}>
              Reset Filters
            </button>
            <button onClick={loadDashboardData} className="btn btn-secondary btn-sm">
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
              <span>Refresh Status</span>
            </button>
          </div>
        </div>

        {/* Dashboard Queue Filter Controls Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.6rem', alignItems: 'center', background: 'var(--bg-subtle)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          {/* Instant Search */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="input"
              style={{ paddingLeft: '1.8rem', fontSize: '0.78rem' }}
              placeholder="Search Name, MRN, Token..."
              value={dashSearch}
              onChange={(e) => {
                setDashSearch(e.target.value);
                setDashPage(1);
              }}
            />
          </div>

          {/* Department Filter */}
          <select
            className="input"
            style={{ fontSize: '0.78rem', padding: '0.3rem 0.5rem' }}
            value={dashDeptFilter}
            onChange={(e) => {
              setDashDeptFilter(e.target.value);
              setDashPage(1);
            }}
          >
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>

          {/* Doctor Filter */}
          <select
            className="input"
            style={{ fontSize: '0.78rem', padding: '0.3rem 0.5rem' }}
            value={dashDocFilter}
            onChange={(e) => {
              setDashDocFilter(e.target.value);
              setDashPage(1);
            }}
          >
            <option value="">All Doctors</option>
            {doctors.map((doc) => (
              <option key={doc.id} value={doc.id}>{doc.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            className="input"
            style={{ fontSize: '0.78rem', padding: '0.3rem 0.5rem' }}
            value={dashStatusFilter}
            onChange={(e) => {
              setDashStatusFilter(e.target.value);
              setDashPage(1);
            }}
          >
            <option value="">All Stages</option>
            <option value="WAITING">Waiting Vitals</option>
            <option value="READY_DOCTOR">Ready for Doctor</option>
            <option value="WITH_DOCTOR">With Doctor</option>
            <option value="CONSULTATION_COMPLETED">Consultation Done</option>
            <option value="COMPLETED">Completed</option>
          </select>

          {/* Sorting */}
          <select
            className="input"
            style={{ fontSize: '0.78rem', padding: '0.3rem 0.5rem' }}
            value={dashSortBy}
            onChange={(e) => {
              setDashSortBy(e.target.value as any);
              setDashPage(1);
            }}
          >
            <option value="TOKEN_ASC">Token (Low → High)</option>
            <option value="TOKEN_DESC">Token (High → Low)</option>
            <option value="TIME_ASC">Time (Oldest First)</option>
            <option value="TIME_DESC">Time (Newest First)</option>
            <option value="PATIENT_NAME">Patient Name (A-Z)</option>
          </select>
        </div>

        {/* Table Content */}
        <div className="table-container">
          <table className="table" style={{ width: '100%', fontSize: '0.85rem' }}>
            <thead>
              <tr>
                <th>Token</th>
                <th>Patient / MRN</th>
                <th>Doctor</th>
                <th>Department</th>
                <th>Visit Type</th>
                <th>Clinical Status</th>
                <th>Billing Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedVisits.length > 0 ? (
                paginatedVisits.map((v) => {
                  let statusBadge = <span className="badge badge-slate">{v.status}</span>;
                  if (v.status === 'REGISTERED' || v.status === 'WAITING') statusBadge = <span className="badge badge-amber">Waiting Vitals</span>;
                  if (v.status === 'VITALS_COMPLETED') statusBadge = <span className="badge badge-blue">Ready for Doctor</span>;
                  if (v.status === 'WITH_DOCTOR') statusBadge = <span className="badge badge-purple">With Doctor</span>;
                  if (v.status === 'CONSULTATION_COMPLETED') statusBadge = <span className="badge badge-emerald">Consultation Done</span>;

                  return (
                    <tr key={v.id}>
                      <td style={{ fontWeight: 800, color: 'var(--primary-400)' }}>#{v.tokenNumber}</td>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{v.patient?.fullName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>MRN: {v.patient?.mrn} • {v.patient?.gender}</div>
                      </td>
                      <td>{v.doctorName}</td>
                      <td>{v.departmentName}</td>
                      <td>{v.visitType.replace('_', ' ')}</td>
                      <td>{statusBadge}</td>
                      <td>
                        <span className={`badge ${v.paymentStatus === 'PAID' ? 'badge-emerald' : 'badge-amber'}`}>
                          {v.paymentStatus}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button
                            onClick={() => {
                              if (v.patient) setActivePatient(v.patient, v);
                              if (v.status === 'REGISTERED' || v.status === 'WAITING') onNavigate('vitals');
                              else if (v.status === 'VITALS_COMPLETED' || v.status === 'WITH_DOCTOR') onNavigate('consultation');
                              else onNavigate('billing');
                            }}
                            className="btn btn-primary btn-sm"
                            style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                          >
                            Open
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    {loading ? 'Loading today OPD records...' : 'No patient encounters found for current filter criteria.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Dashboard Live Queue Pagination Footer */}
        {sortedVisits.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <span>
                Showing <strong>{startItemIdx}</strong> to <strong>{endItemIdx}</strong> of <strong>{totalItems}</strong> encounters
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span>Per page:</span>
                <select
                  className="input"
                  style={{ padding: '0.2rem 0.4rem', fontSize: '0.78rem' }}
                  value={dashPageSize}
                  onChange={(e) => {
                    setDashPageSize(Number(e.target.value));
                    setDashPage(1);
                  }}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
              <button
                disabled={dashPage <= 1}
                onClick={() => setDashPage(1)}
                className="btn btn-secondary btn-sm"
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
              >
                First
              </button>

              <button
                disabled={dashPage <= 1}
                onClick={() => setDashPage((p) => Math.max(1, p - 1))}
                className="btn btn-secondary btn-sm"
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
              >
                Prev
              </button>

              <span style={{ fontSize: '0.8rem', padding: '0 0.4rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                Page <strong>{dashPage}</strong> of <strong>{totalPages}</strong>
              </span>

              <button
                disabled={dashPage >= totalPages}
                onClick={() => setDashPage((p) => Math.min(totalPages, p + 1))}
                className="btn btn-secondary btn-sm"
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
              >
                Next
              </button>

              <button
                disabled={dashPage >= totalPages}
                onClick={() => setDashPage(totalPages)}
                className="btn btn-secondary btn-sm"
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
              >
                Last
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
