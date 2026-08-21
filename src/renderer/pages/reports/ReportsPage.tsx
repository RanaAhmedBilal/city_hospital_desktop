import React, { useState, useEffect } from 'react';
import { invokeIpc } from '../../lib/ipc';
import { DailyCollectionSummary } from '../../../shared/types';
import { AnalyticsGraphsView } from './AnalyticsGraphsView';
import {
  BarChart3,
  Calendar,
  Download,
  Filter,
  DollarSign,
  Users,
  Building,
  Sparkles,
  TrendingUp,
  PieChart,
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [activeReportTab, setActiveReportTab] = useState<'analytics' | 'collection' | 'doctors' | 'departments' | 'panels' | 'investigations'>('analytics');
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  const [dailyCollection, setDailyCollection] = useState<DailyCollectionSummary | null>(null);
  const [doctorStats, setDoctorStats] = useState<any[]>([]);
  const [deptStats, setDeptStats] = useState<any[]>([]);
  const [panelStats, setPanelStats] = useState<any[]>([]);
  const [invStats, setInvStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeReportTab !== 'analytics') {
      loadReportData();
    }
  }, [activeReportTab, dateRange]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      if (activeReportTab === 'collection') {
        const res = await invokeIpc<DailyCollectionSummary>('reports:daily-collection', { date: dateRange.startDate });
        if (res.success && res.data) setDailyCollection(res.data);
      } else if (activeReportTab === 'doctors') {
        const res = await invokeIpc<any[]>('reports:doctor-stats', dateRange);
        if (res.success && res.data) setDoctorStats(res.data);
      } else if (activeReportTab === 'departments') {
        const res = await invokeIpc<any[]>('reports:department-stats', dateRange);
        if (res.success && res.data) setDeptStats(res.data);
      } else if (activeReportTab === 'panels') {
        const res = await invokeIpc<any[]>('reports:panel-billing', dateRange);
        if (res.success && res.data) setPanelStats(res.data);
      } else if (activeReportTab === 'investigations') {
        const res = await invokeIpc<any[]>('reports:investigations', dateRange);
        if (res.success && res.data) setInvStats(res.data);
      }
    } catch (err) {
      console.error('Failed to load report:', err);
    } finally {
      setLoading(false);
    }
  };

  const exportToCsv = (filename: string, rows: any[]) => {
    if (!rows || rows.length === 0) return;
    const headers = Object.keys(rows[0]).join(',');
    const values = rows.map((r) => Object.values(r).map((v) => `"${v}"`).join(',')).join('\n');
    const csvContent = `${headers}\n${values}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${dateRange.startDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Report Switcher & Filter Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3 size={22} color="var(--primary-400)" />
            <span>Hospital Operational & Financial Reports</span>
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Real-time business intelligence, doctor productivity, collection audits, and corporate panel ledgers
          </p>
        </div>

        {activeReportTab !== 'analytics' && (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-surface)', padding: '0.35rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)' }}>
              <Calendar size={15} color="var(--text-muted)" />
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.85rem' }}
              />
              <span style={{ color: 'var(--text-muted)' }}>to</span>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.85rem' }}
              />
            </div>

            <button onClick={loadReportData} className="btn btn-secondary btn-sm">
              <span>Refresh</span>
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="scrollable-tabs-row">
        {[
          { id: 'analytics', label: 'Visual Analytics Graphs', icon: PieChart },
          { id: 'collection', label: 'Daily Collection', icon: DollarSign },
          { id: 'doctors', label: 'Doctor Productivity', icon: Users },
          { id: 'departments', label: 'Department Flow', icon: Building },
          { id: 'panels', label: 'Corporate Panel Ledgers', icon: TrendingUp },
          { id: 'investigations', label: 'Requested Tests Frequency', icon: Sparkles },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeReportTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveReportTab(tab.id as any)}
              className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flexShrink: 0 }}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 0. Visual Analytics Dashboard Tab */}
      {activeReportTab === 'analytics' && <AnalyticsGraphsView />}

      {/* 1. Daily Collection Report */}
      {activeReportTab === 'collection' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {dailyCollection && (
            <div className="responsive-grid-auto">
              <div className="card">
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total Billed Revenue</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                  Rs. {dailyCollection.totalRevenue.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Across {dailyCollection.invoiceCount} generated invoices</div>
              </div>

              <div className="card">
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Cash & Digital Collected</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#34d399', marginTop: '4px' }}>
                  Rs. {dailyCollection.totalCollected.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#34d399', marginTop: '4px' }}>{dailyCollection.paidCount} Fully settled invoices</div>
              </div>

              <div className="card">
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total Discounts Given</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fbbf24', marginTop: '4px' }}>
                  Rs. {dailyCollection.totalDiscount.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Hospital & Panel waivers</div>
              </div>

              <div className="card">
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Outstanding Receivables</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fda4af', marginTop: '4px' }}>
                  Rs. {dailyCollection.totalBalance.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Panel & pending balances</div>
              </div>
            </div>
          )}

          {/* Breakdown Tables */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="card">
              <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: 'var(--primary-400)' }}>Collection by Payment Method</h3>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Payment Mode</th>
                      <th style={{ textAlign: 'right' }}>Collected Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyCollection && Object.entries(dailyCollection.paymentMethodBreakdown).map(([mode, amt]) => (
                      <tr key={mode}>
                        <td><strong>{mode}</strong></td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#34d399' }}>Rs. {amt.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card">
              <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: 'var(--primary-400)' }}>Collection by Cashier Officer</h3>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Cashier User ID</th>
                      <th style={{ textAlign: 'right' }}>Shift Collection</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyCollection && Object.entries(dailyCollection.cashierBreakdown).map(([cashier, amt]) => (
                      <tr key={cashier}>
                        <td><strong>{cashier}</strong></td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#34d399' }}>Rs. {amt.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Doctor Productivity Report */}
      {activeReportTab === 'doctors' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem' }}>Doctor Consultation Volume & Revenue</h3>
            <button onClick={() => exportToCsv('Doctor_Stats', doctorStats)} className="btn btn-secondary btn-sm">
              <Download size={14} />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Doctor Name</th>
                  <th>Department</th>
                  <th style={{ textAlign: 'center' }}>Total Encounters</th>
                  <th style={{ textAlign: 'center' }}>Completed</th>
                  <th style={{ textAlign: 'center' }}>New / Follow-Up</th>
                  <th style={{ textAlign: 'right' }}>Billed Revenue</th>
                  <th style={{ textAlign: 'right' }}>Collected Revenue</th>
                </tr>
              </thead>
              <tbody>
                {doctorStats.length > 0 ? (
                  doctorStats.map((d) => (
                    <tr key={d.doctorId}>
                      <td style={{ fontWeight: 700 }}>{d.doctorName}</td>
                      <td>{d.department}</td>
                      <td style={{ textAlign: 'center', fontWeight: 800 }}>{d.totalVisits}</td>
                      <td style={{ textAlign: 'center', color: '#34d399' }}>{d.completedVisits}</td>
                      <td style={{ textAlign: 'center' }}>{d.newVisits} / {d.followUpVisits}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>Rs. {d.billedAmount.toLocaleString()}</td>
                      <td style={{ textAlign: 'right', color: '#34d399', fontWeight: 700 }}>Rs. {d.collectedAmount.toLocaleString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                      No doctor statistics found for selected date range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Department Flow Report */}
      {activeReportTab === 'departments' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem' }}>Department Patient Flow Distribution</h3>
            <button onClick={() => exportToCsv('Department_Stats', deptStats)} className="btn btn-secondary btn-sm">
              <Download size={14} />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Department Code</th>
                  <th>Department Name</th>
                  <th style={{ textAlign: 'center' }}>Patient Encounters</th>
                </tr>
              </thead>
              <tbody>
                {deptStats.map((dept) => (
                  <tr key={dept.departmentId}>
                    <td><span className="badge badge-purple">{dept.departmentCode}</span></td>
                    <td style={{ fontWeight: 700 }}>{dept.departmentName}</td>
                    <td style={{ textAlign: 'center', fontWeight: 800, color: 'var(--primary-400)', fontSize: '1rem' }}>{dept.visitCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Corporate Panel Ledgers */}
      {activeReportTab === 'panels' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem' }}>Corporate Panel Clients Receivable Ledger</h3>
            <button onClick={() => exportToCsv('Panel_Ledger', panelStats)} className="btn btn-secondary btn-sm">
              <Download size={14} />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Date</th>
                  <th>Corporate Organization</th>
                  <th>Patient Name (MRN)</th>
                  <th>Employee ID</th>
                  <th>Claim Ref</th>
                  <th style={{ textAlign: 'right' }}>Net Total</th>
                  <th style={{ textAlign: 'right' }}>Paid</th>
                  <th style={{ textAlign: 'right' }}>Receivable Due</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {panelStats.length > 0 ? (
                  panelStats.map((p) => (
                    <tr key={p.invoiceId}>
                      <td style={{ fontWeight: 800, color: 'var(--primary-400)' }}>{p.invoiceNumber}</td>
                      <td>{new Date(p.date).toLocaleDateString()}</td>
                      <td style={{ fontWeight: 700 }}>{p.panelClientName}</td>
                      <td>{p.patientName} ({p.mrn})</td>
                      <td>{p.employeeId || '—'}</td>
                      <td>{p.panelClaimNo || '—'}</td>
                      <td style={{ textAlign: 'right' }}>Rs. {p.netTotal.toLocaleString()}</td>
                      <td style={{ textAlign: 'right', color: '#34d399' }}>Rs. {p.paidTotal.toLocaleString()}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#fda4af' }}>Rs. {p.balanceTotal.toLocaleString()}</td>
                      <td><span className="badge badge-purple">{p.status}</span></td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                      No corporate panel invoices recorded in this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Requested Investigations Frequency */}
      {activeReportTab === 'investigations' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem' }}>Doctor-Requested Diagnostic Investigations Frequency</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Statistical frequency of ordered laboratory tests and radiological imaging</p>
            </div>
            <button onClick={() => exportToCsv('Investigations_Frequency', invStats)} className="btn btn-secondary btn-sm">
              <Download size={14} />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>Rank</th>
                  <th>Test / Investigation Name</th>
                  <th>Category</th>
                  <th style={{ textAlign: 'center' }}>Total Doctor Prescriptions</th>
                </tr>
              </thead>
              <tbody>
                {invStats.length > 0 ? (
                  invStats.map((inv, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 800, color: 'var(--primary-400)' }}>#{idx + 1}</td>
                      <td style={{ fontWeight: 700 }}>{inv.name}</td>
                      <td><span className="badge badge-blue">{inv.category}</span></td>
                      <td style={{ textAlign: 'center', fontWeight: 800, fontSize: '1.05rem', color: '#38bdf8' }}>{inv.count}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                      No investigation orders recorded for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
