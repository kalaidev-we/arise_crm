import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Building, ShieldAlert, KeyRound, Mail } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoggingIn(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
      setLoggingIn(false);
    }
  };

  const handleQuickLogin = async (emailChoice: string, passwordChoice: string) => {
    setEmail(emailChoice);
    setPassword(passwordChoice);
    setError(null);
    setLoggingIn(true);
    try {
      await login(emailChoice, passwordChoice);
    } catch (err: any) {
      setError(err.message || 'Login failed.');
      setLoggingIn(false);
    }
  };

  // Seed profiles helper (matches 04_seed.sql)
  const quickProfiles = [
    {
      company: 'Acme Creative Agency (Co A)',
      users: [
        { name: 'Alice Admin', email: 'alice@acme.com', pass: 'adminpass', role: 'admin', color: 'rgba(239, 68, 68, 0.15)', text: '#f87171' },
        { name: 'Bob Manager', email: 'bob@acme.com', pass: 'managerpass', role: 'manager', color: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24' },
        { name: 'Charlie Staff', email: 'charlie@acme.com', pass: 'staffpass', role: 'staff', color: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa' }
      ]
    },
    {
      company: 'Delta Tech Solutions (Co B)',
      users: [
        { name: 'Dave Admin', email: 'dave@delta.com', pass: 'davepass', role: 'admin', color: 'rgba(239, 68, 68, 0.15)', text: '#f87171' },
        { name: 'Eve Manager', email: 'eve@delta.com', pass: 'evepass', role: 'manager', color: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24' },
        { name: 'Frank Staff', email: 'frank@delta.com', pass: 'frankpass', role: 'staff', color: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa' }
      ]
    }
  ];

  return (
    <div style={loginContainerStyle} className="anim-fade">
      <div style={floatingGradientStyle}></div>
      <div style={floatingGradientStyle2}></div>

      <div className="glass-panel" style={loginCardStyle}>
        <div style={loginHeaderStyle}>
          <div style={logoWrapperStyle}>
            <Building size={32} style={{ color: 'var(--primary)' }} />
          </div>
          <h2 style={loginTitleStyle}>Sign in to CRM OS</h2>
          <p style={loginSubTitleStyle}>Multi-tenant Agency Operating System</p>
        </div>

        {error && (
          <div style={errorBannerStyle}>
            <ShieldAlert size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={formStyle}>
          <div className="form-group">
            <label className="form-label" style={{ color: 'var(--text-secondary)' }}>Email Address</label>
            <div style={inputWrapperStyle}>
              <Mail size={16} style={inputIconStyle} />
              <input
                type="email"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ color: 'var(--text-secondary)' }}>Password</label>
            <div style={inputWrapperStyle}>
              <KeyRound size={16} style={inputIconStyle} />
              <input
                type="password"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.85rem', marginTop: '0.5rem' }}
            disabled={loggingIn}
          >
            {loggingIn ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={quickSectionDivider}>
          <span style={quickSectionDividerText}>Demo Accounts Presets</span>
        </div>

        {/* Master System Admin Preset */}
        <div style={{ marginBottom: '1.25rem' }}>
          <button
            type="button"
            onClick={() => handleQuickLogin('master@crm.com', 'masterpass')}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(59, 130, 246, 0.12) 100%)',
              border: '1px solid rgba(139, 92, 246, 0.25)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.6rem 1rem',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: email === 'master@crm.com' ? '0 0 12px rgba(139, 92, 246, 0.3)' : 'none',
              borderColor: email === 'master@crm.com' ? '#c084fc' : 'rgba(139, 92, 246, 0.25)'
            }}
            disabled={loggingIn}
          >
            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>System Master Administration</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>master@crm.com (Bypasses Tenant Restrictions)</span>
            </div>
            <span style={{
              fontSize: '0.6rem',
              fontWeight: 700,
              background: 'rgba(139, 92, 246, 0.15)',
              color: '#c084fc',
              padding: '0.15rem 0.45rem',
              borderRadius: '4px',
              textTransform: 'uppercase'
            }}>
              SUPERUSER
            </span>
          </button>
        </div>

        <div style={demoGridContainer}>
          {quickProfiles.map((company, index) => (
            <div key={index} style={companyDemoCol}>
              <div style={companyHeaderLabel}>{company.company}</div>
              <div style={demoUserList}>
                {company.users.map((u, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleQuickLogin(u.email, u.pass)}
                    style={demoUserItemStyle(email === u.email)}
                    disabled={loggingIn}
                  >
                    <div style={demoUserNameRow}>
                      <span style={{ fontWeight: 600 }}>{u.name.split(' ')[0]}</span>
                      <span style={rolePillStyle(u.color, u.text)}>{u.role}</span>
                    </div>
                    <div style={demoUserEmailRow}>{u.email}</div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- LOGIN INLINE STYLES ---
const loginContainerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '100vh',
  width: '100vw',
  background: 'var(--bg-app)',
  padding: '2rem',
  position: 'relative',
  overflow: 'hidden',
};

const floatingGradientStyle: React.CSSProperties = {
  position: 'absolute',
  width: '400px',
  height: '400px',
  borderRadius: '50%',
  background: 'radial-gradient(circle, rgba(37, 99, 235, 0.12) 0%, transparent 70%)',
  top: '-10%',
  left: '10%',
  pointerEvents: 'none',
};

const floatingGradientStyle2: React.CSSProperties = {
  position: 'absolute',
  width: '450px',
  height: '450px',
  borderRadius: '50%',
  background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%)',
  bottom: '-10%',
  right: '10%',
  pointerEvents: 'none',
};

const loginCardStyle: React.CSSProperties = {
  maxWidth: '560px',
  width: '100%',
  padding: '2.5rem',
  background: 'var(--bg-card)',
  zIndex: 10,
};

const loginHeaderStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  marginBottom: '2rem',
};

const logoWrapperStyle: React.CSSProperties = {
  background: 'rgba(37, 99, 235, 0.1)',
  padding: '0.75rem',
  borderRadius: 'var(--radius-sm)',
  marginBottom: '1rem',
};

const loginTitleStyle: React.CSSProperties = {
  fontSize: '1.5rem',
  fontWeight: 700,
  letterSpacing: '-0.02em',
  marginBottom: '0.25rem',
};

const loginSubTitleStyle: React.CSSProperties = {
  fontSize: '0.875rem',
  color: 'var(--text-secondary)',
};

const errorBannerStyle: React.CSSProperties = {
  background: 'var(--danger-bg)',
  border: '1px solid rgba(239, 68, 68, 0.3)',
  borderRadius: 'var(--radius-sm)',
  padding: '0.75rem 1rem',
  color: '#f87171',
  fontSize: '0.85rem',
  display: 'flex',
  alignItems: 'center',
  gap: '0.65rem',
  marginBottom: '1.5rem',
};

const formStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
};

const inputWrapperStyle: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
};

const inputIconStyle: React.CSSProperties = {
  position: 'absolute',
  left: '1rem',
  color: 'var(--text-muted)',
  pointerEvents: 'none',
};

const quickSectionDivider: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginTop: '2.25rem',
  marginBottom: '1.25rem',
};

const quickSectionDividerText: React.CSSProperties = {
  background: 'var(--bg-app)',
  padding: '0 0.75rem',
  fontSize: '0.75rem',
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  fontWeight: 600,
  zIndex: 1,
};

const demoGridContainer: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '1rem',
};

const companyDemoCol: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
};

const companyHeaderLabel: React.CSSProperties = {
  fontSize: '0.7rem',
  fontWeight: 600,
  color: 'var(--text-secondary)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const demoUserList: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.4rem',
};

const demoUserItemStyle = (isSelected: boolean): React.CSSProperties => ({
  background: isSelected ? 'rgba(37, 99, 235, 0.08)' : 'rgba(0, 0, 0, 0.02)',
  border: '1px solid',
  borderColor: isSelected ? 'var(--primary)' : 'var(--border-color)',
  borderRadius: 'var(--radius-sm)',
  padding: '0.5rem 0.65rem',
  textAlign: 'left',
  cursor: 'pointer',
  transition: 'all var(--transition-fast)',
});

const demoUserNameRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  fontSize: '0.8rem',
  color: 'var(--text-primary)',
};

const rolePillStyle = (bg: string, text: string): React.CSSProperties => ({
  fontSize: '0.6rem',
  fontWeight: 700,
  background: bg,
  color: text,
  padding: '0.05rem 0.3rem',
  borderRadius: '4px',
  textTransform: 'uppercase',
});

const demoUserEmailRow: React.CSSProperties = {
  fontSize: '0.7rem',
  color: 'var(--text-muted)',
  marginTop: '0.1rem',
};
