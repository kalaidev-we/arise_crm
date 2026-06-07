import React, { useEffect, useState } from 'react';
import { db } from '../utils/db';
import { Company, User } from '../utils/mockDb';
import { 
  Building, 
  Shield, 
  Plus, 
  Trash2, 
  KeyRound, 
  Users, 
  Mail, 
  Building2, 
  Sparkles,
  UserCheck
} from 'lucide-react';

export const MasterAdmin: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [admins, setAdmins] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tenants' | 'admins'>('tenants');

  // Form states
  const [companyForm, setCompanyForm] = useState({ name: '' });
  const [adminForm, setAdminForm] = useState({
    company_id: '',
    name: '',
    email: '',
    password: ''
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchMasterData = async () => {
    setLoading(true);
    try {
      const [companiesData, adminsData] = await Promise.all([
        db.superadmin.getCompanies(),
        db.superadmin.getTenantAdmins()
      ]);
      setCompanies(companiesData);
      setAdmins(adminsData);
    } catch (err) {
      console.error('Failed to load system management directories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMasterData();
  }, []);

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      if (!companyForm.name.trim()) throw new Error('Tenant name is required');
      const created = await db.superadmin.createCompany(companyForm.name.trim());
      setSuccess(`Tenant "${created.name}" has been successfully provisioned.`);
      setCompanyForm({ name: '' });
      await fetchMasterData();
    } catch (err: any) {
      setError(err.message || 'Failed to create company');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const { company_id, name, email, password } = adminForm;
      if (!company_id) throw new Error('Please select a tenant company');
      if (!name.trim()) throw new Error('Admin name is required');
      if (!email.trim()) throw new Error('Admin email is required');
      if (!password.trim()) throw new Error('Initial password is required');

      const created = await db.superadmin.createTenantAdmin(company_id, name.trim(), email.trim(), password);
      const selectedCompany = companies.find(c => c.id === company_id);
      setSuccess(`Admin account "${created.name}" created for tenant "${selectedCompany?.name || 'Unknown'}"`);
      setAdminForm({ company_id: '', name: '', email: '', password: '' });
      await fetchMasterData();
    } catch (err: any) {
      setError(err.message || 'Failed to create admin');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCompany = async (companyId: string, companyName: string) => {
    const doubleCheck = window.confirm(
      `CRITICAL WARNING:\n\nAre you sure you want to delete the tenant company "${companyName}"?\n\nThis action will completely wipe out the company and ALL of its associated data including admins, managers, staff, projects, milestones, tasks, leads, deals, clients, invoices, and expenses. This CANNOT be undone.`
    );
    if (!doubleCheck) return;

    try {
      await db.superadmin.deleteCompany(companyId);
      setSuccess(`Tenant "${companyName}" and all associated workspaces have been deleted.`);
      await fetchMasterData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete company');
    }
  };

  const handleDeleteAdmin = async (userId: string, adminName: string) => {
    if (!window.confirm(`Are you sure you want to delete the administrator account for "${adminName}"?`)) return;
    try {
      await db.superadmin.deleteTenantAdmin(userId);
      setSuccess(`Administrator account "${adminName}" has been deleted.`);
      await fetchMasterData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete admin account');
    }
  };

  const handleResetPassword = async (userId: string, adminName: string) => {
    const newPass = window.prompt(`Enter new security password for "${adminName}":`);
    if (newPass === null) return;
    if (!newPass.trim()) {
      alert('Password cannot be empty');
      return;
    }

    try {
      await db.superadmin.updateTenantAdminPassword(userId, newPass.trim());
      setSuccess(`Password for "${adminName}" updated successfully.`);
      await fetchMasterData();
    } catch (err: any) {
      alert(err.message || 'Failed to update password');
    }
  };

  const getCompanyName = (companyId: string) => {
    const match = companies.find(c => c.id === companyId);
    return match ? match.name : 'Unknown Tenant';
  };

  return (
    <div className="anim-fade" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Superadmin KPIs summary card banner */}
      <div className="kpi-grid">
        <div className="glass-panel kpi-card" style={{ border: '1px solid rgba(139, 92, 246, 0.2)' }}>
          <div className="kpi-icon-wrapper" style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#c084fc' }}>
            <Building2 size={20} />
          </div>
          <div>
            <div style={kpiLabelStyle}>Active Tenant Units</div>
            <div className="kpi-value">{companies.length}</div>
            <div style={kpiSubtextStyle}>Subscribed agencies & company accounts</div>
          </div>
        </div>

        <div className="glass-panel kpi-card" style={{ border: '1px solid rgba(59, 130, 246, 0.2)' }}>
          <div className="kpi-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#60a5fa' }}>
            <UserCheck size={20} />
          </div>
          <div>
            <div style={kpiLabelStyle}>Tenant Administrators</div>
            <div className="kpi-value">{admins.length}</div>
            <div style={kpiSubtextStyle}>Admins managing respective workspaces</div>
          </div>
        </div>

        <div className="glass-panel kpi-card" style={{ border: '1px solid rgba(16, 185, 129, 0.2)' }}>
          <div className="kpi-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#34d399' }}>
            <Sparkles size={20} />
          </div>
          <div>
            <div style={kpiLabelStyle}>System Security</div>
            <div className="kpi-value">Active</div>
            <div style={kpiSubtextStyle}>All tenant records completely isolated</div>
          </div>
        </div>
      </div>

      {/* Tabs list bar */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => { setActiveTab('tenants'); setError(null); setSuccess(null); }}
          className="btn"
          style={{
            background: activeTab === 'tenants' ? 'rgba(139, 92, 246, 0.12)' : 'transparent',
            borderColor: activeTab === 'tenants' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'tenants' ? 'var(--text-primary)' : 'var(--text-secondary)',
            padding: '0.5rem 1rem'
          }}
        >
          Tenants (Companies)
        </button>
        <button
          onClick={() => { setActiveTab('admins'); setError(null); setSuccess(null); }}
          className="btn"
          style={{
            background: activeTab === 'admins' ? 'rgba(139, 92, 246, 0.12)' : 'transparent',
            borderColor: activeTab === 'admins' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'admins' ? 'var(--text-primary)' : 'var(--text-secondary)',
            padding: '0.5rem 1rem'
          }}
        >
          Tenant Administrators
        </button>
      </div>

      {/* Main Alert notifications */}
      {error && <div style={errorStyle}>{error}</div>}
      {success && <div style={successStyle}>{success}</div>}

      {/* Render selected panel view */}
      {activeTab === 'tenants' ? (
        <div style={layoutGrid}>
          {/* Create tenant form */}
          <div className="glass-panel" style={{ padding: '1.5rem', height: 'fit-content' }}>
            <div style={sectionHeader}>
              <Plus size={16} style={{ color: 'var(--primary)' }} />
              <h3 style={{ fontSize: '1.05rem' }}>Provision Tenant Unit</h3>
            </div>
            
            <form onSubmit={handleCreateCompany} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Company / Tenant Name *</label>
                <div style={inputContainer}>
                  <Building size={14} style={inputIcon} />
                  <input
                    type="text"
                    className="form-input"
                    style={{ paddingLeft: '2.25rem' }}
                    required
                    placeholder="e.g. Omega Software Group"
                    value={companyForm.name}
                    onChange={(e) => setCompanyForm({ name: e.target.value })}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={saving}>
                {saving ? 'Creating...' : 'Provision Tenant'}
              </button>
            </form>
          </div>

          {/* Tenants list table */}
          <div className="glass-panel" style={{ padding: '1.5rem 0 0 0', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 1.5rem 1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
              <Building2 size={16} style={{ color: 'var(--primary)' }} />
              <h3 style={{ fontSize: '1.05rem' }}>Active Tenants Directory</h3>
            </div>

            <div className="table-container">
              <table className="custom-table" style={{ fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>Tenant Details</th>
                    <th>Created At</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Syncing directories...</td>
                    </tr>
                  ) : companies.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No tenant companies registered</td>
                    </tr>
                  ) : (
                    companies.map(c => (
                      <tr key={c.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{c.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>UUID: {c.id}</div>
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>
                          {new Date(c.created_at).toLocaleDateString()}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ padding: '0.3rem', color: '#f87171' }}
                            onClick={() => handleDeleteCompany(c.id, c.name)}
                            title="Delete Company and Cascade data"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div style={layoutGrid}>
          {/* Create admin form */}
          <div className="glass-panel" style={{ padding: '1.5rem', height: 'fit-content' }}>
            <div style={sectionHeader}>
              <Shield size={16} style={{ color: 'var(--primary)' }} />
              <h3 style={{ fontSize: '1.05rem' }}>Create Tenant Administrator</h3>
            </div>
            
            <form onSubmit={handleCreateAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', marginTop: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Link Tenant Company *</label>
                <select
                  className="form-select"
                  required
                  value={adminForm.company_id}
                  onChange={(e) => setAdminForm({ ...adminForm, company_id: e.target.value })}
                >
                  <option value="">-- Select Tenant Company --</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Administrator Name *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="e.g. John Doe"
                  value={adminForm.name}
                  onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Login Email Address *</label>
                <div style={inputContainer}>
                  <Mail size={14} style={inputIcon} />
                  <input
                    type="email"
                    className="form-input"
                    style={{ paddingLeft: '2.25rem' }}
                    required
                    placeholder="john@company.com"
                    value={adminForm.email}
                    onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Security Password *</label>
                <div style={inputContainer}>
                  <KeyRound size={14} style={inputIcon} />
                  <input
                    type="password"
                    className="form-input"
                    style={{ paddingLeft: '2.25rem' }}
                    required
                    placeholder="Enter login password"
                    value={adminForm.password}
                    onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={saving}>
                {saving ? 'Creating Admin...' : 'Create Admin'}
              </button>
            </form>
          </div>

          {/* Admin accounts table */}
          <div className="glass-panel" style={{ padding: '1.5rem 0 0 0', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 1.5rem 1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
              <Users size={16} style={{ color: 'var(--primary)' }} />
              <h3 style={{ fontSize: '1.05rem' }}>Administrators Directory</h3>
            </div>

            <div className="table-container">
              <table className="custom-table" style={{ fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>Admin Details</th>
                    <th>Linked Tenant Unit</th>
                    <th>Created At</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Syncing directories...</td>
                    </tr>
                  ) : admins.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No administrators provisioned</td>
                    </tr>
                  ) : (
                    admins.map(u => (
                      <tr key={u.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{u.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{u.email}</div>
                        </td>
                        <td>
                          <span style={tenantPill}>{getCompanyName(u.company_id)}</span>
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'flex-end' }}>
                            <button
                              className="btn btn-ghost"
                              style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                              onClick={() => handleResetPassword(u.id, u.name)}
                            >
                              Reset PW
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost"
                              style={{ padding: '0.3rem', color: '#f87171' }}
                              onClick={() => handleDeleteAdmin(u.id, u.name)}
                              title="Delete Admin Account"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// --- MASTER ADMIN STYLES ---
const kpiLabelStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  fontWeight: 600,
  letterSpacing: '0.05em',
};

const kpiSubtextStyle: React.CSSProperties = {
  fontSize: '0.7rem',
  color: 'var(--text-muted)',
  marginTop: '0.25rem',
};

const layoutGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '380px 1fr',
  gap: '1.5rem',
  alignItems: 'flex-start'
};

const sectionHeader: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  paddingBottom: '0.75rem',
  borderBottom: '1px solid var(--border-color)'
};

const inputContainer: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center'
};

const inputIcon: React.CSSProperties = {
  position: 'absolute',
  left: '0.85rem',
  color: 'var(--text-muted)'
};

const errorStyle: React.CSSProperties = {
  background: 'var(--danger-bg)',
  border: '1px solid rgba(239, 68, 68, 0.3)',
  borderRadius: 'var(--radius-sm)',
  padding: '0.75rem 1rem',
  color: '#f87171',
  fontSize: '0.85rem'
};

const successStyle: React.CSSProperties = {
  background: 'var(--success-bg)',
  border: '1px solid rgba(16, 185, 129, 0.3)',
  borderRadius: 'var(--radius-sm)',
  padding: '0.75rem 1rem',
  color: '#34d399',
  fontSize: '0.85rem'
};

const tenantPill: React.CSSProperties = {
  fontSize: '0.75rem',
  fontWeight: 600,
  background: 'rgba(255, 255, 255, 0.04)',
  border: '1px solid var(--border-color)',
  color: 'var(--text-primary)',
  padding: '0.15rem 0.45rem',
  borderRadius: '4px'
};
