import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useActivePatientStore } from '../../stores/activePatientStore';
import { invokeIpc } from '../../lib/ipc';
import { VisitDto, DailyCollectionSummary } from '../../../shared/types';
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
} from 'lucide-react';

interface DashboardPageProps {
  onNavigate: (tab: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { user, hasPermission } = useAuthStore();
  const { setActivePatient } = useActivePatientStore();

  const [visits, setVisits] = useState<VisitDto[]>([]);
  const [collection, setCollection] = useState<DailyCollectionSummary | null>(null);
  const [loading, setLoading] = useState(true);

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

      {/* Live Hospital OPD Queue Grid */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem' }}>Live Patient Encounters & Queue</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Click any encounter to load clinical safety profile and take action</p>
          </div>
          <button onClick={loadDashboardData} className="btn btn-secondary btn-sm">
            Refresh Status
          </button>
        </div>

        <div className="table-container">
          <table className="table">
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
              {visits.length > 0 ? (
                visits.map((v) => {
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
                    {loading ? 'Loading today OPD records...' : 'No patient visits registered today yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
