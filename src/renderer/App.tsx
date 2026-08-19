import React, { useState, useEffect } from 'react';
import { useAuthStore } from './stores/authStore';
import { invokeIpc } from './lib/ipc';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { PatientSafetyBanner } from './components/layout/PatientSafetyBanner';
import { LoginPage } from './pages/auth/LoginPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { PatientListPage } from './pages/patients/PatientListPage';
import { PatientProfilePage } from './pages/patients/PatientProfilePage';
import { VisitQueuePage } from './pages/visits/VisitQueuePage';
import { VitalsTriagePage } from './pages/vitals/VitalsTriagePage';
import { LabOrdersPage } from './pages/lab/LabOrdersPage';
import { BillingPage } from './pages/billing/BillingPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { AdminMasterPage } from './pages/admin/AdminMasterPage';
import { AuditTrailPage } from './pages/admin/AuditTrailPage';

export const App: React.FC = () => {
  const { user, token, logout, setUser } = useAuthStore();
  const [isValidating, setIsValidating] = useState<boolean>(!!token);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedPatientProfileId, setSelectedPatientProfileId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarCollapsed(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleToggleSidebar = () => {
    if (window.innerWidth < 1024) {
      setIsMobileSidebarOpen(!isMobileSidebarOpen);
    } else {
      setIsSidebarCollapsed(!isSidebarCollapsed);
    }
  };

  useEffect(() => {
    if (token) {
      invokeIpc('auth:get-current-user').then((res) => {
        if (res.success && res.data) {
          setUser(res.data, token);
        } else {
          logout();
        }
        setIsValidating(false);
      });
    } else {
      setIsValidating(false);
    }
  }, []);

  if (isValidating) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg-main)',
          color: 'var(--text-secondary)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--primary-400)' }}>Verifying session credentials...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const renderContent = () => {
    if (selectedPatientProfileId) {
      return (
        <PatientProfilePage
          patientId={selectedPatientProfileId}
          onBack={() => setSelectedPatientProfileId(null)}
          onSelectVisitForConsultation={() => {
            setSelectedPatientProfileId(null);
            setActiveTab('vitals');
          }}
        />
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage onNavigate={(tab) => setActiveTab(tab)} />;
      case 'patients':
        return (
          <PatientListPage
            onSelectPatient={() => setActiveTab('visits')}
            onOpenProfile={(id) => setSelectedPatientProfileId(id)}
          />
        );
      case 'visits':
        return (
          <VisitQueuePage
            onNavigateToVitals={() => setActiveTab('vitals')}
            onNavigateToLab={() => setActiveTab('lab')}
            onNavigateToBilling={() => setActiveTab('billing')}
            onNavigateToPatients={() => setActiveTab('patients')}
          />
        );
      case 'vitals':
        return (
          <VitalsTriagePage
            onNavigateToBilling={() => setActiveTab('billing')}
            onNavigateToLab={() => setActiveTab('lab')}
          />
        );
      case 'lab':
        return (
          <LabOrdersPage
            onNavigateToBilling={() => setActiveTab('billing')}
            onNavigateToQueue={() => setActiveTab('visits')}
          />
        );
      case 'billing':
        return <BillingPage />;
      case 'reports':
        return <ReportsPage />;
      case 'masters':
        return <AdminMasterPage />;
      case 'audit':
        return <AuditTrailPage />;
      default:
        return <DashboardPage onNavigate={(tab) => setActiveTab(tab)} />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <Navbar onToggleSidebar={handleToggleSidebar} />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        <Sidebar
          activeTab={activeTab}
          isCollapsed={isSidebarCollapsed}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          setActiveTab={(tab) => {
            setSelectedPatientProfileId(null);
            setActiveTab(tab);
          }}
        />

        <main
          className="app-main-content"
          style={{
            flex: 1,
            backgroundColor: 'var(--bg-main)',
            overflowY: 'auto',
            padding: '1.25rem 1.75rem',
            minWidth: 0,
          }}
        >
          {/* Patient Safety Banner rendered globally across clinical workflows */}
          <PatientSafetyBanner />

          {renderContent()}
        </main>
      </div>
    </div>
  );
};
