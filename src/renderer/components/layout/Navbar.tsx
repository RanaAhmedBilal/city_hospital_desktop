import React from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { Building2, User, LogOut, Menu, Sun, Moon } from 'lucide-react';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  return (
    <header
      className="navbar-container"
      style={{
        height: '60px',
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.5rem',
        zIndex: 30,
        position: 'sticky',
        top: 0,
      }}
    >
      {/* Brand Header & Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="btn btn-secondary btn-sm"
            style={{ padding: '0.35rem 0.5rem', display: 'flex', alignItems: 'center' }}
            title="Toggle Navigation Menu"
          >
            <Menu size={18} />
          </button>
        )}
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'var(--primary-700)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          boxShadow: '0 0 15px rgba(20, 184, 166, 0.4)',
          flexShrink: 0,
        }}>
          <Building2 size={20} />
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>CITY HOSPITAL</span>
            <span style={{ fontSize: '0.65rem', padding: '2px 6px', background: 'rgba(20, 184, 166, 0.2)', color: 'var(--primary-400)', borderRadius: '4px', border: '1px solid rgba(20, 184, 166, 0.3)' }}>HMS</span>
          </div>
          <div className="brand-subtext" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Hospital Management Information System</div>
        </div>
      </div>

      {/* User & Theme Status Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Theme Mode Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          className="btn btn-secondary btn-sm"
          title={`Switch to ${theme === 'dark' ? 'Light Mode (White Theme)' : 'Dark Mode (Dark Slate Theme)'}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.35rem 0.75rem',
            borderRadius: 'var(--radius-sm)',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {theme === 'dark' ? (
            <>
              <Sun size={15} color="#fbbf24" />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <Moon size={15} color="#818cf8" />
              <span>Dark Mode</span>
            </>
          )}
        </button>

        {user && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            background: 'var(--bg-surface-elevated)',
            padding: '0.35rem 0.75rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-default)',
          }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary-800)',
              color: 'var(--primary-400)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 700,
            }}>
              <User size={15} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {user.fullName}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--primary-400)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {user.roles.join(', ')}
              </div>
            </div>
          </div>
        )}

        <button
          onClick={logout}
          className="btn btn-secondary btn-sm"
          title="Sign Out of Session"
          style={{ color: '#fda4af' }}
        >
          <LogOut size={14} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
};
