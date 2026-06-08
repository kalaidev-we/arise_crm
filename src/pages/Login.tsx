import React, { useState } from 'react';
import { Link } from 'react-router-dom';
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

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Looking to use CRM OS for your agency? </span>
          <Link to="/request-access" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
            Request Access Setup
          </Link>
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


