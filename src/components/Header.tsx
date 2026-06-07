import React from 'react';
import { useAuth } from '../context/AuthContext';
import { isMock } from '../utils/db';
import { Database, Wifi, ShieldAlert } from 'lucide-react';

interface HeaderProps {
  title: string;
}

export const Header: React.FC<HeaderProps> = ({ title }) => {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <header style={headerStyle}>
      <h1 style={titleStyle}>{title}</h1>

      <div style={statusContainerStyle}>
        {isMock ? (
          <div style={mockStatusBadgeStyle} title="Running locally on mock LocalStorage database. Zero configuration required!">
            <ShieldAlert size={14} style={{ animation: 'float 2s infinite ease-in-out' }} />
            <span>Local Mock Database</span>
            <span style={pulseDotStyle}></span>
          </div>
        ) : (
          <div style={liveStatusBadgeStyle} title="Fully connected to live Supabase backend.">
            <Wifi size={14} />
            <span>Supabase Live</span>
            <span style={solidDotStyle}></span>
          </div>
        )}

        <div style={verticalDivider}></div>

        <div style={welcomeTextStyle}>
          Welcome, <strong style={{ color: 'var(--text-primary)' }}>{user.name.split(' ')[0]}</strong>
        </div>
      </div>
    </header>
  );
};

// --- HEADER INLINE STYLES ---
const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '2rem',
  paddingBottom: '1rem',
  borderBottom: '1px solid var(--border-color)',
};

const titleStyle: React.CSSProperties = {
  fontSize: '1.75rem',
  fontWeight: 700,
  letterSpacing: '-0.02em',
  color: 'var(--text-primary)',
};

const statusContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
};

const mockStatusBadgeStyle: React.CSSProperties = {
  background: 'rgba(59, 130, 246, 0.08)',
  border: '1px solid rgba(59, 130, 246, 0.25)',
  borderRadius: 'var(--radius-full)',
  padding: '0.4rem 0.8rem',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  fontSize: '0.75rem',
  fontWeight: 500,
  color: '#60a5fa',
};

const liveStatusBadgeStyle: React.CSSProperties = {
  background: 'rgba(16, 185, 129, 0.08)',
  border: '1px solid rgba(16, 185, 129, 0.25)',
  borderRadius: 'var(--radius-full)',
  padding: '0.4rem 0.8rem',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  fontSize: '0.75rem',
  fontWeight: 500,
  color: '#34d399',
};

const pulseDotStyle: React.CSSProperties = {
  width: '6px',
  height: '6px',
  borderRadius: '50%',
  background: '#3b82f6',
  display: 'inline-block',
  animation: 'pulseBorder 2s infinite',
};

const solidDotStyle: React.CSSProperties = {
  width: '6px',
  height: '6px',
  borderRadius: '50%',
  background: '#10b981',
  display: 'inline-block',
};

const verticalDivider: React.CSSProperties = {
  width: '1px',
  height: '16px',
  background: 'var(--border-color)',
};

const welcomeTextStyle: React.CSSProperties = {
  fontSize: '0.85rem',
  color: 'var(--text-secondary)',
};
