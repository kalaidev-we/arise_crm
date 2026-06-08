import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../utils/db';
import { Project, Milestone, Task, User, Client } from '../utils/mockDb';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, 
  Plus, 
  CheckSquare, 
  Clock, 
  User as UserIcon, 
  Trash2, 
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export const ProjectDetails: React.FC = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const { user, isStaff, isAdmin } = useAuth();
  
  const [project, setProject] = useState<Project | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [team, setTeam] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string>('');
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    assigned_to: '',
    assigned_role: '',
    due_date: '',
    status: 'todo' as Task['status'],
  });
  const [reportTexts, setReportTexts] = useState<Record<string, string>>({});
  const [savingTask, setSavingTask] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);

  const fetchProjectData = async () => {
    if (!projectId) return;
    try {
      const [projectsData, milestonesData, tasksData, teamData, clientsData] = await Promise.all([
        db.projects.list(),
        db.milestones.list(projectId),
        db.tasks.list(projectId),
        db.users.list(),
        db.clients.list()
      ]);

      const matchedProj = projectsData.find(p => p.id === projectId);
      if (matchedProj) {
        setProject(matchedProj);
        const matchedClient = clientsData.find(c => c.id === matchedProj.client_id);
        if (matchedClient) setClient(matchedClient);
      }
      setMilestones(milestonesData);
      setTasks(tasksData);
      setTeam(teamData);
    } catch (err) {
      console.error('Failed to load project execution data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  const handleOpenAddTask = (milestoneId: string) => {
    setSelectedMilestoneId(milestoneId);
    setTaskForm({
      title: '',
      description: '',
      assigned_to: '',
      assigned_role: '',
      due_date: '',
      status: 'todo',
    });
    setTaskError(null);
    setIsTaskModalOpen(true);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTask(true);
    setTaskError(null);
    try {
      await db.tasks.create({
        milestone_id: selectedMilestoneId,
        title: taskForm.title,
        description: taskForm.description,
        assigned_to: taskForm.assigned_to || null,
        assigned_role: taskForm.assigned_role || undefined,
        due_date: taskForm.due_date,
        status: taskForm.status,
      });
      setIsTaskModalOpen(false);
      await fetchProjectData(); // Refresh list & update project progress bar!
    } catch (err: any) {
      setTaskError(err.message || 'Failed to create task');
    } finally {
      setSavingTask(false);
    }
  };

  const handleTaskReportSubmit = async (taskId: string) => {
    const text = reportTexts[taskId];
    if (text === undefined) return;
    try {
      await db.tasks.update(taskId, { report_text: text });
      alert('Report submitted successfully!');
      await fetchProjectData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit report');
    }
  };

  const handleTaskStatusChange = async (taskId: string, newStatus: Task['status']) => {
    try {
      await db.tasks.update(taskId, { status: newStatus });
      await fetchProjectData(); // Refresh progress
    } catch (err: any) {
      alert(err.message || 'Failed to update task');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await db.tasks.delete(taskId);
      await fetchProjectData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete task');
    }
  };

  const getAssigneeName = (userId: string | null) => {
    if (!userId) return 'Unassigned';
    const member = team.find(t => t.id === userId);
    return member ? member.name : 'Unknown';
  };

  const getManagerName = (managerId: string | null | undefined) => {
    if (!managerId) return 'No Manager Allocated';
    const member = team.find(t => t.id === managerId);
    return member ? member.name : 'Unknown Manager';
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <span>Syncing team backlog...</span>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
        <AlertCircle size={40} style={{ color: 'var(--danger)', marginBottom: '1rem' }} />
        <h3>Project Not Found</h3>
        <Link to="/projects" className="btn btn-secondary" style={{ marginTop: '1rem' }}>
          Back to Projects List
        </Link>
      </div>
    );
  }

  return (
    <div className="anim-fade" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Back to Projects Header */}
      <div style={backHeaderRow}>
        <Link to="/projects" style={backLinkStyle}>
          <ArrowLeft size={16} />
          <span>Back to Portfolios</span>
        </Link>
        <span style={clientNameBreadcrumb}>{client ? client.name : 'Client Workspace'}</span>
      </div>

      {/* Project Banner Card */}
      <div className="glass-panel" style={bannerCardStyle}>
        <div style={bannerLeftCol}>
          <h2 style={{ fontSize: '1.4rem' }}>{project.name}</h2>
          <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '0.2rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Active execution board tracking sprints and deliveries
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>•</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 500 }}>
              Manager: {getManagerName(project.manager_id)}
            </span>
          </div>
        </div>

        <div style={bannerRightCol}>
          <div style={progressPercentageRow}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Real-time Delivery</span>
            <strong style={{ fontSize: '1.1rem', color: 'var(--primary)' }}>{Math.round(project.progress)}%</strong>
          </div>
          <div className="progress-bar-container" style={{ width: '180px' }}>
            <div className="progress-bar-fill" style={{ width: `${project.progress}%` }}></div>
          </div>
        </div>
      </div>

      {/* Milestones accordion layout */}
      <div style={milestonesContainerStyle}>
        {milestones.length === 0 ? (
          <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
            <span style={{ color: 'var(--text-muted)' }}>No milestones defined for this project.</span>
          </div>
        ) : (
          milestones.map(milestone => {
            const milestoneTasks = tasks.filter(t => t.milestone_id === milestone.id);
            const doneTasks = milestoneTasks.filter(t => t.status === 'done').length;

            return (
              <div key={milestone.id} className="glass-panel" style={milestoneCardStyle}>
                
                {/* Milestone Header */}
                <div style={milestoneHeaderStyle}>
                  <div>
                    <h3 style={milestoneNameStyle}>{milestone.name}</h3>
                    <span style={milestoneStatsStyle}>
                      {doneTasks} of {milestoneTasks.length} tasks completed
                    </span>
                  </div>

                  {!isStaff && (
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                      onClick={() => handleOpenAddTask(milestone.id)}
                    >
                      <Plus size={14} />
                      <span>Create Task</span>
                    </button>
                  )}
                </div>

                {/* Milestone Tasks list */}
                <div style={tasksStackStyle}>
                  {milestoneTasks.length === 0 ? (
                    <div style={emptyMilestoneTasksStyle}>
                      <span>No tasks assigned to this phase yet</span>
                    </div>
                  ) : (
                    milestoneTasks.map(task => {
                      const isAssignedToMe = task.assigned_to === user?.id;
                      const canModify = !isStaff;
                      const canUpdateStatus = !isStaff || isAssignedToMe;

                      return (
                        <div key={task.id} style={taskItemStyle(task.status === 'done')}>
                          <div style={taskMainContentStyle}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              {task.status === 'done' ? (
                                <CheckCircle size={18} style={{ color: 'var(--success)' }} />
                              ) : (
                                <Clock size={18} style={{ color: task.status === 'in-progress' ? '#fbbf24' : 'var(--text-muted)' }} />
                              )}
                              <span style={taskTitleStyle(task.status === 'done')}>{task.title}</span>
                            </div>
                            
                            {task.description && (
                              <p style={taskDescriptionStyle}>{task.description}</p>
                            )}

                            <div style={taskMetaRowStyle}>
                              {task.assigned_role ? (
                                <span style={taskMetaLabelStyle}>
                                  <UserIcon size={12} />
                                  Role: {task.assigned_role.toUpperCase()}
                                </span>
                              ) : (
                                <span style={taskMetaLabelStyle}>
                                  <UserIcon size={12} />
                                  {getAssigneeName(task.assigned_to)}
                                </span>
                              )}
                              {task.due_date && (
                                <span style={taskMetaLabelStyle}>
                                  Due {new Date(task.due_date).toLocaleDateString()}
                                </span>
                              )}
                            </div>

                            {/* Report Section */}
                            {(task.assigned_to === user?.id || task.assigned_role === user?.role) && (
                              <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <textarea
                                  className="form-textarea"
                                  placeholder="Type your task report here..."
                                  value={reportTexts[task.id] !== undefined ? reportTexts[task.id] : (task.report_text || '')}
                                  onChange={(e) => setReportTexts({ ...reportTexts, [task.id]: e.target.value })}
                                  style={{ fontSize: '0.8rem', padding: '0.5rem', minHeight: '60px' }}
                                />
                                <div style={{ alignSelf: 'flex-start' }}>
                                  <button type="button" className="btn btn-primary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }} onClick={() => handleTaskReportSubmit(task.id)}>
                                    Submit Report
                                  </button>
                                </div>
                              </div>
                            )}
                            {(!isAssignedToMe && task.assigned_role !== user?.role && task.report_text) && (
                              <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                                <strong style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Report Submitted:</strong>
                                <p style={{ fontSize: '0.85rem', marginTop: '0.25rem', whiteSpace: 'pre-wrap' }}>{task.report_text}</p>
                              </div>
                            )}
                          </div>

                          <div style={taskActionsContainerStyle}>
                            <select
                              className="form-select"
                              style={taskSelectInputStyle}
                              value={task.status}
                              disabled={!canUpdateStatus}
                              onChange={(e) => handleTaskStatusChange(task.id, e.target.value as Task['status'])}
                              title={canUpdateStatus ? 'Change task status' : 'Only task assignee or managers can change status'}
                            >
                              <option value="todo">Todo</option>
                              <option value="in-progress">In Progress</option>
                              <option value="done">Done</option>
                            </select>

                            {isAdmin && (
                              <button 
                                onClick={() => handleDeleteTask(task.id)}
                                style={deleteButtonStyle}
                                title="Delete task"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* CREATE TASK MODAL */}
      {isTaskModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem' }}>Add Project Task</h3>
              <button className="btn btn-ghost" onClick={() => setIsTaskModalOpen(false)} style={{ padding: '0.25rem' }}>✕</button>
            </div>

            <form onSubmit={handleCreateTask}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                {taskError && (
                  <div style={modalErrorBanner}>
                    <span>{taskError}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Task Title *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    placeholder="e.g. Design wireframes for dashboard"
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    placeholder="Provide detailed instructions..."
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  />
                </div>

                <div style={formRowGrid}>
                  <div className="form-group">
                    <label className="form-label">Assign To User</label>
                    <select
                      className="form-select"
                      value={taskForm.assigned_to}
                      onChange={(e) => setTaskForm({ ...taskForm, assigned_to: e.target.value, assigned_role: '' })}
                    >
                      <option value="">-- Choose team member --</option>
                      {team.map(member => (
                        <option key={member.id} value={member.id}>
                          {member.name} ({member.role.toUpperCase()})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">OR Assign To Role</label>
                    <select
                      className="form-select"
                      value={taskForm.assigned_role}
                      onChange={(e) => setTaskForm({ ...taskForm, assigned_role: e.target.value, assigned_to: '' })}
                    >
                      <option value="">-- Choose Role --</option>
                      <option value="admin">Admin</option>
                      <option value="manager">Manager</option>
                      <option value="staff">Staff</option>
                    </select>
                  </div>
                </div>

                <div style={formRowGrid}>
                  <div className="form-group">
                    <label className="form-label">Due Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={taskForm.due_date}
                      onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Initial Status</label>
                    <select
                      className="form-select"
                      value={taskForm.status}
                      onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value as Task['status'] })}
                    >
                      <option value="todo">Todo</option>
                      <option value="in-progress">In Progress</option>
                      <option value="done">Done</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsTaskModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingTask}>
                  {savingTask ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// --- PROJECT DETAILS PAGE STYLES ---
const backHeaderRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const backLinkStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.4rem',
  fontSize: '0.85rem',
  color: 'var(--text-secondary)',
  textDecoration: 'none',
  transition: 'color var(--transition-fast)',
};

const clientNameBreadcrumb: React.CSSProperties = {
  fontSize: '0.85rem',
  color: 'var(--text-muted)',
};

const bannerCardStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '1rem',
};

const bannerLeftCol: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.2rem',
};

const bannerRightCol: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  gap: '0.5rem',
};

const progressPercentageRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
};

const milestonesContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
};

const milestoneCardStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border-color)',
  padding: '1.25rem 1.5rem',
};

const milestoneHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '1rem',
  paddingBottom: '0.75rem',
  borderBottom: '1px solid var(--border-color)',
};

const milestoneNameStyle: React.CSSProperties = {
  fontSize: '1.05rem',
  fontWeight: 600,
};

const milestoneStatsStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: 'var(--text-muted)',
};

const tasksStackStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.65rem',
};

const emptyMilestoneTasksStyle: React.CSSProperties = {
  padding: '1rem',
  textAlign: 'center',
  fontSize: '0.8rem',
  color: 'var(--text-muted)',
  background: 'rgba(255,255,255,0.01)',
  border: '1px dashed var(--border-color)',
  borderRadius: 'var(--radius-sm)',
};

const taskItemStyle = (isDone: boolean): React.CSSProperties => ({
  background: isDone ? 'rgba(0, 0, 0, 0.01)' : 'rgba(0, 0, 0, 0.02)',
  border: '1px solid',
  borderColor: isDone ? 'rgba(16, 185, 129, 0.15)' : 'var(--border-color)',
  borderRadius: 'var(--radius-sm)',
  padding: '0.85rem 1rem',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '1.5rem',
  opacity: isDone ? 0.75 : 1,
  transition: 'all var(--transition-fast)',
});

const taskMainContentStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '0.35rem',
};

const taskTitleStyle = (isDone: boolean): React.CSSProperties => ({
  fontSize: '0.9rem',
  fontWeight: 500,
  color: isDone ? 'var(--text-secondary)' : 'var(--text-primary)',
  textDecoration: isDone ? 'line-through' : 'none',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});

const taskDescriptionStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: 'var(--text-muted)',
  lineHeight: 1.4,
};

const taskMetaRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '1rem',
  alignItems: 'center',
  marginTop: '0.15rem',
};

const taskMetaLabelStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.3rem',
  fontSize: '0.75rem',
  color: 'var(--text-secondary)',
};

const taskActionsContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.65rem',
  flexShrink: 0,
};

const taskSelectInputStyle: React.CSSProperties = {
  padding: '0.35rem 0.5rem',
  fontSize: '0.8rem',
  width: '120px',
  background: 'var(--bg-card)',
  border: '1px solid var(--border-color)',
  color: 'var(--text-primary)',
};

const deleteButtonStyle: React.CSSProperties = {
  background: 'rgba(239, 68, 68, 0.08)',
  border: '1px solid rgba(239, 68, 68, 0.2)',
  borderRadius: '4px',
  color: '#f87171',
  cursor: 'pointer',
  padding: '0.35rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all var(--transition-fast)',
};

const formRowGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '1rem',
};

const modalErrorBanner: React.CSSProperties = {
  background: 'var(--danger-bg)',
  border: '1px solid rgba(239, 68, 68, 0.3)',
  borderRadius: 'var(--radius-sm)',
  padding: '0.75rem',
  color: '#f87171',
  fontSize: '0.8rem',
};
