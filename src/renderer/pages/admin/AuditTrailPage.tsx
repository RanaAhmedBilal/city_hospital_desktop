import React, { useState, useEffect } from 'react';
import { invokeIpc } from '../../lib/ipc';
import { ShieldCheck, Filter, Calendar, Search, Eye } from 'lucide-react';
import { Modal } from '../../components/common/Modal';

export const AuditTrailPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [loading, setLoading] = useState(false);

  const [selectedLog, setSelectedLog] = useState<any>(null);

  useEffect(() => {
    loadLogs();
  }, [actionFilter, entityFilter]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await invokeIpc('audit:get-logs', {
        action: actionFilter || undefined,
        entityType: entityFilter || undefined,
        limit: 100,
      });
      if (res.success && res.data) {
        setLogs(res.data.logs || []);
        setTotal(res.data.total || 0);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={22} color="var(--primary-400)" />
            <span>System Audit Trail & Immutability Logs</span>
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Complete forensic log of clinical diagnoses, prescription amendments, financial transactions, and master modifications
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-surface)', padding: '0.35rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)' }}>
            <Filter size={15} color="var(--text-muted)" />
            <select
              className="select"
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              style={{ border: 'none', background: 'transparent', padding: '0', fontSize: '0.85rem' }}
            >
              <option value="">All Entities</option>
              <option value="Patient">Patient</option>
              <option value="Visit">Visit</option>
              <option value="VisitVitals">Visit Vitals</option>
              <option value="Consultation">Consultation</option>
              <option value="Prescription">Prescription</option>
              <option value="Invoice">Invoice</option>
              <option value="Payment">Payment</option>
              <option value="FinancialAdjustment">Financial Adjustment</option>
              <option value="User">User</option>
            </select>
          </div>

          <button onClick={loadLogs} className="btn btn-secondary btn-sm">
            Refresh Logs
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 style={{ fontSize: '1.05rem' }}>Audit Event Records ({total} total)</h3>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User / Operator</th>
                <th>Action Type</th>
                <th>Target Entity</th>
                <th>Reason / Summary</th>
                <th>Inspector</th>
              </tr>
            </thead>
            <tbody>
              {logs.length > 0 ? (
                logs.map((log) => {
                  let actionBadge = 'badge-slate';
                  if (log.action.includes('REGISTER') || log.action.includes('CREATE')) actionBadge = 'badge-blue';
                  if (log.action.includes('FINALIZE') || log.action.includes('LOGIN')) actionBadge = 'badge-emerald';
                  if (log.action.includes('AMEND') || log.action.includes('UPDATE')) actionBadge = 'badge-amber';
                  if (log.action.includes('VOID') || log.action.includes('REFUND')) actionBadge = 'badge-rose';

                  return (
                    <tr key={log.id}>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(log.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td>
                        <div style={{ fontWeight: 700 }}>{log.userName || 'System'}</div>
                        {log.userRole && <div style={{ fontSize: '0.7rem', color: 'var(--primary-400)' }}>{log.userRole}</div>}
                      </td>
                      <td>
                        <span className={`badge ${actionBadge}`}>{log.action}</span>
                      </td>
                      <td>
                        <strong>{log.entityType}</strong> {log.entityId ? <code style={{ fontSize: '0.72rem' }}>({log.entityId.substring(0, 8)}...)</code> : ''}
                      </td>
                      <td style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                        {log.reason || '—'}
                      </td>
                      <td>
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                        >
                          <Eye size={13} />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2.5rem' }}>
                    {loading ? 'Reading audit trail records...' : 'No audit records match the current filter.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Inspector Modal */}
      <Modal isOpen={!!selectedLog} onClose={() => setSelectedLog(null)} title="Audit Event Snapshot Inspector" maxWidth="750px">
        {selectedLog && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.85rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', background: 'var(--bg-surface-elevated)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
              <div><strong>Action:</strong> {selectedLog.action}</div>
              <div><strong>Entity:</strong> {selectedLog.entityType}</div>
              <div><strong>Operator:</strong> {selectedLog.userName}</div>
              <div><strong>Timestamp:</strong> {new Date(selectedLog.timestamp).toLocaleString()}</div>
              <div><strong>IP Address:</strong> {selectedLog.ipAddress || '127.0.0.1'}</div>
              <div><strong>Entity ID:</strong> {selectedLog.entityId || '—'}</div>
            </div>

            {selectedLog.reason && (
              <div style={{ background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.3)', padding: '0.6rem', borderRadius: 'var(--radius-sm)', color: '#fde047' }}>
                <strong>Justification Reason:</strong> {selectedLog.reason}
              </div>
            )}

            {selectedLog.oldValue && (
              <div>
                <label className="form-label">Previous Value Snapshot (Pre-Mutation)</label>
                <pre style={{ background: '#0b1120', padding: '0.75rem', borderRadius: 'var(--radius-sm)', color: '#fda4af', overflowX: 'auto', maxHeight: '150px', fontSize: '0.75rem' }}>
                  {JSON.stringify(JSON.parse(selectedLog.oldValue), null, 2)}
                </pre>
              </div>
            )}

            {selectedLog.newValue && (
              <div>
                <label className="form-label">New Value Snapshot (Post-Mutation)</label>
                <pre style={{ background: '#0b1120', padding: '0.75rem', borderRadius: 'var(--radius-sm)', color: '#6ee7b7', overflowX: 'auto', maxHeight: '150px', fontSize: '0.75rem' }}>
                  {JSON.stringify(JSON.parse(selectedLog.newValue), null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
