import React, { useEffect, useState } from 'react';
import { db } from '../utils/db';
import { Lead, User } from '../utils/mockDb';
import { useAuth } from '../context/AuthContext';
import { Plus, Search, Filter, Phone, Mail, UserCheck, Briefcase } from 'lucide-react';

export const Leads: React.FC = () => {
  const { user, isStaff, isAdmin } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentLeadId, setCurrentLeadId] = useState<string | null>(null);
  
  const [leadForm, setLeadForm] = useState({
    name: '',
    phone: '',
    email: '',
    title: '',
    status: 'new' as Lead['status'],
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const [leadsData, usersData] = await Promise.all([
        db.leads.list(),
        db.users.list()
      ]);
      setLeads(leadsData);
      setTeamMembers(usersData);
    } catch (err: any) {
      console.error('Failed to load leads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const openCreateModal = () => {
    setLeadForm({
      name: '',
      phone: '',
      email: '',
      title: '',
      status: 'new',
    });
    setError(null);
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openEditModal = (lead: Lead) => {
    setLeadForm({
      name: lead.name,
      phone: lead.phone || '',
      email: lead.email || '',
      title: lead.title || '',
      status: lead.status,
    });
    setError(null);
    setIsEditing(true);
    setCurrentLeadId(lead.id);
    setIsModalOpen(true);
  };

  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (isEditing && currentLeadId) {
        await db.leads.update(currentLeadId, leadForm);
      } else {
        await db.leads.create(leadForm);
      }
      setIsModalOpen(false);
      await fetchLeads();
    } catch (err: any) {
      setError(err.message || 'Failed to save lead record.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!window.confirm('Are you sure you want to delete this lead? All associated deals will be deleted as well.')) return;
    try {
      await db.leads.delete(leadId);
      await fetchLeads();
    } catch (err: any) {
      alert(err.message || 'Failed to delete lead');
    }
  };

  const getOwnerName = (ownerId: string) => {
    const member = teamMembers.find(t => t.id === ownerId);
    return member ? member.name : 'Unknown Owner';
  };

  // Filters calculation
  const filteredLeads = leads.filter(l => {
    const matchesSearch = l.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (l.email && l.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (l.title && l.title.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="anim-fade" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Search & Filter Bar */}
      <div style={filterBarContainerStyle} className="glass-panel">
        <div style={searchWrapperStyle}>
          <Search size={16} style={searchIconStyle} />
          <input
            type="text"
            placeholder="Search leads by name, email, role..."
            style={searchInputStyle}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={filterGroupStyle}>
          <div style={selectWrapperStyle}>
            <Filter size={14} style={filterIconStyle} />
            <select
              style={selectInputStyle}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="lost">Lost</option>
            </select>
          </div>

          <button className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={16} />
            <span>Add Lead</span>
          </button>
        </div>
      </div>

      {/* Main leads content */}
      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <span>Syncing sales funnel...</span>
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="glass-panel" style={emptyLeadsContainer}>
          <Briefcase size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <h3>No Leads Found</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Modify filters or add a new lead to start the sales pipeline.
          </p>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Lead Name</th>
                  <th>Title/Company</th>
                  <th>Contact Info</th>
                  <th>Owner</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map(lead => {
                  const canEdit = !isStaff || lead.owner_id === user?.id;
                  return (
                    <tr key={lead.id}>
                      <td style={{ fontWeight: 600 }}>{lead.name}</td>
                      <td>{lead.title || 'N/A'}</td>
                      <td>
                        <div style={contactDetailsCol}>
                          {lead.email && (
                            <span style={contactItemStyle}>
                              <Mail size={12} /> {lead.email}
                            </span>
                          )}
                          {lead.phone && (
                            <span style={contactItemStyle}>
                              <Phone size={12} /> {lead.phone}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span style={ownerTagStyle}>
                          <UserCheck size={12} />
                          {getOwnerName(lead.owner_id)}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-${lead.status}`}>{lead.status}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                          <button
                            className="btn btn-ghost"
                            style={{ fontSize: '0.75rem' }}
                            onClick={() => openEditModal(lead)}
                            disabled={!canEdit}
                            title={canEdit ? 'Edit Lead' : 'Only leads owners and managers can edit leads'}
                          >
                            Edit
                          </button>
                          {isAdmin && (
                            <button
                              className="btn btn-ghost"
                              style={{ fontSize: '0.75rem', color: '#f87171' }}
                              onClick={() => handleDeleteLead(lead.id)}
                              title="Delete Lead"
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
        </div>
      )}

      {/* CREATE/EDIT LEAD MODAL */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem' }}>
                {isEditing ? 'Modify Lead Information' : 'Register New Lead'}
              </h3>
              <button className="btn btn-ghost" onClick={() => setIsModalOpen(false)} style={{ padding: '0.25rem' }}>✕</button>
            </div>
            
            <form onSubmit={handleSaveLead}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {error && (
                  <div style={modalErrorBanner}>
                    <span>{error}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Contact Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    placeholder="e.g. John Doe"
                    value={leadForm.name}
                    onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Job Title / Company</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. CEO at InnovateCorp"
                    value={leadForm.title}
                    onChange={(e) => setLeadForm({ ...leadForm, title: e.target.value })}
                  />
                </div>

                <div className="grid-two-col">
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="e.g. name@domain.com"
                      value={leadForm.email}
                      onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. 555-0199"
                      value={leadForm.phone}
                      onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Pipeline Status</label>
                  <select
                    className="form-select"
                    value={leadForm.status}
                    onChange={(e) => setLeadForm({ ...leadForm, status: e.target.value as Lead['status'] })}
                  >
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="qualified">Qualified</option>
                    <option value="lost">Lost</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// --- LEADS PAGE STYLES ---
const filterBarContainerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '1rem',
};

const searchWrapperStyle: React.CSSProperties = {
  position: 'relative',
  flex: 1,
  minWidth: '260px',
  display: 'flex',
  alignItems: 'center',
};

const searchIconStyle: React.CSSProperties = {
  position: 'absolute',
  left: '1rem',
  color: 'var(--text-muted)',
};

const searchInputStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.03)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-sm)',
  padding: '0.6rem 1rem 0.6rem 2.5rem',
  color: 'var(--text-primary)',
  width: '100%',
  outline: 'none',
  fontSize: '0.875rem',
};

const filterGroupStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.75rem',
  alignItems: 'center',
};

const selectWrapperStyle: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
};

const filterIconStyle: React.CSSProperties = {
  position: 'absolute',
  left: '0.85rem',
  color: 'var(--text-muted)',
  pointerEvents: 'none',
};

const selectInputStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.03)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-sm)',
  padding: '0.6rem 1rem 0.6rem 2.25rem',
  color: 'var(--text-primary)',
  outline: 'none',
  fontSize: '0.85rem',
  cursor: 'pointer',
  minWidth: '150px',
};

const emptyLeadsContainer: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '4rem',
  textAlign: 'center',
};

const contactDetailsCol: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
};

const contactItemStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.4rem',
  fontSize: '0.8rem',
  color: 'var(--text-secondary)',
};

const ownerTagStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.35rem',
  background: 'rgba(255, 255, 255, 0.03)',
  border: '1px solid var(--border-color)',
  borderRadius: '4px',
  padding: '0.2rem 0.5rem',
  fontSize: '0.8rem',
  color: 'var(--text-secondary)',
};



const modalErrorBanner: React.CSSProperties = {
  background: 'var(--danger-bg)',
  border: '1px solid rgba(239, 68, 68, 0.3)',
  borderRadius: 'var(--radius-sm)',
  padding: '0.75rem',
  color: '#f87171',
  fontSize: '0.8rem',
};
