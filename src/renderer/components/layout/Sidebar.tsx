import React from 'react';
import { useAuthStore } from '../../stores/authStore';
import { RoleType } from '../../../shared/constants/roles';
import {
  LayoutDashboard,
  Users,
  CalendarClock,
  Activity,
  FlaskConical,
  Receipt,
  BarChart3,
  Settings,
  ShieldCheck,
  X,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isCollapsed?: boolean;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isCollapsed = false,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const { hasPermission, hasRole } = useAuthStore();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, show: true },
    { id: 'patients', label: 'Patients', icon: Users, show: hasPermission('patient:read') },
    { id: 'visits', label: 'OPD Queue', icon: CalendarClock, show: hasPermission('visit:read') },
    { id: 'vitals', label: 'Triage / Vitals', icon: Activity, show: hasPermission('vitals:read') },
    { id: 'lab', label: 'Lab Orders & Sampling', icon: FlaskConical, show: hasPermission('billing:create_charge') || hasPermission('visit:read') },
    { id: 'billing', label: 'Billing & Cashier', icon: Receipt, show: hasPermission('billing:create_invoice') || hasPermission('billing:create_charge') || hasPermission('billing:print_slip') },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3, show: hasRole(RoleType.ADMINISTRATOR) },
    { id: 'masters', label: 'Master Data & Admin', icon: Settings, show: hasPermission('admin:manage_masters') || hasPermission('admin:manage_users') },
    { id: 'audit', label: 'Audit Trail', icon: ShieldCheck, show: hasPermission('admin:audit_logs') },
  ];

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 40,
          }}
        />
      )}

      <aside
        style={{
          width: isCollapsed ? '64px' : '230px',
          backgroundColor: 'var(--bg-surface)',
          borderRight: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          padding: isCollapsed ? '1rem 0.35rem' : '1rem 0.75rem',
          gap: '0.35rem',
          userSelect: 'none',
          transition: 'width 0.2s ease, transform 0.2s ease',
          flexShrink: 0,
          overflowY: 'auto',
          ...(isMobileOpen
            ? {
                position: 'fixed',
                left: 0,
                top: 0,
                bottom: 0,
                width: '260px',
                zIndex: 50,
                boxShadow: '0 0 30px rgba(0, 0, 0, 0.7)',
                padding: '1.25rem 1rem',
              }
            : {}),
        }}
      >
        {isMobileOpen && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--primary-400)' }}>Navigation Menu</span>
            <button
              onClick={onCloseMobile}
              className="btn btn-secondary btn-sm"
              style={{ padding: '0.25rem 0.5rem' }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {!isCollapsed && (
          <div style={{ padding: '0.25rem 0.5rem 0.5rem', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Navigation
          </div>
        )}

        {navItems
          .filter((item) => item.show)
          .map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (onCloseMobile) onCloseMobile();
                }}
                title={isCollapsed ? item.label : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                  gap: isCollapsed ? 0 : '0.75rem',
                  padding: isCollapsed ? '0.65rem' : '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid',
                  borderColor: isActive ? 'rgba(20, 184, 166, 0.4)' : 'transparent',
                  backgroundColor: isActive ? 'rgba(15, 118, 110, 0.2)' : 'transparent',
                  color: isActive ? 'var(--primary-400)' : 'var(--text-secondary)',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'var(--bg-surface-elevated)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }
                }}
              >
                <Icon size={18} color={isActive ? 'var(--primary-400)' : 'var(--text-muted)'} />
                {!isCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
      </aside>
    </>
  );
};
