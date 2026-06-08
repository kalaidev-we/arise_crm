import React, { useEffect, useState } from 'react';
import { db } from '../utils/db';
import { User, Department } from '../utils/mockDb';
import { useAuth } from '../context/AuthContext';
import { Plus, Users, Shield, KeyRound, Check, HelpCircle, Mail } from 'lucide-react';

export const CompanyAdmin: React.FC = () => {
  const { user } = useAuth();
  
  const [usersList, setUsersList] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // User Creation Form
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'staff' as User['role'],
    department_id: '',
    manager_id: '',
  });

  // Password Edit State (handled via prompt dialog)

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [usersData, departmentsData] = await Promise.all([
        db.users.list(),
        db.departments.list()
      ]);
      setUsersList(usersData);
      setDepartments(departmentsData);
    } catch (err) {
      console.error('Failed to load user management directories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      // Create user record
      await db.users.create({
        company_id: user?.company_id || '',
        name: newUserForm.name,
        email: newUserForm.email,
        password: newUserForm.password,
        role: newUserForm.role,
        department_id: newUserForm.department_id || null,
        manager_id: newUserForm.role === 'staff' ? (newUserForm.manager_id || null) : null,
      });

      setSuccessMsg(`User ${newUserForm.name} signed up successfully!`);
      setNewUserForm({
        name: '',
        email: '',
        password: '',
        role: 'staff',
        department_id: '',
        manager_id: '',
      });
      await fetchAdminData();
    } catch (err: any) {
      setError(err.message || 'Failed to create user record.');
    } finally {
      setSaving(false);
    }
  };

  const handleEditPassword = async (u: User) => {
    const newPassword = prompt(`Enter new password for ${u.name}:`);
    if (newPassword === null) return; // cancelled
    if (!newPassword.trim()) {
      alert('Password cannot be empty');
      return;
    }
    try {
      await db.users.update(u.id, { password: newPassword });
      setSuccessMsg(`Password for ${u.name} updated successfully.`);
      await fetchAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to change password');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user account? This cannot be undone.')) return;
    try {
      await db.users.delete(userId);
      await fetchAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete user');
    }
  };

  const getDepartmentName = (deptId: string | null) => {
    if (!deptId) return 'General Overhead';
    const dept = departments.find(d => d.id === deptId);
    return dept ? dept.name : 'Unknown Department';
  };

  const managersList = usersList.filter(u => u.role === 'manager' || u.role === 'admin');

  return (
    <div className="anim-fade" style={containerStyle}>
      
      {/* 1. CREATE USER / SIGN UP SECTION */}
      <div className="glass-panel" style={{ flex: '0 0 380px', minWidth: '320px', height: 'fit-content' }}>
        <div style={sectionHeaderStyle}>
          <Users size={18} style={{ color: 'var(--primary)' }} />
          <h3 style={{ fontSize: '1.1rem' }}>Register User Account</h3>
        </div>

        {error && <div style={errorBanner}>{error}</div>}
        {successMsg && <div style={successBanner}>{successMsg}</div>}

        <form onSubmit={handleCreateUser} style={formLayout}>
          <div className="form-group">
            <label className="form-label">Name *</label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="e.g. Rachel Green"
              value={newUserForm.name}
              onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email *</label>
            <div style={inputWrapper}>
              <Mail size={14} style={inputIcon} />
              <input
                type="email"
                className="form-input"
                style={{ paddingLeft: '2.25rem' }}
                required
                placeholder="rachel@agency.com"
                value={newUserForm.email}
                onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Login Password *</label>
            <div style={inputWrapper}>
              <KeyRound size={14} style={inputIcon} />
              <input
                type="password"
                className="form-input"
                style={{ paddingLeft: '2.25rem' }}
                required
                placeholder="Initial password"
                value={newUserForm.password}
                onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Access Level Role *</label>
            <select
              className="form-select"
              required
              value={newUserForm.role}
              onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value as User['role'] })}
            >
              <option value="staff">Staff (Deliveries Only)</option>
              <option value="manager">Manager (Pipeline & Sprints)</option>
              <option value="admin">Admin (Full access + Finance)</option>
            </select>
          </div>

          {newUserForm.role === 'staff' && (
            <div className="form-group">
              <label className="form-label">Assign Manager</label>
              <select
                className="form-select"
                value={newUserForm.manager_id}
                onChange={(e) => setNewUserForm({ ...newUserForm, manager_id: e.target.value })}
              >
                <option value="">-- Choose manager --</option>
                {managersList.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Department</label>
            <select
              className="form-select"
              value={newUserForm.department_id}
              onChange={(e) => setNewUserForm({ ...newUserForm, department_id: e.target.value })}
            >
              <option value="">-- Choose department --</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={saving}>
            {saving ? 'Creating Account...' : 'Sign Up User'}
          </button>
        </form>
      </div>

      {/* 2. DIRECTORY & CREDENTIALS VIEWER */}
      <div className="glass-panel" style={{ flex: '1 1 600px', padding: 0, overflow: 'hidden' }}>
        <div style={directoryHeader}>
          <Shield size={18} style={{ color: 'var(--primary)' }} />
          <h3 style={{ fontSize: '1.15rem' }}>Security Credentials Directory</h3>
        </div>

        {loading ? (
          <div className="loading-container" style={{ minHeight: '300px' }}>
            <div className="spinner"></div>
            <span>Syncing tenant directories...</span>
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>User Details</th>
                  <th>Department</th>
                  <th>Access Role</th>
                  <th>Assigned Manager</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersList.map(u => {
                  const isMe = u.id === user?.id;

                  return (
                    <tr key={u.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{u.name} {isMe && <span style={meTag}>(You)</span>}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email}</div>
                      </td>
                      <td>
                        <span style={deptTag}>{getDepartmentName(u.department_id)}</span>
                      </td>
                      <td>
                        <span style={roleBadgeStyle(u.role)}>{u.role.toUpperCase()}</span>
                      </td>
                      <td>
                        {u.role === 'staff' ? (
                          <select
                            className="form-select"
                            style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem', width: '100%', minWidth: '130px' }}
                            value={u.manager_id || ''}
                            onChange={async (e) => {
                              try {
                                await db.users.update(u.id, { manager_id: e.target.value || null });
                                await fetchAdminData();
                              } catch (err: any) {
                                alert(err.message || 'Failed to update manager');
                              }
                            }}
                          >
                            <option value="">-- No Manager --</option>
                            {managersList.map(m => (
                              <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                          </select>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>N/A</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                          <button
                            className="btn btn-ghost"
                            style={{ fontSize: '0.75rem' }}
                            onClick={() => handleEditPassword(u)}
                          >
                            Change Password
                          </button>
                          {!isMe && (
                            <button
                              className="btn btn-ghost"
                              style={{ fontSize: '0.75rem', color: '#f87171' }}
                              onClick={() => handleDeleteUser(u.id)}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

// --- SETTINGS PAGE STYLES ---
const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: '1.5rem',
  alignItems: 'flex-start',
  width: '100%',
};

const sectionHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  marginBottom: '1.5rem',
  paddingBottom: '0.5rem',
  borderBottom: '1px solid var(--border-color)',
};

const formLayout: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.2rem',
};

const inputWrapper: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
};

const inputIcon: React.CSSProperties = {
  position: 'absolute',
  left: '0.85rem',
  color: 'var(--text-muted)',
};

const inputHelpText: React.CSSProperties = {
  fontSize: '0.7rem',
  color: 'var(--text-muted)',
  marginTop: '0.15rem',
};

const directoryHeader: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '1.5rem 1.5rem 0.85rem 1.5rem',
  borderBottom: '1px solid var(--border-color)',
};

const errorBanner: React.CSSProperties = {
  background: 'var(--danger-bg)',
  border: '1px solid rgba(239, 68, 68, 0.3)',
  borderRadius: 'var(--radius-sm)',
  padding: '0.75rem',
  color: '#f87171',
  fontSize: '0.8rem',
  marginBottom: '1rem',
};

const successBanner: React.CSSProperties = {
  background: 'var(--success-bg)',
  border: '1px solid rgba(16, 185, 129, 0.3)',
  borderRadius: 'var(--radius-sm)',
  padding: '0.75rem',
  color: '#34d399',
  fontSize: '0.8rem',
  marginBottom: '1rem',
};

const meTag: React.CSSProperties = {
  fontSize: '0.65rem',
  color: 'var(--primary)',
  fontWeight: 700,
};

const deptTag: React.CSSProperties = {
  fontSize: '0.75rem',
  color: 'var(--text-secondary)',
};

const pwdInputStyle: React.CSSProperties = {
  padding: '0.25rem 0.5rem',
  fontSize: '0.8rem',
  width: '120px',
  background: 'var(--bg-card)',
  border: '1px solid var(--border-color)',
  color: 'var(--text-primary)',
};

const pwdSpanStyle: React.CSSProperties = {
  fontFamily: 'monospace',
  fontSize: '0.85rem',
  color: 'var(--text-secondary)',
};

const btnGroupStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.25rem',
  justifyContent: 'flex-end',
};

const actionBtnStyle: React.CSSProperties = {
  padding: '0.3rem',
  width: '24px',
  height: '24px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const roleBadgeStyle = (role: string): React.CSSProperties => {
  let color = 'var(--text-secondary)';
  let bg = 'rgba(255,255,255,0.05)';
  if (role === 'admin') {
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
    fontSize: '0.7rem',
    fontWeight: 700,
    color,
    background: bg,
    padding: '0.15rem 0.45rem',
    borderRadius: '4px',
  };
};
