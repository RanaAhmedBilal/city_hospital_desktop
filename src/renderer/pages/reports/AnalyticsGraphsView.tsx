import React, { useState, useEffect, useRef } from 'react';
import { invokeIpc } from '../../lib/ipc';
import {
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  Filter,
  RefreshCw,
  Clock,
  PieChart,
  BarChart2,
  Building,
  CreditCard,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface TimelinePoint {
  key: string;
  label: string;
  revenue: number;
  collected: number;
  pending: number;
  patientCount: number;
}

interface DepartmentStat {
  id: string;
  name: string;
  revenue: number;
  patientCount: number;
}

interface PaymentStat {
  method: string;
  amount: number;
  count: number;
}

interface AnalyticsData {
  granularity: 'daily' | 'monthly' | 'yearly';
  dateRange: { startDate: string; endDate: string };
  kpis: {
    totalRevenue: number;
    totalCollected: number;
    totalPending: number;
    totalPatients: number;
    averageRevenuePerPatient: number;
    collectionEfficiency: number;
  };
  timeline: TimelinePoint[];
  departmentBreakdown: DepartmentStat[];
  paymentMethodBreakdown: PaymentStat[];
}

export const AnalyticsGraphsView: React.FC = () => {
  const [granularity, setGranularity] = useState<'daily' | 'monthly' | 'yearly'>('daily');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');

  const [departments, setDepartments] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toLocaleTimeString());

  const [hoveredPoint, setHoveredPoint] = useState<TimelinePoint | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    loadMasterData();
  }, []);

  useEffect(() => {
    loadAnalyticsData();
  }, [granularity, startDate, endDate, selectedDept, selectedDoctor, selectedPaymentMethod]);

  // Real-time polling effect (auto-refresh every 30 seconds)
  useEffect(() => {
    if (!isAutoRefresh) return;
    const interval = setInterval(() => {
      loadAnalyticsData(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [isAutoRefresh, granularity, startDate, endDate, selectedDept, selectedDoctor, selectedPaymentMethod]);

  const loadMasterData = async () => {
    try {
      const [dRes, docRes] = await Promise.all([
        invokeIpc<any[]>('config:get-departments'),
        invokeIpc<any[]>('config:get-doctors', { activeOnly: true }),
      ]);
      if (dRes.success && dRes.data) setDepartments(dRes.data);
      if (docRes.success && docRes.data) setDoctors(docRes.data);
    } catch (err) {
      console.error('Failed to load master data for analytics:', err);
    }
  };

  const loadAnalyticsData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await invokeIpc<AnalyticsData>('reports:get-analytics-trends', {
        granularity,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        departmentId: selectedDept || undefined,
        doctorId: selectedDoctor || undefined,
        paymentMethod: selectedPaymentMethod || undefined,
      });

      if (res.success && res.data) {
        setAnalytics(res.data);
        setLastUpdated(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.error('Error fetching analytics trends:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedDept('');
    setSelectedDoctor('');
    setSelectedPaymentMethod('');
    setGranularity('daily');
  };

  // Helper values for charts
  const timeline = analytics?.timeline || [];
  const maxRevenue = Math.max(...timeline.map((t) => Math.max(t.revenue, t.collected)), 1000);
  const maxPatients = Math.max(...timeline.map((t) => t.patientCount), 5);

  // Department color palette
  const DEPT_COLORS = ['#38bdf8', '#34d399', '#f59e0b', '#a855f7', '#ec4899', '#6366f1', '#14b8a6'];
  const METHOD_COLORS: Record<string, string> = {
    CASH: '#34d399',
    CARD: '#38bdf8',
    BANK_TRANSFER: '#a855f7',
    PANEL_CREDIT: '#f59e0b',
    ONLINE: '#ec4899',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Filter & Real-Time Control Bar */}
      <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          {/* Granularity Tabs */}
          <div style={{ display: 'flex', background: 'var(--bg-surface)', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', gap: '0.25rem' }}>
            <button
              onClick={() => setGranularity('daily')}
              className={`btn btn-sm ${granularity === 'daily' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.8rem' }}
            >
              <Clock size={14} />
              <span>Daily (14 Days)</span>
            </button>

            <button
              onClick={() => setGranularity('monthly')}
              className={`btn btn-sm ${granularity === 'monthly' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.8rem' }}
            >
              <Calendar size={14} />
              <span>Monthly (12 Months)</span>
            </button>

            <button
              onClick={() => setGranularity('yearly')}
              className={`btn btn-sm ${granularity === 'yearly' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.8rem' }}
            >
              <TrendingUp size={14} />
              <span>Yearly Multi-Year</span>
            </button>
          </div>

          {/* Real-time Indicator & Manual Refresh */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={isAutoRefresh}
                onChange={(e) => setIsAutoRefresh(e.target.checked)}
              />
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Zap size={13} color={isAutoRefresh ? '#34d399' : 'var(--text-muted)'} />
                <span>Real-Time Sync</span>
              </span>
            </label>

            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Updated: {lastUpdated}
            </span>

            <button onClick={() => loadAnalyticsData()} className="btn btn-secondary btn-sm" title="Refresh Graph Data">
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
            </button>
          </div>
        </div>

        {/* Filters Controls Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', alignItems: 'end' }}>
          <div>
            <label className="label" style={{ fontSize: '0.75rem' }}>Start Date</label>
            <input
              type="date"
              className="input"
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.5rem' }}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div>
            <label className="label" style={{ fontSize: '0.75rem' }}>End Date</label>
            <input
              type="date"
              className="input"
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.5rem' }}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div>
            <label className="label" style={{ fontSize: '0.75rem' }}>Department Filter</label>
            <select
              className="input"
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.5rem' }}
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" style={{ fontSize: '0.75rem' }}>Doctor Filter</label>
            <select
              className="input"
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.5rem' }}
              value={selectedDoctor}
              onChange={(e) => setSelectedDoctor(e.target.value)}
            >
              <option value="">All Doctors</option>
              {doctors.map((doc) => (
                <option key={doc.id} value={doc.id}>{doc.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" style={{ fontSize: '0.75rem' }}>Payment Mode</label>
            <select
              className="input"
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.5rem' }}
              value={selectedPaymentMethod}
              onChange={(e) => setSelectedPaymentMethod(e.target.value)}
            >
              <option value="">All Payment Modes</option>
              <option value="CASH">Cash</option>
              <option value="CARD">Card / POS</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="PANEL_CREDIT">Panel Credit</option>
              <option value="ONLINE">Online Wallet</option>
            </select>
          </div>

          <div>
            <button onClick={handleResetFilters} className="btn btn-secondary btn-sm" style={{ width: '100%', fontSize: '0.8rem' }}>
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ padding: '1rem 1.25rem', borderLeft: '4px solid var(--primary-400)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Billed Revenue</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-400)', marginTop: '4px' }}>
            Rs. {(analytics?.kpis.totalRevenue || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Gross invoiced fees
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem', borderLeft: '4px solid #34d399' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Cash Collected</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#6ee7b7', marginTop: '4px' }}>
            Rs. {(analytics?.kpis.totalCollected || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Efficiency Rate: <strong>{analytics?.kpis.collectionEfficiency || 100}%</strong>
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem', borderLeft: '4px solid #f43f5e' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Pending Balance Due</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fda4af', marginTop: '4px' }}>
            Rs. {(analytics?.kpis.totalPending || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Outstanding receivables
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem', borderLeft: '4px solid #a855f7' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Patient Volume</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#c084fc', marginTop: '4px' }}>
            {(analytics?.kpis.totalPatients || 0).toLocaleString()} Patients
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Avg/Patient: <strong>Rs. {(analytics?.kpis.averageRevenuePerPatient || 0).toLocaleString()}</strong>
          </div>
        </div>
      </div>

      {/* Main Graphs Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1.2fr)', gap: '1.25rem' }}>
        {/* Graph 1: Revenue Trend Area & Line Chart */}
        <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={18} color="var(--primary-400)" />
                <span>Revenue & Cash Collection Trends ({granularity.toUpperCase()})</span>
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Billed revenue vs actual cash collection vs pending receivables
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#38bdf8' }} />
                <span>Billed Revenue</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#34d399' }} />
                <span>Collected Cash</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f43f5e' }} />
                <span>Pending Balance</span>
              </div>
            </div>
          </div>

          {/* SVG Line / Area Graph */}
          <div style={{ width: '100%', height: '260px', position: 'relative' }}>
            {timeline.length === 0 ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                No revenue trend data available for selected filter range.
              </div>
            ) : (
              <svg width="100%" height="100%" viewBox="0 0 700 240" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#34d399" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid Lines */}
                {[0, 60, 120, 180].map((y) => (
                  <line key={y} x1="40" y1={y + 20} x2="680" y2={y + 20} stroke="var(--border-subtle)" strokeDasharray="3 3" />
                ))}

                {/* Draw Revenue Area Path */}
                {(() => {
                  const points = timeline.map((pt, idx) => {
                    const x = 40 + (idx / Math.max(1, timeline.length - 1)) * 640;
                    const y = 200 - (pt.revenue / maxRevenue) * 180;
                    return { x, y };
                  });

                  const pathD = points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');
                  const areaD = `${pathD} L ${points[points.length - 1].x} 200 L ${points[0].x} 200 Z`;

                  const cashPoints = timeline.map((pt, idx) => {
                    const x = 40 + (idx / Math.max(1, timeline.length - 1)) * 640;
                    const y = 200 - (pt.collected / maxRevenue) * 180;
                    return { x, y };
                  });
                  const cashPathD = cashPoints.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');

                  const pendingPoints = timeline.map((pt, idx) => {
                    const x = 40 + (idx / Math.max(1, timeline.length - 1)) * 640;
                    const y = 200 - (pt.pending / maxRevenue) * 180;
                    return { x, y };
                  });
                  const pendingPathD = pendingPoints.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');

                  return (
                    <>
                      {/* Areas */}
                      <path d={areaD} fill="url(#revGrad)" />

                      {/* Line Paths */}
                      <path d={pathD} fill="none" stroke="#38bdf8" strokeWidth="2.5" />
                      <path d={cashPathD} fill="none" stroke="#34d399" strokeWidth="2" strokeDasharray="4 2" />
                      <path d={pendingPathD} fill="none" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="2 2" />

                      {/* Interactive Dots */}
                      {points.map((p, idx) => (
                        <circle
                          key={idx}
                          cx={p.x}
                          cy={p.y}
                          r={hoveredPoint?.key === timeline[idx].key ? 6 : 4}
                          fill="#38bdf8"
                          stroke="#0f172a"
                          strokeWidth="2"
                          style={{ cursor: 'pointer', transition: 'r 0.15s ease' }}
                          onMouseEnter={() => {
                            setHoveredPoint(timeline[idx]);
                          }}
                        />
                      ))}
                    </>
                  );
                })()}

                {/* X-Axis Labels */}
                {timeline.map((pt, idx) => {
                  const x = 40 + (idx / Math.max(1, timeline.length - 1)) * 640;
                  const step = Math.max(1, Math.ceil(timeline.length / 8));
                  const isFirst = idx === 0;
                  const isLast = idx === timeline.length - 1;
                  const isStepAligned = idx % step === 0;

                  // Always show first & step-aligned labels
                  if (!isFirst && !isLast && !isStepAligned) return null;

                  // For forced "last" label: skip if a step-aligned label is very close
                  if (isLast && !isStepAligned) {
                    const lastStepIdx = Math.floor((timeline.length - 1) / step) * step;
                    if ((timeline.length - 1 - lastStepIdx) < step * 0.7) return null;
                  }

                  return (
                    <text
                      key={idx}
                      x={x}
                      y={222}
                      fill="var(--text-muted)"
                      fontSize="10"
                      textAnchor="middle"
                    >
                      {pt.label}
                    </text>
                  );
                })}
              </svg>
            )}

            {/* Hover Tooltip Overlay */}
            {hoveredPoint && (
              <div
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '15px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.6rem 0.85rem',
                  fontSize: '0.8rem',
                  boxShadow: 'var(--shadow-md)',
                  pointerEvents: 'none',
                }}
              >
                <div style={{ fontWeight: 700, color: 'var(--primary-400)', marginBottom: '4px' }}>
                  {hoveredPoint.label}
                </div>
                <div>Billed: <strong style={{ color: '#38bdf8' }}>Rs. {hoveredPoint.revenue.toLocaleString()}</strong></div>
                <div>Collected: <strong style={{ color: '#34d399' }}>Rs. {hoveredPoint.collected.toLocaleString()}</strong></div>
                <div>Pending: <strong style={{ color: '#f43f5e' }}>Rs. {hoveredPoint.pending.toLocaleString()}</strong></div>
                <div>Patients: <strong>{hoveredPoint.patientCount}</strong></div>
              </div>
            )}
          </div>
        </div>

        {/* Graph 2: Patient Volume Bar Chart */}
        <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={18} color="#a855f7" />
                <span>Patient Footfall ({granularity.toUpperCase()})</span>
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                OPD registration and consultation volume trends
              </p>
            </div>
          </div>

          <div style={{ width: '100%', height: '260px' }}>
            {timeline.length === 0 ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                No patient volume recorded.
              </div>
            ) : (
              <svg width="100%" height="100%" viewBox="0 0 450 240" preserveAspectRatio="none">
                {/* Horizontal Grid */}
                {[0, 60, 120, 180].map((y) => (
                  <line key={y} x1="30" y1={y + 20} x2="430" y2={y + 20} stroke="var(--border-subtle)" strokeDasharray="3 3" />
                ))}

                {/* Bars */}
                {timeline.map((pt, idx) => {
                  const barWidth = Math.max(8, Math.min(24, 380 / timeline.length));
                  const x = 40 + (idx / Math.max(1, timeline.length)) * 390;
                  const height = (pt.patientCount / maxPatients) * 170;
                  const y = 200 - height;

                  return (
                    <g key={idx} style={{ cursor: 'pointer' }}>
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={height}
                        rx={3}
                        fill="#a855f7"
                        opacity={hoveredPoint?.key === pt.key ? 1 : 0.85}
                        onMouseEnter={() => setHoveredPoint(pt)}
                      />
                      <text
                        x={x + barWidth / 2}
                        y={y - 5}
                        fill="#c084fc"
                        fontSize="9"
                        fontWeight="700"
                        textAnchor="middle"
                      >
                        {pt.patientCount > 0 ? pt.patientCount : ''}
                      </text>
                    </g>
                  );
                })}

                {/* X Labels */}
                {timeline.map((pt, idx) => {
                  const step = Math.max(1, Math.ceil(timeline.length / 8));
                  const isFirst = idx === 0;
                  const isLast = idx === timeline.length - 1;
                  const isStepAligned = idx % step === 0;

                  if (!isFirst && !isLast && !isStepAligned) return null;

                  if (isLast && !isStepAligned) {
                    const lastStepIdx = Math.floor((timeline.length - 1) / step) * step;
                    if ((timeline.length - 1 - lastStepIdx) < step * 0.7) return null;
                  }

                  const barWidth = Math.max(8, Math.min(24, 380 / timeline.length));
                  const x = 40 + (idx / Math.max(1, timeline.length)) * 390 + barWidth / 2;

                  return (
                    <text key={idx} x={x} y={222} fill="var(--text-muted)" fontSize="10" textAnchor="middle">
                      {pt.label}
                    </text>
                  );
                })}
              </svg>
            )}
          </div>
        </div>
      </div>

      {/* Breakdown Section: Department Split & Payment Method Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {/* Department Revenue & Patient Distribution */}
        <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Building size={18} color="var(--primary-400)" />
            <span>Department Share Breakdown</span>
          </h3>

          {(analytics?.departmentBreakdown || []).length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No department breakdown data available.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {(analytics?.departmentBreakdown || []).slice(0, 6).map((dept, idx) => {
                const color = DEPT_COLORS[idx % DEPT_COLORS.length];
                const totalRev = analytics?.kpis.totalRevenue || 1;
                const percent = Math.round((dept.revenue / totalRev) * 100);

                return (
                  <div key={dept.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
                        <span>{dept.name}</span>
                      </span>
                      <span>
                        <strong style={{ color: '#fff' }}>Rs. {dept.revenue.toLocaleString()}</strong> ({dept.patientCount} patients)
                      </span>
                    </div>

                    <div style={{ width: '100%', height: '6px', background: 'var(--bg-surface)', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{ width: `${percent}%`, height: '100%', background: color, transition: 'width 0.4s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Payment Method Collection Share */}
        <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <CreditCard size={18} color="#34d399" />
            <span>Payment Mode Distribution</span>
          </h3>

          {(analytics?.paymentMethodBreakdown || []).length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No payment transactions recorded for selected filter.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {(analytics?.paymentMethodBreakdown || []).map((p) => {
                const color = METHOD_COLORS[p.method] || '#94a3b8';
                const totalColl = analytics?.kpis.totalCollected || 1;
                const percent = Math.round((p.amount / totalColl) * 100);

                return (
                  <div key={p.method} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 600, color: color }}>
                        {p.method.replace('_', ' ')}
                      </span>
                      <span>
                        <strong style={{ color: '#34d399' }}>Rs. {p.amount.toLocaleString()}</strong> ({p.count} txns)
                      </span>
                    </div>

                    <div style={{ width: '100%', height: '6px', background: 'var(--bg-surface)', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{ width: `${percent}%`, height: '100%', background: color, transition: 'width 0.4s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
