import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Target, 
  Briefcase, 
  DollarSign, 
  Users, 
  LogOut,
  Building,
  Shield,
  KeyRound
} from 'lucide-react';

export const Sidebar: React.FC<{ isOpen?: boolean; onClose?: () => void }> = ({ isOpen, onClose }) => {
  const { user, logout, isAdmin, isSuperAdmin, companyName, companyLogoUrl, crmName, setChangePasswordModalOpen, permissions, customRoleName } = useAuth();

  if (!user) return null;

  return (
    <>
      {isOpen && <div className="mobile-overlay" onClick={onClose} style={overlayStyle} />}
      <aside style={sidebarStyle} className={`sidebar-container ${isOpen ? 'open' : ''}`}>
      <div style={logoContainerStyle}>
        {companyLogoUrl ? (
          <img 
            src={companyLogoUrl} 
            alt="Company Logo" 
            style={{ width: '24px', height: '24px', borderRadius: '4px', objectFit: 'cover', flexShrink: 0 }} 
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <Building size={24} style={{ color: 'var(--primary)', flexShrink: 0 }} />
        )}
        <div style={logoTextStyle}>
          <span style={logoMainStyle}>{crmName || 'AriseAgency'}</span>
          <span style={logoSubStyle}>CRM </span>
        </div>
      </div>

      <div style={companyTagStyle}>
        <span style={companyLabelStyle}>Tenant</span>
        <span style={companyNameStyle} title={companyName}>{companyName}</span>
      </div>

      <nav style={navStyle}>
        {isSuperAdmin && (
          <NavLink 
            to="/master-admin" 
            style={({ isActive }) => navItemStyle(isActive)}
          >
            <Shield size={18} />
            <span>Master Admin</span>
          </NavLink>
        )}

        {(!isSuperAdmin || localStorage.getItem('crm_impersonated_company_id')) && (
          <>
            {isSuperAdmin && (
              <div style={sidebarDividerStyle}>
                Workspace Support
              </div>
            )}
            <NavLink 
              to="/" 
              end
              style={({ isActive }) => navItemStyle(isActive)}
            >
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </NavLink>

            {permissions.canManageSales && (
              <NavLink 
                to="/crm" 
                style={({ isActive }) => navItemStyle(isActive)}
              >
                <Target size={18} />
                <span>CRM Pipeline</span>
              </NavLink>
            )}

            {permissions.canManageProjects && (
              <NavLink 
                to="/projects" 
                style={({ isActive }) => navItemStyle(isActive)}
              >
                <Briefcase size={18} />
                <span>Projects</span>
              </NavLink>
            )}

            {permissions.canViewFinance && (
              <NavLink 
                to="/finance" 
                style={({ isActive }) => navItemStyle(isActive)}
              >
                <DollarSign size={18} />
                <span>Finance Panel</span>
              </NavLink>
            )}

            {permissions.canManageTeam && (
              <NavLink 
                to="/employees" 
                style={({ isActive }) => navItemStyle(isActive)}
              >
                <Briefcase size={18} />
                <span>Manage Employees</span>
              </NavLink>
            )}

            {permissions.canManageTeam && (
              <NavLink 
                to="/admin" 
                style={({ isActive }) => navItemStyle(isActive)}
              >
                <Users size={18} />
                <span>Users & Access</span>
              </NavLink>
            )}
          </>
        )}
      </nav>

      <div style={userCardStyle}>
        <div style={avatarStyle}>
          {user.name.split(' ').map(n => n[0]).join('')}
        </div>
        <div style={userInfoStyle}>
          <div style={userNameStyle}>{user.name}</div>
          <div style={roleBadgeStyle(user.role)}>{customRoleName || user.role.toUpperCase()}</div>
        </div>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <button 
            onClick={() => setChangePasswordModalOpen(true)} 
            style={keyButtonStyle}
            title="Change Password"
          >
            <KeyRound size={16} />
          </button>
          <button 
            onClick={logout} 
            style={logoutButtonStyle}
            title="Logout Session"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
    </>
  );
};

// --- INLINE STYLES FOR PREMIUM SIDEBAR Layout ---
const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(15, 23, 42, 0.5)',
  backdropFilter: 'blur(4px)',
  zIndex: 90,
};

