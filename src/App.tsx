import React, { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Menu } from 'lucide-react';
import { Header } from './components/Header';
import { Login } from './pages/Login';
import { RequestAccess } from './pages/RequestAccess';
import { Dashboard } from './pages/Dashboard';
import { Leads } from './pages/Leads';
import { Deals } from './pages/Deals';
import { Projects } from './pages/Projects';
import { ProjectDetails } from './pages/ProjectDetails';
import { Finance } from './pages/Finance';
import { CompanyAdmin } from './pages/CompanyAdmin';
import { MasterAdmin } from './pages/MasterAdmin';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { ShieldAlert } from 'lucide-react';

// Tabbed CRM Pipeline Page switcher
const CrmPipeline = () => {
  const [activeTab, setActiveTab] = useState<'leads' | 'deals'>('leads');
  return (
    <div className="anim-fade" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setActiveTab('leads')}
          className="btn"
          style={{
            background: activeTab === 'leads' ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
            borderColor: activeTab === 'leads' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'leads' ? 'var(--text-primary)' : 'var(--text-secondary)',
            padding: '0.5rem 1rem'
          }}
        >
          Leads Database
        </button>
        <button
          onClick={() => setActiveTab('deals')}
          className="btn"
          style={{
            background: activeTab === 'deals' ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
            borderColor: activeTab === 'deals' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'deals' ? 'var(--text-primary)' : 'var(--text-secondary)',
            padding: '0.5rem 1rem'
          }}
        >
          Deals Pipeline
        </button>
      </div>

      {activeTab === 'leads' ? <Leads /> : <Deals />}
    </div>
  );
};

// Role Guards
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const SuperAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isSuperAdmin, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!isSuperAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const App: React.FC = () => {
  const { user, loading, setChangePasswordModalOpen } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <span>Initializing AriseAgency CRM...</span>
      </div>
    );
  }

  // Determine active title based on path for Header
  const getHeaderTitle = () => {
    switch (location.pathname) {
      case '/': return 'Workspace Overview';
      case '/crm': return 'CRM Sales Pipeline';
      case '/projects': return 'Projects Space';
      case '/finance': return 'Agency Financials';
      case '/admin': return 'Company User Administration';
      case '/master-admin': return 'System Master Administration';
      default:
        if (location.pathname.startsWith('/projects/')) return 'Project Execution Details';
        return 'Dashboard';
    }
  };

  return (
    <div className="app-container">
      {user && <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />}
      
      <main className="main-content" style={user ? {} : { marginLeft: 0, padding: 0 }}>
        {user && (
          <div className="mobile-header-toggle">
            <button onClick={() => setIsMobileMenuOpen(true)} className="btn btn-ghost" style={{ padding: '0.5rem 0' }}>
              <Menu size={24} />
            </button>
          </div>
        )}
        {user && <Header title={getHeaderTitle()} />}
        
        {user?.is_default_password && (
          <div style={warningBannerStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
              <ShieldAlert size={16} style={{ color: '#f87171', flexShrink: 0 }} />
              <span>
                <strong>Security Notice:</strong> You are logged in with a default password. Please update your password to secure your account.
              </span>
            </div>
            <button 
              onClick={() => setChangePasswordModalOpen(true)} 
              className="btn btn-secondary"
              style={bannerBtnStyle}
            >
              Change Password
            </button>
          </div>
        )}
        
        <Routes>
          {/* Public Login Route */}
          <Route 
            path="/login" 
            element={user ? <Navigate to="/" replace /> : <Login />} 
          />

          {/* Public Request Access Route */}
          <Route 
            path="/request-access" 
            element={user ? <Navigate to="/" replace /> : <RequestAccess />} 
          />

          {/* Protected General Routes */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                {user?.role === 'superadmin' ? <Navigate to="/master-admin" replace /> : <Dashboard />}
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/crm" 
            element={
              <ProtectedRoute>
                <CrmPipeline />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/projects" 
            element={
              <ProtectedRoute>
                <Projects />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/projects/:id" 
            element={
              <ProtectedRoute>
                <ProjectDetails />
              </ProtectedRoute>
            } 
          />

          {/* Admin Restricted Routes */}
          <Route 
            path="/finance" 
            element={
              <AdminRoute>
                <Finance />
              </AdminRoute>
            } 
          />

          <Route 
            path="/admin" 
            element={
              <AdminRoute>
                <CompanyAdmin />
              </AdminRoute>
            } 
          />

          {/* SuperAdmin Restricted Routes */}
          <Route 
            path="/master-admin" 
            element={
              <SuperAdminRoute>
                <MasterAdmin />
              </SuperAdminRoute>
            } 
          />

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <ChangePasswordModal />
    </div>
  );
};

// --- WARNING BANNER STYLES ---
const warningBannerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  background: 'var(--danger-bg)',
  border: '1px solid rgba(239, 68, 68, 0.25)',
  borderRadius: 'var(--radius-sm)',
  padding: '0.85rem 1.25rem',
  marginBottom: '1.5rem',
  color: 'var(--text-primary)',
  fontSize: '0.85rem',
  gap: '1rem',
  flexWrap: 'wrap',
};

const bannerBtnStyle: React.CSSProperties = {
  padding: '0.4rem 0.8rem',
  fontSize: '0.75rem',
  background: 'rgba(239, 68, 68, 0.1)',
  borderColor: 'rgba(239, 68, 68, 0.3)',
  color: '#f87171',
  cursor: 'pointer',
};

export default App;
