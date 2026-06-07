import React, { useEffect, useState } from 'react';
import { db } from '../utils/db';
import { Invoice, Expense, Project, Client } from '../utils/mockDb';
import { 
  DollarSign, 
  Plus, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight, 
  Percent, 
  FileText, 
  Receipt,
  Trash2
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

export const Finance: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  // Form states
  const [invoiceForm, setInvoiceForm] = useState({
    project_id: '',
    amount: '',
    status: 'unpaid' as Invoice['status'],
  });

  const [expenseForm, setExpenseForm] = useState({
    project_id: '',
    category: 'salary' as Expense['category'],
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFinanceData = async () => {
    setLoading(true);
    try {
      const [invoicesData, expensesData, projectsData, clientsData] = await Promise.all([
        db.invoices.list(),
        db.expenses.list(),
        db.projects.list(),
        db.clients.list()
      ]);
      setInvoices(invoicesData);
      setExpenses(expensesData);
      setProjects(projectsData);
      setClients(clientsData);
    } catch (err) {
      console.error('Failed to load financial ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceData();
  }, []);

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const selectedProject = projects.find(p => p.id === invoiceForm.project_id);
      if (!selectedProject) throw new Error('Selected project is invalid');

      await db.invoices.create({
        project_id: invoiceForm.project_id,
        client_id: selectedProject.client_id, // Auto links client!
        amount: Number(invoiceForm.amount) || 0,
        status: invoiceForm.status,
      });

      setIsInvoiceModalOpen(false);
      setInvoiceForm({ project_id: '', amount: '', status: 'unpaid' });
      await fetchFinanceData();
    } catch (err: any) {
      setError(err.message || 'Failed to create invoice');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await db.expenses.create({
        project_id: expenseForm.project_id || null,
        category: expenseForm.category,
        amount: Number(expenseForm.amount) || 0,
        description: expenseForm.description,
        date: expenseForm.date,
      });

      setIsExpenseModalOpen(false);
      setExpenseForm({ project_id: '', category: 'salary', amount: '', description: '', date: new Date().toISOString().split('T')[0] });
      await fetchFinanceData();
    } catch (err: any) {
      setError(err.message || 'Failed to record expense');
    } finally {
      setSaving(false);
    }
  };

  const getProjectName = (projectId: string | null) => {
    if (!projectId) return 'Agency Operational';
    const project = projects.find(p => p.id === projectId);
    return project ? project.name : 'Unknown Project';
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!window.confirm('Are you sure you want to delete this invoice?')) return;
    try {
      await db.invoices.delete(invoiceId);
      await fetchFinanceData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete invoice');
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!window.confirm('Are you sure you want to delete this expense record?')) return;
    try {
      await db.expenses.delete(expenseId);
      await fetchFinanceData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete expense');
    }
  };

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : 'Unknown Client';
  };

  // Summaries Calculations
  const grossInvoiced = invoices.reduce((sum, i) => sum + Number(i.amount), 0);
  const realizedRevenue = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + Number(i.amount), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const netProfit = realizedRevenue - totalExpenses;
  const netMargin = realizedRevenue > 0 ? Math.round((netProfit / realizedRevenue) * 100) : 0;

  // Chart Data preparation: group invoices (realized) and expenses by month
  const getChartData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Initialize data structure for current year (assume 2026 based on metadata)
    const monthlySummary = months.map(m => ({
      name: m,
      Revenue: 0,
      Expenses: 0,
      Profit: 0
    }));

    // Populate invoices
    invoices.forEach(inv => {
      if (inv.status === 'paid') {
        const date = new Date(inv.created_at);
        const monthIndex = date.getMonth();
        if (monthIndex >= 0 && monthIndex < 12) {
          monthlySummary[monthIndex].Revenue += Number(inv.amount);
        }
      }
    });

    // Populate expenses
    expenses.forEach(exp => {
      const date = new Date(exp.date);
      const monthIndex = date.getMonth();
      if (monthIndex >= 0 && monthIndex < 12) {
        monthlySummary[monthIndex].Expenses += Number(exp.amount);
      }
    });

    // Calculate profit
    monthlySummary.forEach(item => {
      item.Profit = item.Revenue - item.Expenses;
    });

    // Return only months that have active transactions to make chart clean
    return monthlySummary.filter(item => item.Revenue > 0 || item.Expenses > 0);
  };

  return (
    <div className="anim-fade" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Financial Health Overview cards */}
      <div className="kpi-grid">
        <div className="glass-panel kpi-card">
          <div className="kpi-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#60a5fa' }}>
            <ArrowUpRight size={20} />
          </div>
          <div>
            <div style={kpiLabelStyle}>Realized Collections</div>
            <div className="kpi-value">${realizedRevenue.toLocaleString()}</div>
            <div style={kpiSubtextStyle}>Out of ${grossInvoiced.toLocaleString()} invoiced</div>
          </div>
        </div>

        <div className="glass-panel kpi-card">
          <div className="kpi-icon-wrapper" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#f87171' }}>
            <ArrowDownRight size={20} />
          </div>
          <div>
            <div style={kpiLabelStyle}>Total Expenses</div>
            <div className="kpi-value">${totalExpenses.toLocaleString()}</div>
            <div style={kpiSubtextStyle}>Operational & project costs</div>
          </div>
        </div>

        <div className="glass-panel kpi-card" style={{ border: '1px solid rgba(16, 185, 129, 0.25)' }}>
          <div className="kpi-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
            <DollarSign size={20} />
          </div>
          <div>
            <div style={kpiLabelStyle}>Net Profit</div>
            <div className="kpi-value" style={{ color: netProfit >= 0 ? '#34d399' : '#f87171' }}>
              {netProfit < 0 ? '-' : ''}${Math.abs(netProfit).toLocaleString()}
            </div>
            <div style={kpiSubtextStyle}>{netMargin}% collection margin</div>
          </div>
        </div>
      </div>

      {/* Recharts chart block */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Cashflow Timeline (2026)</h3>
        <div style={{ width: '100%', height: 280 }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <div className="spinner"></div>
            </div>
          ) : getChartData().length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
              No cashflow recorded yet for chart rendering
            </div>
          ) : (
            <ResponsiveContainer>
              <BarChart data={getChartData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="name" stroke="var(--text-secondary)" />
                <YAxis stroke="var(--text-secondary)" />
                <Tooltip 
                  contentStyle={{ 
                    background: 'var(--bg-app)', 
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)' 
                  }} 
                />
                <Legend />
                <Bar dataKey="Revenue" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Expenses" fill="#f87171" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Profit" fill="#34d399" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Double ledger sheets: Invoices & Expenses */}
      <div style={ledgerGridStyle}>
        
        {/* Left Side: Invoices */}
        <div className="glass-panel" style={{ padding: '1.5rem 0 0 0', overflow: 'hidden' }}>
          <div style={ledgerHeaderStyle}>
            <h3 style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <FileText size={16} /> Invoices Ledger
            </h3>
            <button className="btn btn-secondary" style={ledgerAddBtnStyle} onClick={() => setIsInvoiceModalOpen(true)}>
              <Plus size={12} /> Invoice
            </button>
          </div>

          <div className="table-container">
            <table className="custom-table" style={{ fontSize: '0.8rem' }}>
              <thead>
                <tr>
                  <th>Client / Project</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No invoices generated</td>
                  </tr>
                ) : (
                  invoices.map(inv => (
                    <tr key={inv.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{getClientName(inv.client_id)}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{getProjectName(inv.project_id)}</div>
                      </td>
                      <td>${Number(inv.amount).toLocaleString()}</td>
                      <td>
                        <span style={invStatusBadgeStyle(inv.status)}>{inv.status}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ padding: '0.25rem', color: '#f87171' }}
                          onClick={() => handleDeleteInvoice(inv.id)}
                          title="Delete Invoice"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Expenses */}
        <div className="glass-panel" style={{ padding: '1.5rem 0 0 0', overflow: 'hidden' }}>
          <div style={ledgerHeaderStyle}>
            <h3 style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Receipt size={16} /> Operational Expenses
            </h3>
            <button className="btn btn-secondary" style={ledgerAddBtnStyle} onClick={() => setIsExpenseModalOpen(true)}>
              <Plus size={12} /> Expense
            </button>
          </div>

          <div className="table-container">
            <table className="custom-table" style={{ fontSize: '0.8rem' }}>
              <thead>
                <tr>
                  <th>Category / Description</th>
                  <th>Linked Project</th>
                  <th>Amount</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No expenses recorded</td>
                  </tr>
                ) : (
                  expenses.map(exp => (
                    <tr key={exp.id}>
                      <td>
                        <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{exp.category}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{exp.description || 'No notes'}</div>
                      </td>
                      <td style={{ color: exp.project_id ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {getProjectName(exp.project_id)}
                      </td>
                      <td style={{ color: '#f87171' }}>-${Number(exp.amount).toLocaleString()}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ padding: '0.25rem', color: '#f87171' }}
                          onClick={() => handleDeleteExpense(exp.id)}
                          title="Delete Expense"
                        >
                          <Trash2 size={14} />
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

      {/* CREATE INVOICE MODAL */}
      {isInvoiceModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem' }}>Generate Client Invoice</h3>
              <button className="btn btn-ghost" onClick={() => setIsInvoiceModalOpen(false)} style={{ padding: '0.25rem' }}>✕</button>
            </div>

            <form onSubmit={handleCreateInvoice}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                {error && (
                  <div style={modalErrorBanner}>
                    <span>{error}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Link Project *</label>
                  <select
                    className="form-select"
                    required
                    value={invoiceForm.project_id}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, project_id: e.target.value })}
                  >
                    <option value="">-- Choose project to bill --</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({getClientName(p.client_id)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Invoice Amount *</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <DollarSign size={16} style={{ position: 'absolute', left: '1rem', color: 'var(--text-muted)' }} />
                    <input
                      type="number"
                      className="form-input"
                      style={{ paddingLeft: '2.25rem' }}
                      placeholder="e.g. 5000"
                      required
                      value={invoiceForm.amount}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Payment Status</label>
                  <select
                    className="form-select"
                    value={invoiceForm.status}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, status: e.target.value as Invoice['status'] })}
                  >
                    <option value="unpaid">Unpaid</option>
                    <option value="partial">Partial</option>
                    <option value="paid">Paid (Cleared)</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsInvoiceModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Generate Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE EXPENSE MODAL */}
      {isExpenseModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem' }}>Record Agency Cost</h3>
              <button className="btn btn-ghost" onClick={() => setIsExpenseModalOpen(false)} style={{ padding: '0.25rem' }}>✕</button>
            </div>

            <form onSubmit={handleCreateExpense}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                {error && (
                  <div style={modalErrorBanner}>
                    <span>{error}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Expense Category *</label>
                  <select
                    className="form-select"
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value as Expense['category'] })}
                  >
                    <option value="salary">Salaries</option>
                    <option value="ads">Marketing Ads</option>
                    <option value="tools">Software & Tooling</option>
                    <option value="freelancer">Freelancer Payout</option>
                    <option value="other">Other Operational Costs</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Amount (USD) *</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <DollarSign size={16} style={{ position: 'absolute', left: '1rem', color: 'var(--text-muted)' }} />
                    <input
                      type="number"
                      className="form-input"
                      style={{ paddingLeft: '2.25rem' }}
                      placeholder="e.g. 1500"
                      required
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Link Project (Optional)</label>
                  <select
                    className="form-select"
                    value={expenseForm.project_id}
                    onChange={(e) => setExpenseForm({ ...expenseForm, project_id: e.target.value })}
                  >
                    <option value="">-- No linked project (General overhead) --</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div style={formRowGrid}>
                  <div className="form-group">
                    <label className="form-label">Description Note</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Figma Monthly invoice"
                      value={expenseForm.description}
                      onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={expenseForm.date}
                      onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsExpenseModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Recording...' : 'Record Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// --- FINANCE PAGE STYLES ---
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

const ledgerGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '1.5rem',
};

const ledgerHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0 1.25rem 0.85rem 1.25rem',
  borderBottom: '1px solid var(--border-color)',
};

const ledgerAddBtnStyle: React.CSSProperties = {
  padding: '0.3rem 0.6rem',
  fontSize: '0.75rem',
  display: 'flex',
  gap: '0.25rem',
};

const invStatusBadgeStyle = (status: string): React.CSSProperties => {
  let color = '#fbbf24';
  let bg = 'rgba(245, 158, 11, 0.1)';
  if (status === 'paid') {
    color = '#34d399';
    bg = 'rgba(16, 185, 129, 0.1)';
  } else if (status === 'unpaid') {
    color = '#f87171';
    bg = 'rgba(239, 68, 68, 0.1)';
  }
  return {
    fontSize: '0.65rem',
    fontWeight: 700,
    background: bg,
    color,
    padding: '0.15rem 0.4rem',
    borderRadius: '4px',
    textTransform: 'uppercase',
  };
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
