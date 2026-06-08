import React, { useEffect, useState } from 'react';
import { db } from '../utils/db';
import { Company, User, SubscriptionRequest } from '../utils/mockDb';
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
  UserCheck,
  Image as ImageIcon
} from 'lucide-react';

export const MasterAdmin: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [admins, setAdmins] = useState<User[]>([]);
  const [requests, setRequests] = useState<SubscriptionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tenants' | 'admins' | 'requests'>('tenants');
  const [dragActiveAdmin, setDragActiveAdmin] = useState(false);

  const compressAndSetLogoAdmin = (file: File, callback: (base64: string) => void) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 120;
        const MAX_HEIGHT = 120;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/png');
          callback(dataUrl);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDragAdmin = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActiveAdmin(true);
    } else if (e.type === "dragleave") {
      setDragActiveAdmin(false);
    }
  };

  const handleDropAdmin = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActiveAdmin(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      compressAndSetLogoAdmin(e.dataTransfer.files[0], (base64) => {
        setCompanyForm(prev => ({ ...prev, logo_url: base64 }));
      });
    }
  };

  const handleFileSelectAdmin = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      compressAndSetLogoAdmin(e.target.files[0], (base64) => {
        setCompanyForm(prev => ({ ...prev, logo_url: base64 }));
      });
    }
  };

  const triggerFileSelectAdmin = () => {
    document.getElementById('logo-upload-input-admin')?.click();
  };

  // Form states
  const [companyForm, setCompanyForm] = useState({ name: '', logo_url: '', crm_name: '' });
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
      const [companiesData, adminsData, requestsData] = await Promise.all([
        db.superadmin.getCompanies(),
        db.superadmin.getTenantAdmins(),
        db.subscriptionRequests.list()
      ]);
      setCompanies(companiesData);
      setAdmins(adminsData);
      setRequests(requestsData);
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
      const created = await db.superadmin.createCompany(
        companyForm.name.trim(),
        companyForm.logo_url.trim() || undefined,
        companyForm.crm_name.trim() || undefined
      );
      setSuccess(`Tenant "${created.name}" has been successfully provisioned.`);
      setCompanyForm({ name: '', logo_url: '', crm_name: '' });
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

  const handleApproveRequest = async (req: SubscriptionRequest) => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const company = await db.superadmin.createCompany(req.company_name, req.logo_url, req.crm_name);
      const defaultPassword = 'welcome123';
      const admin = await db.superadmin.createTenantAdmin(
        company.id, 
        req.contact_name, 
        req.email, 
        defaultPassword
      );
      await db.subscriptionRequests.updateStatus(req.id, 'approved');
      setSuccess(`Tenant "${company.name}" has been successfully provisioned. Created admin "${admin.name}" (${admin.email}) with temporary password: "${defaultPassword}"`);
      await fetchMasterData();
    } catch (err: any) {
      setError(err.message || 'Failed to approve subscription request');
    } finally {
      setSaving(false);
    }
  };

  const handleRejectRequest = async (id: string) => {
    if (!window.confirm('Are you sure you want to reject this subscription request?')) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await db.subscriptionRequests.updateStatus(id, 'rejected');
      setSuccess('Subscription request has been rejected.');
      await fetchMasterData();
    } catch (err: any) {
      setError(err.message || 'Failed to reject subscription request');
    } finally {
      setSaving(false);
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

        <div className="glass-panel kpi-card" style={{ border: '1px solid rgba(245, 158, 11, 0.2)' }}>
          <div className="kpi-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#fbbf24' }}>
            <Building size={20} />
          </div>
          <div>
            <div style={kpiLabelStyle}>Pending Requests</div>
            <div className="kpi-value">{requests.filter(r => r.status === 'pending').length}</div>
            <div style={kpiSubtextStyle}>Companies waiting setup approval</div>
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
        <button
          onClick={() => { setActiveTab('requests'); setError(null); setSuccess(null); }}
          className="btn"
          style={{
            background: activeTab === 'requests' ? 'rgba(139, 92, 246, 0.12)' : 'transparent',
            borderColor: activeTab === 'requests' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'requests' ? 'var(--text-primary)' : 'var(--text-secondary)',
            padding: '0.5rem 1rem'
          }}
        >
          Access Requests ({requests.filter(r => r.status === 'pending').length})
        </button>
      </div>

      {/* Main Alert notifications */}
      {error && <div style={errorStyle}>{error}</div>}
      {success && <div style={successStyle}>{success}</div>}

      {/* Render selected panel view */}
      {activeTab === 'tenants' && (
        <div className="grid-master-admin">
          {/* Create tenant form */}
          <div className="glass-panel" style={{ padding: '1.5rem', height: 'fit-content' }}>
            <div style={sectionHeader}>
              <Plus size={16} style={{ color: 'var(--primary)' }} />
              <h3 style={{ fontSize: '1.05rem' }}>Provision Tenant Unit</h3>
            </div>
            
            <form onSubmit={handleCreateCompany} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', marginTop: '1rem' }}>
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
                    onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Custom CRM Brand Name (Optional)</label>
                <div style={inputContainer}>
                  <Sparkles size={14} style={inputIcon} />
                  <input
                    type="text"
                    className="form-input"
                    style={{ paddingLeft: '2.25rem' }}
                    placeholder="e.g. Omega CRM"
                    value={companyForm.crm_name}
                    onChange={(e) => setCompanyForm({ ...companyForm, crm_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Company Logo</label>
                <div 
                  style={dropZoneStyleAdmin(dragActiveAdmin)}
                  onDragEnter={handleDragAdmin}
                  onDragOver={handleDragAdmin}
                  onDragLeave={handleDragAdmin}
                  onDrop={handleDropAdmin}
                  onClick={triggerFileSelectAdmin}
                >
                  <input 
                    type="file" 
                    id="logo-upload-input-admin" 
                    style={{ display: 'none' }} 
                    accept="image/*" 
                    onChange={handleFileSelectAdmin}
                  />
                  {companyForm.logo_url ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', width: '100%' }} onClick={(e) => e.stopPropagation()}>
                      <img 
                        src={companyForm.logo_url} 
                        alt="Logo Preview" 
                        style={{ maxWidth: '60px', maxHeight: '60px', objectFit: 'contain', borderRadius: '4px' }}
                      />
                      <button 
                        type="button" 
                        className="btn btn-ghost" 
                        style={{ fontSize: '0.7rem', color: '#f87171', padding: '0.1rem 0.4rem' }}
                        onClick={() => setCompanyForm({ ...companyForm, logo_url: '' })}
                      >
                        Remove Logo
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', textAlign: 'center' }}>
                      <ImageIcon size={16} style={{ color: 'var(--text-muted)' }} />
                      <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                        {dragActiveAdmin ? 'Drop here' : 'Upload logo image'}
                      </span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                        Drag & drop or click
                      </span>
                    </div>
                  )}
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: '28px', height: '28px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                              {c.logo_url ? (
                                <img 
                                  src={c.logo_url} 
                                  alt="Tenant Logo" 
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : null}
                              <Building size={14} style={{ color: 'var(--text-muted)' }} />
                            </div>
                            <div>
                              <div style={{ fontWeight: 600 }}>{c.name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>UUID: {c.id}</div>
                            </div>
                          </div>
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
      )}

      {activeTab === 'admins' && (
        <div className="grid-master-admin">
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

      {activeTab === 'requests' && (
        <div className="glass-panel" style={{ padding: '1.5rem 0 0 0', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 1.5rem 1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
            <Building2 size={16} style={{ color: 'var(--primary)' }} />
            <h3 style={{ fontSize: '1.05rem' }}>Subscription Access Requests</h3>
          </div>

          <div className="table-container">
            <table className="custom-table" style={{ fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th>Company Details</th>
                  <th>Contact Details</th>
                  <th>Plan Tier</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Syncing requests...</td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No access requests submitted</td>
                  </tr>
                ) : (
                  requests.map(r => (
                    <tr key={r.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ width: '32px', height: '32px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                            {r.logo_url ? (
                              <img 
                                src={r.logo_url} 
                                alt="Company Logo" 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : null}
                            <Building size={16} style={{ color: 'var(--text-muted)' }} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{r.company_name}</div>
                            <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                              Submitted {new Date(r.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{r.contact_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{r.email}</div>
                        {r.phone && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.phone}</div>}
                      </td>
                      <td>
                        <span style={planPillStyle(r.plan)}>
                          {r.plan.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <span style={statusPillStyle(r.status)}>
                          {r.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {r.status === 'pending' ? (
                          <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              className="btn btn-primary"
                              style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                              onClick={() => handleApproveRequest(r)}
                              disabled={saving}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', color: '#f87171', borderColor: 'rgba(239,68,68,0.2)' }}
                              onClick={() => handleRejectRequest(r.id)}
                              disabled={saving}
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Processed
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};

const planPillStyle = (plan: string): React.CSSProperties => {
  let bg = 'rgba(59, 130, 246, 0.12)';
  let color = '#60a5fa';
  if (plan === 'growth') {
    bg = 'rgba(139, 92, 246, 0.12)';
    color = '#c084fc';
  } else if (plan === 'enterprise') {
    bg = 'rgba(16, 185, 129, 0.12)';
    color = '#34d399';
  }
  return {
    fontSize: '0.75rem',
    fontWeight: 600,
    background: bg,
    color,
    padding: '0.15rem 0.45rem',
    borderRadius: '4px',
    border: '1px solid rgba(255,255,255,0.02)'
  };
};

const statusPillStyle = (status: string): React.CSSProperties => {
  let bg = 'rgba(245, 158, 11, 0.12)';
  let color = '#fbbf24';
  if (status === 'approved') {
    bg = 'rgba(16, 185, 129, 0.12)';
    color = '#34d399';
  } else if (status === 'rejected') {
    bg = 'rgba(239, 68, 68, 0.12)';
    color = '#f87171';
  }
  return {
    fontSize: '0.75rem',
    fontWeight: 600,
    background: bg,
    color,
    padding: '0.15rem 0.45rem',
    borderRadius: '4px',
    border: '1px solid rgba(255,255,255,0.02)'
  };
};

// --- MASTER ADMIN STYLES ---
const dropZoneStyleAdmin = (active: boolean): React.CSSProperties => ({
  height: '110px',
  background: active ? 'rgba(59, 130, 246, 0.08)' : 'rgba(255, 255, 255, 0.02)',
  border: active ? '1px dashed var(--primary)' : '1px dashed var(--border-color)',
  borderRadius: 'var(--radius-sm)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0.75rem',
  cursor: 'pointer',
  transition: 'all var(--transition-fast)',
  position: 'relative'
});

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
