import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../utils/db';
import { Lead, Deal, Project, Task, Invoice, Expense } from '../utils/mockDb';
import { SearchFilterBar } from '../components/SearchFilterBar';
import { 
  Users, 
  TrendingUp, 
  Briefcase, 
  DollarSign, 
  ClipboardList, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const { user, isAdmin, isStaff } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [leadsData, dealsData, projectsData, tasksData] = await Promise.all([
          db.leads.list(),
          db.deals.list(),
          db.projects.list(),
          db.tasks.list()
        ]);
        
        setLeads(leadsData);
        setDeals(dealsData);
        setProjects(projectsData);
        setTasks(tasksData);

        if (isAdmin) {
          const [invoicesData, expensesData] = await Promise.all([
            db.invoices.list(),
            db.expenses.list()
          ]);
          setInvoices(invoicesData);
          setExpenses(expensesData);
        }
      } catch (err) {
        console.error('Failed to load dashboard metrics:', err);
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      loadDashboardData();
    }
  }, [user, isAdmin]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <span>Loading workspace stats...</span>
      </div>
    );
  }

  // Calculations
  const activeProjects = projects.filter(p => p.status === 'active');
  const avgProgress = activeProjects.length > 0 
    ? Math.round(activeProjects.reduce((acc, p) => acc + Number(p.progress), 0) / activeProjects.length)
    : 0;

  const wonDealsValue = deals
    .filter(d => d.stage === 'won' || d.status === 'won')
    .reduce((acc, d) => acc + Number(d.value), 0);

  const newLeadsCount = leads.filter(l => l.status === 'new').length;

  // Financial calculations (Admin only)
  const totalInvoices = invoices.reduce((acc, inv) => acc + Number(inv.amount), 0);
  const paidInvoices = invoices.filter(i => i.status === 'paid').reduce((acc, i) => acc + Number(i.amount), 0);
  const totalExpenses = expenses.reduce((acc, exp) => acc + Number(exp.amount), 0);
  const netProfit = paidInvoices - totalExpenses;

  // Task lists
  const pendingTasks = tasks.filter(t => t.status !== 'done');
  const completedTasksCount = tasks.filter(t => t.status === 'done').length;

  return (
    <div className="anim-fade" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Global Unified Search Bar */}
      <SearchFilterBar />

      {/* 1. KPI WIDGETS GRID */}
      <div className="kpi-grid">
        <div className="glass-panel kpi-card">
          <div className="kpi-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#60a5fa' }}>
            <Users size={22} />
          </div>
          <div>
            <div style={kpiLabelStyle}>Active Leads</div>
            <div className="kpi-value">{leads.length}</div>
            <div style={kpiSubtextStyle}>{newLeadsCount} new this week</div>
          </div>
        </div>

        {isAdmin && (
          <div className="glass-panel kpi-card">
            <div className="kpi-icon-wrapper" style={{ background: 'rgba(167, 139, 250, 0.12)', color: '#c084fc' }}>
              <TrendingUp size={22} />
            </div>
            <div>
              <div style={kpiLabelStyle}>Won Revenue</div>
              <div className="kpi-value">${wonDealsValue.toLocaleString()}</div>
              <div style={kpiSubtextStyle}>{deals.filter(d => d.stage === 'won').length} deals closed won</div>
            </div>
          </div>
        )}

        <div className="glass-panel kpi-card">
          <div className="kpi-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#34d399' }}>
            <Briefcase size={22} />
          </div>
          <div>
            <div style={kpiLabelStyle}>Active Projects</div>
            <div className="kpi-value">{activeProjects.length}</div>
            <div style={kpiSubtextStyle}>Avg progress: {avgProgress}%</div>
          </div>
        </div>

        {isAdmin ? (
          <div className="glass-panel kpi-card" style={{ border: '1px solid rgba(16, 185, 129, 0.25)' }}>
            <div className="kpi-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
              <DollarSign size={22} />
            </div>
            <div>
              <div style={kpiLabelStyle}>Net Profit (Realized)</div>
              <div className="kpi-value" style={{ color: netProfit >= 0 ? '#34d399' : '#f87171' }}>
                {netProfit < 0 ? '-' : ''}${Math.abs(netProfit).toLocaleString()}
              </div>
              <div style={kpiSubtextStyle}>Collected invoices minus costs</div>
            </div>
          </div>
        ) : (
          <div className="glass-panel kpi-card">
            <div className="kpi-icon-wrapper" style={{ background: 'rgba(6, 182, 212, 0.12)', color: '#22d3ee' }}>
              <ClipboardList size={22} />
            </div>
            <div>
              <div style={kpiLabelStyle}>Your Deliveries</div>
              <div className="kpi-value">{pendingTasks.length}</div>
              <div style={kpiSubtextStyle}>{completedTasksCount} tasks completed</div>
            </div>
          </div>
        )}
      </div>

      {/* 2. ADMIN FINANCIAL OVERVIEW OR OTHER ROLES PROGRESS CARD */}
      {isAdmin && (
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h3 style={{ fontSize: '1.1rem' }}>Finance Health Check</h3>
          <div style={financialGridStyle}>
            <div style={financeCardStyle}>
              <span style={financeCardLabelStyle}>Total Invoiced</span>
              <strong style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>${totalInvoices.toLocaleString()}</strong>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', fontSize: '0.75rem' }}>
                <span style={{ color: '#34d399' }}>${paidInvoices.toLocaleString()} Paid</span>
                <span style={{ color: 'var(--text-muted)' }}>|</span>
                <span style={{ color: '#fbbf24' }}>${(totalInvoices - paidInvoices).toLocaleString()} Unpaid</span>
              </div>
            </div>

            <div style={financeCardStyle}>
              <span style={financeCardLabelStyle}>Total Expenses</span>
              <strong style={{ fontSize: '1.5rem', color: '#f87171' }}>${totalExpenses.toLocaleString()}</strong>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Ads, salaries, & tooling costs
              </span>
            </div>

            <div style={financeCardStyle}>
              <span style={financeCardLabelStyle}>Projected Margin</span>
              <strong style={{ fontSize: '1.5rem', color: 'var(--primary)' }}>
                {totalInvoices > 0 ? Math.round(((totalInvoices - totalExpenses) / totalInvoices) * 100) : 0}%
              </strong>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Total income-to-cost ratio
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. TASK OVERVIEW SECTION */}
      <div className="grid-dashboard">
        
        {/* Left Side: Tasks Board List */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.1rem' }}>
              {isStaff ? 'My Assigned Deliveries' : 'Active Tasks Board'}
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Showing {pendingTasks.length} pending items
            </span>
          </div>

          {pendingTasks.length === 0 ? (
            <div style={emptyStateStyle}>
              <CheckCircle2 size={36} style={{ color: 'var(--success)', marginBottom: '0.5rem' }} />
              <div style={{ fontWeight: 600 }}>All caught up!</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>No pending tasks in this project space</div>
            </div>
          ) : (
            <div style={taskListStyle}>
              {pendingTasks.slice(0, 5).map(task => (
                <div key={task.id} style={taskItemStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                    <AlertCircle size={18} style={{ color: task.status === 'in-progress' ? '#fbbf24' : 'var(--text-muted)', flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={taskTitleStyle}>{task.title}</div>
                      <div style={taskDescStyle}>{task.description || 'No description provided'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={taskDueDateStyle}>Due {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'}</span>
                    <span style={taskStatusBadgeStyle(task.status)}>{task.status}</span>
                  </div>
                </div>
              ))}
              {pendingTasks.length > 5 && (
                <Link to="/projects" style={viewAllTasksLinkStyle}>
                  View all remaining {pendingTasks.length - 5} tasks →
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Quick Action Panel */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h3 style={{ fontSize: '1.1rem' }}>System Workflows</h3>
          <div style={quickLinksContainerStyle}>
            <Link to="/crm" style={quickLinkCardStyle}>
              <div style={quickLinkCardTitleStyle}>Create New Lead</div>
              <div style={quickLinkCardDescStyle}>Capture sales prospects manually</div>
            </Link>
            
            <Link to="/crm" style={quickLinkCardStyle}>
              <div style={quickLinkCardTitleStyle}>Manage Deals</div>
              <div style={quickLinkCardDescStyle}>Advance opportunities in the pipeline</div>
            </Link>

            <Link to="/projects" style={quickLinkCardStyle}>
              <div style={quickLinkCardTitleStyle}>Execution Deck</div>
              <div style={quickLinkCardDescStyle}>Track milestones and task status</div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- STYLES FOR DASHBOARD ---
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

const financialGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '1rem',
};

const financeCardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.015)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-sm)',
  padding: '1rem 1.25rem',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
};

const financeCardLabelStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: 'var(--text-secondary)',
  marginBottom: '0.35rem',
  fontWeight: 500,
};

const emptyStateStyle: React.CSSProperties = {
  padding: '2.5rem',
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
};

const taskListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
};

const taskItemStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0.75rem 1rem',
  background: 'rgba(255,255,255,0.02)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-sm)',
  gap: '1rem',
};

const taskTitleStyle: React.CSSProperties = {
  fontSize: '0.85rem',
  fontWeight: 600,
  color: 'var(--text-primary)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const taskDescStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: 'var(--text-muted)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  marginTop: '0.15rem',
};

const taskDueDateStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: 'var(--text-secondary)',
  whiteSpace: 'nowrap',
};

const taskStatusBadgeStyle = (status: string): React.CSSProperties => {
  const isProgress = status === 'in-progress';
  return {
    fontSize: '0.65rem',
    fontWeight: 700,
    background: isProgress ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.05)',
    color: isProgress ? '#fbbf24' : 'var(--text-secondary)',
    padding: '0.15rem 0.45rem',
    borderRadius: '4px',
    textTransform: 'uppercase',
  };
};

const viewAllTasksLinkStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  fontWeight: 500,
  color: 'var(--primary)',
  textDecoration: 'none',
  alignSelf: 'flex-start',
  marginTop: '0.5rem',
};

const quickLinksContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
};

const quickLinkCardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.02)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-sm)',
  padding: '0.85rem 1rem',
  cursor: 'pointer',
  textDecoration: 'none',
  display: 'block',
  transition: 'all var(--transition-fast)',
};

const quickLinkCardTitleStyle: React.CSSProperties = {
  fontSize: '0.85rem',
  fontWeight: 600,
  color: 'var(--text-primary)',
};

const quickLinkCardDescStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: 'var(--text-secondary)',
  marginTop: '0.15rem',
};
