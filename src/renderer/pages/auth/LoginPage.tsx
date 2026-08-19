import React, { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { Building2, Lock, User, KeyRound, AlertCircle, ArrowRight, Shield } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { setUser } = useAuthStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // @ts-ignore
      if (window.api?.login) {
        // @ts-ignore
        const res = await window.api.login({ username, password });
        if (res.success && res.data) {
          setUser(res.data.user, res.data.token);
        } else {
          setError(res.error || 'Invalid credentials');
        }
      } else {
        // Fallback for browser dev mode
        const demoUsers: Record<string, any> = {
          admin: { id: 'usr-admin', username: 'admin', fullName: 'Hospital Administrator', roles: ['ADMINISTRATOR'], permissions: ['*'], doctorId: null },
          reception: { id: 'usr-rec', username: 'reception', fullName: 'Front Desk Receptionist', roles: ['RECEPTION'], permissions: ['patient:create', 'patient:read', 'patient:update_demographics', 'patient:view_full_history', 'visit:create', 'visit:read', 'visit:update_status', 'visit:cancel', 'vitals:record', 'vitals:read', 'consultation:read', 'prescription:print', 'billing:create_charge', 'billing:create_invoice', 'billing:receive_payment', 'billing:apply_discount', 'billing:print_slip', 'report:view_operational'], doctorId: null },
        };
        const u = demoUsers[username] || demoUsers['admin'];
        setUser(u, 'demo-token-123');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const setDemoUser = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError(null);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-main)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '460px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-xl)',
          padding: '2rem 1.5rem',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{
            width: '56px',
            height: '56px',
            backgroundColor: 'var(--primary-700)',
            borderRadius: 'var(--radius-md)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 0 25px rgba(20, 184, 166, 0.4)',
            marginBottom: '0.75rem',
          }}>
            <Building2 size={30} />
          </div>
          <h2 style={{ fontSize: '1.4rem', color: '#f8fafc', fontWeight: 800 }}>City Hospital</h2>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Hospital Management System • Secure Healthcare Gateway
          </p>
        </div>

        {/* Error Box */}
        {error && (
          <div style={{
            backgroundColor: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.4)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.65rem 0.85rem',
            color: '#fda4af',
            fontSize: '0.825rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1.25rem',
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="form-label">Username</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                required
                style={{ paddingLeft: '2.4rem' }}
              />
              <User size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>

          <div>
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{ paddingLeft: '2.4rem' }}
              />
              <KeyRound size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-lg"
            style={{ width: '100%', marginTop: '0.5rem' }}
          >
            <span>{loading ? 'Authenticating...' : 'Sign In to Hospital Portal'}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Quick Demo Role Switcher */}
        <div style={{ marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.65rem' }}>
            Quick Role Switcher (Pre-configured Users)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.6rem' }}>
            <button
              type="button"
              onClick={() => setDemoUser('admin', 'admin123')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.8rem', justifyContent: 'center', padding: '0.55rem' }}
            >
              👑 Administrator
            </button>
            <button
              type="button"
              onClick={() => setDemoUser('reception', 'reception123')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.8rem', justifyContent: 'center', padding: '0.55rem' }}
            >
              📋 Receptionist
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
