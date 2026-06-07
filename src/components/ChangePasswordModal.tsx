import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, KeyRound, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';

export const ChangePasswordModal: React.FC = () => {
  const { 
    changePasswordModalOpen, 
    setChangePasswordModalOpen, 
    updatePassword,
    user
  } = useAuth();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!changePasswordModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSaving(true);
    try {
      await updatePassword(newPassword);
      setSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setSuccess(false);
        setChangePasswordModalOpen(false);
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to update password. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '440px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <KeyRound size={20} style={{ color: 'var(--primary)' }} />
            <h3 style={{ fontSize: '1.2rem' }}>Change Account Password</h3>
          </div>
          <button 
            onClick={() => setChangePasswordModalOpen(false)} 
            className="btn btn-ghost"
            style={{ padding: '0.25rem', display: 'flex', alignItems: 'center' }}
            disabled={saving}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {user?.is_default_password && !success && (
              <div style={infoBannerStyle}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>You are currently using a default password. Please update it to secure your account.</span>
              </div>
            )}

            {error && (
              <div className="anim-fade" style={errorBannerStyle}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {success ? (
              <div className="anim-fade" style={successStateStyle}>
                <CheckCircle2 size={48} style={{ color: 'var(--success)' }} />
                <h4 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Password Updated!</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Your new credentials have been saved.</p>
              </div>
            ) : (
              <>
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      className="form-input"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      style={{ paddingRight: '2.5rem' }}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      style={toggleVisibilityBtnStyle}
                      title={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showNewPassword ? <EyeOff size={16} style={{ pointerEvents: 'none' }} /> : <Eye size={16} style={{ pointerEvents: 'none' }} />}
                    </button>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Minimum length of 6 characters
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      className="form-input"
                      placeholder="Verify new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      style={{ paddingRight: '2.5rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={toggleVisibilityBtnStyle}
                      title={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff size={16} style={{ pointerEvents: 'none' }} /> : <Eye size={16} style={{ pointerEvents: 'none' }} />}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {!success && (
            <div className="modal-footer">
              <button 
                type="button" 
                onClick={() => setChangePasswordModalOpen(false)} 
                className="btn btn-secondary"
                disabled={saving}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={saving || !newPassword || !confirmPassword}
              >
                {saving ? 'Updating Password...' : 'Save Password'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

const infoBannerStyle: React.CSSProperties = {
  background: 'rgba(59, 130, 246, 0.08)',
  border: '1px solid rgba(59, 130, 246, 0.2)',
  borderRadius: 'var(--radius-sm)',
  padding: '0.75rem 1rem',
  color: 'var(--text-primary)',
  fontSize: '0.8rem',
  display: 'flex',
  alignItems: 'flex-start',
  gap: '0.65rem',
  lineHeight: '1.3',
};

const errorBannerStyle: React.CSSProperties = {
  background: 'var(--danger-bg)',
  border: '1px solid rgba(239, 68, 68, 0.2)',
  borderRadius: 'var(--radius-sm)',
  padding: '0.75rem 1rem',
  color: '#f87171',
  fontSize: '0.8rem',
  display: 'flex',
  alignItems: 'center',
  gap: '0.65rem',
};

const successStateStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2rem 1rem',
  gap: '0.75rem',
  textAlign: 'center',
};

const toggleVisibilityBtnStyle: React.CSSProperties = {
  position: 'absolute',
  right: '0.75rem',
  background: 'transparent',
  border: 'none',
  color: 'var(--text-muted)',
  cursor: 'pointer',
  padding: '0.25rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