const sidebarStyle: React.CSSProperties = {
  width: '280px',
  background: 'var(--bg-sidebar)',
  borderRight: '1px solid var(--border-color)',
  padding: '1.75rem 1.25rem',
  display: 'flex',
  flexDirection: 'column',
  position: 'fixed',
  top: 0,
  bottom: 0,
  left: 0,
  zIndex: 100,
};

const logoContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  marginBottom: '1.5rem',
  paddingLeft: '0.5rem',
};

const logoTextStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
};

const logoMainStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: '1.15rem',
  fontWeight: 700,
  letterSpacing: '-0.02em',
  color: 'var(--text-primary)',
};

const logoSubStyle: React.CSSProperties = {
  fontSize: '0.7rem',
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  marginTop: '-2px',
};

const companyTagStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.03)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-sm)',
  padding: '0.6rem 0.8rem',
  marginBottom: '2rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.15rem',
};

const companyLabelStyle: React.CSSProperties = {
  fontSize: '0.65rem',
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  fontWeight: 600,
  letterSpacing: '0.05em',
};

const companyNameStyle: React.CSSProperties = {
  fontSize: '0.85rem',
  fontWeight: 500,
  color: 'var(--text-primary)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const navStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.35rem',
  flex: 1,
};

const navItemStyle = (isActive: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '0.85rem',
  padding: '0.8rem 1rem',
  borderRadius: 'var(--radius-sm)',
  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
  background: isActive ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
  border: '1px solid',
  borderColor: isActive ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
  fontSize: '0.9rem',
  fontWeight: isActive ? 500 : 400,
  textDecoration: 'none',
  transition: 'all var(--transition-fast)',
});

const userCardStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.02)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-sm)',
  padding: '0.75rem',
  display: 'flex',
  alignItems: 'center',
  gap: '0.65rem',
  marginTop: 'auto',
};

const avatarStyle: React.CSSProperties = {
  width: '36px',
  height: '36px',
  borderRadius: 'var(--radius-sm)',
  background: 'linear-gradient(135deg, var(--primary) 0%, #a78bfa 100%)',
  color: 'white',
  fontWeight: 600,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '0.85rem',
  flexShrink: 0,
};

const userInfoStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '0.15rem',
};

const userNameStyle: React.CSSProperties = {
  fontSize: '0.85rem',
  fontWeight: 600,
  color: 'var(--text-primary)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const roleBadgeStyle = (role: string): React.CSSProperties => {
  let color = 'var(--text-secondary)';
  let bg = 'rgba(255,255,255,0.05)';
  if (role === 'superadmin') {
    color = '#c084fc';
    bg = 'rgba(139, 92, 246, 0.15)';
  } else if (role === 'admin') {
    color = '#f87171';
    bg = 'rgba(239, 68, 68, 0.1)';
  } else if (role === 'manager') {
    color = '#fbbf24';
    bg = 'rgba(245, 158, 11, 0.1)';
  } else if (role === 'staff') {
    color = '#60a5fa';
    bg = 'rgba(59, 130, 246, 0.1)';
  }
  return {
    fontSize: '0.65rem',
    fontWeight: 700,
    color,
    background: bg,
    padding: '0.05rem 0.35rem',
    borderRadius: '4px',
    display: 'inline-block',
    width: 'fit-content',
  };
};

const logoutButtonStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: 'var(--text-muted)',
  cursor: 'pointer',
  padding: '0.4rem',
  borderRadius: 'var(--radius-sm)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all var(--transition-fast)',
};

const keyButtonStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: 'var(--text-muted)',
  cursor: 'pointer',
  padding: '0.4rem',
  borderRadius: 'var(--radius-sm)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all var(--transition-fast)',
};

const sidebarDividerStyle: React.CSSProperties = {
  fontSize: '0.65rem',
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  fontWeight: 700,
  letterSpacing: '0.05em',
  marginTop: '1.25rem',
  marginBottom: '0.5rem',
  paddingLeft: '0.5rem',
  borderTop: '1px solid var(--border-color)',
  paddingTop: '1rem',
};
