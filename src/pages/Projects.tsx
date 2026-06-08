import React, { useEffect, useState } from 'react';
import { db } from '../utils/db';
import { Project, Client, User } from '../utils/mockDb';
import { Link } from 'react-router-dom';
import { Folder, ArrowUpRight, Activity, Percent, Layers, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Projects: React.FC = () => {
  const { isAdmin } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedManagers, setSelectedManagers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  async function loadProjects() {
    try {
      const [projectsData, clientsData, usersData] = await Promise.all([
        db.projects.list(),
        db.clients.list(),
        db.users.list()
      ]);
      setProjects(projectsData);
      setClients(clientsData);
      setUsers(usersData);
    } catch (err) {
      console.error('Failed to load projects:', err);
    }
  }

  useEffect(() => {
    async function init() {
      setLoading(true);
      await loadProjects();
      setLoading(false);
    }
    init();
  }, []);

  const handleApproveProject = async (projectId: string, managerId: string) => {
    if (!managerId) return;
    try {
      await db.projects.approve(projectId, managerId);
      await loadProjects();
      setSelectedManagers(prev => {
        const updated = { ...prev };
        delete updated[projectId];
        return updated;
      });
    } catch (err: any) {
      alert(err.message || 'Failed to approve project');
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!window.confirm('Are you sure you want to delete this project? All associated milestones and tasks will be deleted forever.')) return;
    try {
      await db.projects.delete(projectId);
      const projectsData = await db.projects.list();
      setProjects(projectsData);
    } catch (err: any) {
      alert(err.message || 'Failed to delete project');
    }
  };

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : 'Unknown Client';
  };

  const getManagerName = (managerId: string | null) => {
    if (!managerId) return 'No Manager Allocated';
    const mgr = users.find(u => u.id === managerId);
    return mgr ? mgr.name : 'Unknown Manager';
  };

  // Summary Metrics
  const pendingProjects = projects.filter(p => p.status === 'pending_approval');
  const approvedProjects = projects.filter(p => p.status !== 'pending_approval');
  const managers = users.filter(u => u.role === 'manager' || u.role === 'admin');

  const totalCount = approvedProjects.length;
  const activeCount = approvedProjects.filter(p => p.status === 'active').length;
  const completedCount = approvedProjects.filter(p => p.status === 'completed' || Number(p.progress) === 100).length;
  const averageProgress = totalCount > 0 
    ? Math.round(approvedProjects.reduce((acc, p) => acc + Number(p.progress), 0) / totalCount)
    : 0;

  return (
    <div className="anim-fade" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* KPI summaries */}
      <div className="kpi-grid">
        <div className="glass-panel kpi-card">
          <div className="kpi-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#60a5fa' }}>
            <Folder size={20} />
          </div>
          <div>
            <div style={kpiLabelStyle}>Total Portfolios</div>
            <div className="kpi-value">{totalCount}</div>
            <div style={kpiSubtextStyle}>{activeCount} currently active</div>
          </div>
        </div>

        <div className="glass-panel kpi-card">
          <div className="kpi-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#34d399' }}>
            <Activity size={20} />
          </div>
          <div>
            <div style={kpiLabelStyle}>Finished Projects</div>
            <div className="kpi-value">{completedCount}</div>
            <div style={kpiSubtextStyle}>100% tasks completed</div>
          </div>
        </div>

        <div className="glass-panel kpi-card">
          <div className="kpi-icon-wrapper" style={{ background: 'rgba(167, 139, 250, 0.12)', color: '#c084fc' }}>
            <Percent size={20} />
          </div>
          <div>
            <div style={kpiLabelStyle}>Average Progress</div>
            <div className="kpi-value">{averageProgress}%</div>
            <div style={kpiSubtextStyle}>Across all portfolios</div>
          </div>
        </div>
      </div>

      {/* Pending Project Approvals (Admin Only) */}
      {isAdmin && pendingProjects.length > 0 && (
        <div className="glass-panel" style={pendingApprovalsContainerStyle}>
          <div style={pendingHeaderStyle}>
            <Layers size={18} style={{ color: 'var(--primary)' }} />
            <h3 style={pendingTitleStyle}>Pending Project Approvals</h3>
          </div>
          <p style={pendingSubtitleStyle}>
            The following projects were generated from won deals and require manager allocation for activation:
          </p>
          <div style={pendingGridStyle}>
            {pendingProjects.map(project => (
              <div key={project.id} style={pendingRowStyle}>
                <div style={pendingInfoStyle}>
                  <strong style={pendingProjectNameStyle}>{project.name}</strong>
                  <span style={pendingProjectClientStyle}>Client: {getClientName(project.client_id)}</span>
                </div>
                <div style={pendingActionsStyle}>
                  <select
                    className="form-select"
                    style={pendingSelectStyle}
                    value={selectedManagers[project.id] || ''}
                    onChange={(e) => setSelectedManagers(prev => ({ ...prev, [project.id]: e.target.value }))}
                  >
                    <option value="">-- Assign Manager --</option>
                    {managers.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                  <button
                    className="btn btn-primary"
                    style={pendingButtonStyle}
                    disabled={!selectedManagers[project.id]}
                    onClick={() => handleApproveProject(project.id, selectedManagers[project.id])}
                  >
                    Activate Workspace
                  </button>
                  <button
                    type="button"
                    style={{
                      color: '#f87171',
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.35rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                    }}
                    onClick={() => handleDeleteProject(project.id)}
                    title="Delete Pending Project"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Projects list */}
      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <span>Syncing project boards...</span>
        </div>
      ) : approvedProjects.length === 0 ? (
        <div className="glass-panel" style={emptyProjectsStyle}>
          <Layers size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <h3>No Active Projects</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Win a deal in the CRM Pipeline to automatically generate a project workspace.
          </p>
        </div>
      ) : (
        <div style={projectsGridStyle}>
          {approvedProjects.map(project => (
            <div key={project.id} className="glass-panel" style={projectCardStyle}>
              
              <div style={projectCardHeaderStyle}>
                <div style={projectTitleWrapper}>
                  <h4 style={projectNameStyle}>{project.name}</h4>
                  <span style={projectClientStyle}>{getClientName(project.client_id)}</span>
                  <span style={projectManagerStyle}>Manager: {getManagerName(project.manager_id)}</span>
                </div>
                
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <Link to={`/projects/${project.id}`} style={openLinkStyle} title="Open Project Board">
                    <ArrowUpRight size={18} />
                  </Link>
                  {isAdmin && (
                    <button
                      type="button"
                      style={deleteProjectButtonStyle}
                      onClick={() => handleDeleteProject(project.id)}
                      title="Delete Project"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>

              <div style={projectCardBodyStyle}>
                <div style={progressLabelRow}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Workspace Completion</span>
                  <strong style={{ fontSize: '0.85rem', color: 'var(--primary)' }}>{Math.round(project.progress)}%</strong>
                </div>

                <div className="progress-bar-container">
                  <div 
                    className="progress-bar-fill" 
                    style={{ width: `${project.progress}%` }}
                  ></div>
                </div>
              </div>

              <div style={projectCardFooterStyle}>
                <span style={statusBadgeStyle(project.status)}>
                  {project.status.toUpperCase()}
                </span>
                
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Created {new Date(project.created_at).toLocaleDateString()}
                </span>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const pendingApprovalsContainerStyle: React.CSSProperties = {
  border: '1px solid var(--border-color)',
  padding: '1.25rem 1.5rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
  background: 'linear-gradient(to right, rgba(99, 102, 241, 0.04), rgba(168, 85, 247, 0.04))',
};

const pendingHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
};

const pendingTitleStyle: React.CSSProperties = {
  fontSize: '1.05rem',
  fontWeight: 600,
  color: 'var(--text-primary)',
};

const pendingSubtitleStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  color: 'var(--text-secondary)',
  lineHeight: 1.4,
};

const pendingGridStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
  marginTop: '0.25rem',
};

const pendingRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '1rem',
  padding: '0.85rem 1rem',
  background: 'rgba(255, 255, 255, 0.02)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-sm)',
};

const pendingInfoStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.15rem',
  minWidth: 0,
};

const pendingProjectNameStyle: React.CSSProperties = {
  fontSize: '0.9rem',
  color: 'var(--text-primary)',
};

const pendingProjectClientStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: 'var(--text-muted)',
};

const pendingActionsStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  flexWrap: 'wrap',
};

const pendingSelectStyle: React.CSSProperties = {
  padding: '0.35rem 0.5rem',
  fontSize: '0.8rem',
  width: '180px',
  background: 'var(--bg-card)',
  border: '1px solid var(--border-color)',
  color: 'var(--text-primary)',
};

const pendingButtonStyle: React.CSSProperties = {
  padding: '0.35rem 0.8rem',
  fontSize: '0.8rem',
};

// --- PROJECTS PAGE STYLES ---
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

const emptyProjectsStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '4rem',
  textAlign: 'center',
};

const projectsGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
  gap: '1.5rem',
};

const projectCardStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1.25rem',
  background: 'var(--bg-card)',
  padding: '1.5rem',
};

const projectCardHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: '1rem',
};

