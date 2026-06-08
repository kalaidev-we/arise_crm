import React, { useEffect, useState } from 'react';
import { db } from '../utils/db';
import { Deal, Lead, Client, Project } from '../utils/mockDb';
import { Plus, ChevronLeft, ChevronRight, DollarSign, Target, Calendar, Edit2, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PIPELINE_STAGES = [
  { id: 'prospect', name: 'Prospect' },
  { id: 'contacted', name: 'Contacted' },
  { id: 'qualified', name: 'Qualified' },
  { id: 'proposal', name: 'Proposal' },
  { id: 'negotiation', name: 'Negotiation' },
  { id: 'won', name: 'Won' },
  { id: 'lost', name: 'Lost' }
] as const;

type StageId = typeof PIPELINE_STAGES[number]['id'];

export const Deals: React.FC = () => {
  const { isAdmin } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dealForm, setDealForm] = useState({
    lead_id: '',
    value: '',
    stage: 'prospect' as StageId,
  });

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [editForm, setEditForm] = useState({
    value: '',
    stage: 'prospect' as StageId,
    status: 'active' as Deal['status']
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dealsData, leadsData, projectsData, clientsData] = await Promise.all([
        db.deals.list(),
        db.leads.list(),
        db.projects.list(),
        db.clients.list()
      ]);
      setDeals(dealsData);
      setLeads(leadsData);
      setProjects(projectsData);
      setClients(clientsData);
    } catch (err) {
      console.error('Failed to load deals data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getLeadName = (leadId: string) => {
    const lead = leads.find(l => l.id === leadId);
    return lead ? lead.name : 'Unknown Contact';
  };

  const handleStageChange = async (dealId: string, newStage: StageId) => {
    try {
      await db.deals.update(dealId, { stage: newStage });
      await fetchData(); // Reload to capture automatically created clients/projects if marked Won!
    } catch (err: any) {
      alert(err.message || 'Failed to update deal stage');
    }
  };

  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dealForm.lead_id) {
      setError('Please select a qualified lead for this deal');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await db.deals.create({
        lead_id: dealForm.lead_id,
        value: Number(dealForm.value) || 0,
        stage: dealForm.stage,
        status: 'active'
      });
      setIsModalOpen(false);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to create deal');
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (deal: Deal) => {
    setEditingDeal(deal);
    setEditForm({
      value: String(deal.value),
      stage: deal.stage,
      status: deal.status || 'active'
    });
    setError(null);
    setIsEditModalOpen(true);
  };

  const handleUpdateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDeal) return;

    setSaving(true);
    setError(null);
    try {
      await db.deals.update(editingDeal.id, {
        value: Number(editForm.value) || 0,
        stage: editForm.stage,
        status: editForm.status
      });
      setIsEditModalOpen(false);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to update deal');
    } finally {
      setSaving(false);
    }
  };

  const getAssociatedProject = (dealId: string): Project | null => {
    const client = clients.find(c => c.deal_id === dealId);
    if (!client) return null;
    return projects.find(p => p.client_id === client.id) || null;
  };

  const handleManualConvertToProject = async (deal: Deal) => {
    try {
      await db.deals.update(deal.id, { stage: 'won' });
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to convert deal to project');
    }
  };

  const handleDeleteDeal = async (dealId: string) => {
    if (!window.confirm('Are you sure you want to delete this deal opportunity?')) return;
    try {
      await db.deals.delete(dealId);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete deal');
    }
  };

  // Only leads that are "qualified"
  const availableLeads = leads.filter(lead => lead.status === 'qualified');

  return (
    <div className="anim-fade" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Page Controls */}
      <div style={controlsRowStyle} className="glass-panel">
        <div style={titleAreaStyle}>
          <Target size={18} style={{ color: 'var(--primary)' }} />
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Filter-based pipeline views of qualified revenue pipelines.
          </span>
        </div>

        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={16} />
          <span>New Deal Opportunity</span>
        </button>
      </div>

      {/* Kanban Board Container */}
      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <span>Loading Kanban pipeline...</span>
        </div>
      ) : (
        <div className="pipeline-container">
          {PIPELINE_STAGES.map(column => {
            const columnDeals = deals.filter(d => d.stage === column.id);
            const totalValue = columnDeals.reduce((sum, d) => sum + Number(d.value), 0);

            return (
              <div key={column.id} className="pipeline-column">
                
                <div className="pipeline-header">
                  <div>
                    <h4 style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {column.name}
                      <span className="pipeline-count">{columnDeals.length}</span>
                    </h4>
                    <span style={columnValueStyle}>${totalValue.toLocaleString()}</span>
                  </div>
                </div>

                <div className="pipeline-cards-list">
                  {columnDeals.length === 0 ? (
                    <div style={emptyColumnCard}>
                      <span>No deals here</span>
                    </div>
                  ) : (
                    columnDeals.map(deal => {
                      const leadIndex = leads.findIndex(l => l.id === deal.lead_id);
                      const leadTitle = leadIndex !== -1 ? leads[leadIndex].title : 'Lead Opportunity';
                      const stageIdx = PIPELINE_STAGES.findIndex(s => s.id === column.id);
                      const assocProj = getAssociatedProject(deal.id);

                      return (
                        <div key={deal.id} className="glass-panel" style={dealCardStyle}>
                          <div style={dealCardHeaderStyle}>
                            <span style={dealLeadNameStyle}>{getLeadName(deal.lead_id)}</span>
                            <div style={{ display: 'flex', gap: '0.1rem' }}>
                              <button
                                type="button"
                                className="btn btn-ghost"
                                style={{ padding: '0.2rem', color: 'var(--text-muted)' }}
                                onClick={() => openEditModal(deal)}
                                title="Edit Deal"
                              >
                                <Edit2 size={12} />
                              </button>
                              {isAdmin && (
                                <button
                                  type="button"
                                  className="btn btn-ghost"
                                  style={{ padding: '0.2rem', color: '#f87171' }}
                                  onClick={() => handleDeleteDeal(deal.id)}
                                  title="Delete Deal"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          </div>
                          
                          <div style={dealCardBodyStyle}>
                            <div style={dealCompanyStyle}>{leadTitle || 'No Company Details'}</div>
                            <div style={dealValueBadgeStyle}>
                              <DollarSign size={13} />
                              <strong>{Number(deal.value).toLocaleString()}</strong>
                            </div>
                            
                            {deal.stage === 'won' && (
                              <div style={{ marginTop: '0.25rem' }}>
                                {assocProj ? (
                                  <Link 
                                    to={`/projects/${assocProj.id}`} 
                                    className="badge badge-won" 
                                    style={{ display: 'inline-flex', textDecoration: 'none', width: '100%', justifyContent: 'center', fontSize: '0.7rem' }}
                                  >
                                    View Active Project
                                  </Link>
                                ) : (
                                  <button
                                    type="button"
                                    className="btn btn-primary"
                                    style={{ width: '100%', padding: '0.25rem 0.5rem', fontSize: '0.7rem', display: 'flex', gap: '0.25rem' }}
                                    onClick={() => handleManualConvertToProject(deal)}
                                  >
                                    Convert to Project
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          <div style={dealCardFooterStyle}>
                            <span style={dealDateStyle}>
                              <Calendar size={12} />
                              {new Date(deal.created_at).toLocaleDateString()}
                            </span>

                            {/* Stage Navigation Arrows */}
                            <div style={arrowControlsContainer}>
                              <button
                                style={arrowButtonStyle}
                                disabled={stageIdx === 0}
                                onClick={() => handleStageChange(deal.id, PIPELINE_STAGES[stageIdx - 1].id)}
                                title="Move to previous stage"
                              >
                                <ChevronLeft size={14} />
                              </button>
                              <button
                                style={arrowButtonStyle}
                                disabled={stageIdx === PIPELINE_STAGES.length - 1}
                                onClick={() => handleStageChange(deal.id, PIPELINE_STAGES[stageIdx + 1].id)}
                                title="Move to next stage"
                              >
                                <ChevronRight size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* CREATE DEAL MODAL */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem' }}>Create Deal Opportunity</h3>
              <button className="btn btn-ghost" onClick={() => setIsModalOpen(false)} style={{ padding: '0.25rem' }}>✕</button>
            </div>

            <form onSubmit={handleCreateDeal}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                {error && (
                  <div style={modalErrorBanner}>
                    <span>{error}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Select Qualified Lead *</label>
                  <select
                    className="form-select"
                    required
                    value={dealForm.lead_id}
                    onChange={(e) => setDealForm({ ...dealForm, lead_id: e.target.value })}
                  >
                    <option value="">-- Choose a Qualified Lead --</option>
                    {availableLeads.map(l => (
                      <option key={l.id} value={l.id}>
                        {l.name} {l.title ? `(${l.title})` : ''}
                      </option>
                    ))}
                  </select>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Only leads marked as 'qualified' that do not already have active deals are listed.
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">Expected Deal Value (USD) *</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <DollarSign size={16} style={{ position: 'absolute', left: '1rem', color: 'var(--text-muted)' }} />
                    <input
                      type="number"
                      className="form-input"
                      style={{ paddingLeft: '2.25rem' }}
                      placeholder="e.g. 25000"
                      required
                      value={dealForm.value}
                      onChange={(e) => setDealForm({ ...dealForm, value: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Initial Stage</label>
                  <select
                    className="form-select"
                    value={dealForm.stage}
                    onChange={(e) => setDealForm({ ...dealForm, stage: e.target.value as StageId })}
                  >
                    {PIPELINE_STAGES.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Creating...' : 'Create Deal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT DEAL MODAL */}
      {isEditModalOpen && editingDeal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem' }}>Modify Deal Information</h3>
              <button className="btn btn-ghost" onClick={() => setIsEditModalOpen(false)} style={{ padding: '0.25rem' }}>✕</button>
            </div>

            <form onSubmit={handleUpdateDeal}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                {error && (
                  <div style={modalErrorBanner}>
                    <span>{error}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Deal Account</label>
                  <input
                    type="text"
                    className="form-input"
                    disabled
                    value={getLeadName(editingDeal.lead_id)}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    To change the prospect name, please edit the lead directly.
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">Expected Deal Value (USD) *</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <DollarSign size={16} style={{ position: 'absolute', left: '1rem', color: 'var(--text-muted)' }} />
                    <input
                      type="number"
                      className="form-input"
                      style={{ paddingLeft: '2.25rem' }}
                      placeholder="e.g. 25000"
                      required
                      value={editForm.value}
                      onChange={(e) => setEditForm({ ...editForm, value: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Pipeline Stage</label>
                  <select
                    className="form-select"
                    value={editForm.stage}
                    onChange={(e) => setEditForm({ ...editForm, stage: e.target.value as StageId })}
                  >
                    {PIPELINE_STAGES.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Deal Status</label>
                  <select
                    className="form-select"
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as Deal['status'] })}
                  >
                    <option value="active">Active</option>
                    <option value="won">Won (Closed)</option>
                    <option value="lost">Lost (Closed)</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

// --- DEALS PAGE INLINE STYLES ---
const controlsRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '1rem',
};

const titleAreaStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
};

const columnValueStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  color: 'var(--text-secondary)',
  marginTop: '0.15rem',
  display: 'block',
};

const emptyColumnCard: React.CSSProperties = {
  padding: '1.5rem',
  textAlign: 'center',
  color: 'var(--text-muted)',
  fontSize: '0.8rem',
  background: 'rgba(255, 255, 255, 0.01)',
  border: '1px dashed var(--border-color)',
  borderRadius: 'var(--radius-sm)',
};

const dealCardStyle: React.CSSProperties = {
  padding: '0.85rem',
  background: 'rgba(13, 20, 38, 0.95)',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.65rem',
};

const dealCardHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const dealLeadNameStyle: React.CSSProperties = {
  fontSize: '0.85rem',
  fontWeight: 600,
  color: '#ffffff',
};

const dealCardBodyStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.35rem',
};

const dealCompanyStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: 'var(--text-muted)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const dealValueBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.15rem',
  background: 'rgba(59, 130, 246, 0.1)',
  color: '#60a5fa',
  padding: '0.2rem 0.5rem',
  borderRadius: '4px',
  width: 'fit-content',
  fontSize: '0.8rem',
};

const dealCardFooterStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: '0.25rem',
  paddingTop: '0.5rem',
  borderTop: '1px solid rgba(255, 255, 255, 0.04)',
};

const dealDateStyle: React.CSSProperties = {
  fontSize: '0.7rem',
  color: 'var(--text-muted)',
  display: 'flex',
  alignItems: 'center',
  gap: '0.25rem',
};

const arrowControlsContainer: React.CSSProperties = {
  display: 'flex',
  gap: '0.25rem',
};

const arrowButtonStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid var(--border-color)',
  borderRadius: '4px',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  padding: '0.2rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const modalErrorBanner: React.CSSProperties = {
  background: 'var(--danger-bg)',
  border: '1px solid rgba(239, 68, 68, 0.3)',
  borderRadius: 'var(--radius-sm)',
  padding: '0.75rem',
  color: '#f87171',
  fontSize: '0.8rem',
};