const projectTitleWrapper: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.2rem',
  minWidth: 0,
};

const projectNameStyle: React.CSSProperties = {
  fontSize: '1.1rem',
  fontWeight: 600,
  color: 'var(--text-primary)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const projectClientStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  color: 'var(--text-secondary)',
};

const projectManagerStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: 'var(--text-muted)',
  marginTop: '0.15rem',
};

const openLinkStyle: React.CSSProperties = {
  color: 'var(--text-secondary)',
  background: 'rgba(255, 255, 255, 0.03)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-sm)',
  padding: '0.4rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'all var(--transition-fast)',
};

const deleteProjectButtonStyle: React.CSSProperties = {
  color: '#f87171',
  background: 'rgba(239, 68, 68, 0.08)',
  border: '1px solid rgba(239, 68, 68, 0.2)',
  borderRadius: 'var(--radius-sm)',
  padding: '0.4rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'all var(--transition-fast)',
};

const projectCardBodyStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
};

const progressLabelRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const projectCardFooterStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: '0.25rem',
  paddingTop: '0.75rem',
  borderTop: '1px solid rgba(255, 255, 255, 0.04)',
};

const statusBadgeStyle = (status: string): React.CSSProperties => {
  const isActive = status === 'active';
  return {
    fontSize: '0.65rem',
    fontWeight: 700,
    background: isActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255,255,255,0.05)',
    color: isActive ? '#34d399' : 'var(--text-secondary)',
    padding: '0.15rem 0.45rem',
    borderRadius: '4px',
  };
};
