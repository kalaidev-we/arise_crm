export function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return 'sha256_' + Math.abs(hash).toString(16);
}

export interface Company {
  id: string;
  name: string;
  created_at: string;
}

export interface Department {
  id: string;
  company_id: string;
  name: string;
  created_at: string;
}

export interface User {
  id: string;
  company_id: string;
  department_id: string | null;
  manager_id?: string | null; // Added field to map staff to manager
  name: string;
  email: string;
  password?: string;
  role: 'superadmin' | 'admin' | 'manager' | 'staff';
  is_default_password?: boolean;
  created_at: string;
}

export interface Lead {
  id: string;
  company_id: string;
  owner_id: string;
  name: string;
  phone: string;
  email: string;
  title: string;
  status: 'new' | 'contacted' | 'qualified' | 'lost';
  created_at: string;
}

export interface Deal {
  id: string;
  company_id: string;
  lead_id: string;
  value: number;
  stage: 'prospect' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
  status: 'active' | 'won' | 'lost';
  created_at: string;
}

export interface Client {
  id: string;
  company_id: string;
  deal_id: string | null;
  name: string;
  contact_info: {
    email: string;
    phone: string;
  };
  created_at: string;
}

export interface Project {
  id: string;
  company_id: string;
  client_id: string;
  name: string;
  status: string;
  manager_id: string | null;
  progress: number; // calculated automatically
  created_at: string;
}

export interface Milestone {
  id: string;
  company_id: string;
  project_id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface Task {
  id: string;
  company_id: string;
  milestone_id: string;
  title: string;
  description: string;
  assigned_to: string | null;
  created_by: string;
  status: 'todo' | 'in-progress' | 'done';
  due_date: string;
  completed_by: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  company_id: string;
  project_id: string;
  client_id: string;
  amount: number;
  status: 'paid' | 'unpaid' | 'partial';
  created_at: string;
}

export interface Expense {
  id: string;
  company_id: string;
  project_id: string | null;
  category: 'salary' | 'ads' | 'tools' | 'freelancer' | 'other';
  amount: number;
  description: string;
  date: string;
  created_at: string;
}

const STORAGE_KEYS = {
  COMPANIES: 'crm_companies',
  DEPARTMENTS: 'crm_departments',
  USERS: 'crm_users',
  LEADS: 'crm_leads',
  DEALS: 'crm_deals',
  CLIENTS: 'crm_clients',
  PROJECTS: 'crm_projects',
  MILESTONES: 'crm_milestones',
  TASKS: 'crm_tasks',
  INVOICES: 'crm_invoices',
  EXPENSES: 'crm_expenses',
  CURRENT_USER: 'crm_current_user',
};

// Initial Seed Data (Matches 04_seed.sql)
const SEED_DATA = {
  companies: [
    { id: '00000000-0000-0000-0000-000000000000', name: 'CRM System Admin', created_at: new Date().toISOString() }
  ],
  departments: [],
  users: [
    { id: '00000000-0000-0000-0000-000000000000', company_id: '00000000-0000-0000-0000-000000000000', department_id: null, name: 'Master Admin', email: 'master@crm.com', password: 'masterpass', role: 'superadmin', created_at: new Date().toISOString() }
  ],
  leads: [],
  deals: [],
  clients: [],
  projects: [],
  milestones: [],
  tasks: [],
  invoices: [],
  expenses: []
};

// Database Initialization Helper
const getStored = <T>(key: string, defaultValue: T): T => {
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(defaultValue));
    return defaultValue;
  }
  return JSON.parse(data);
};

const setStored = <T>(key: string, value: T): void => {
  localStorage.setItem(key, JSON.stringify(value));
};

export class MockDatabase {
  static init() {
    // If local storage has the old seed data, clean it up automatically
    const companies = localStorage.getItem(STORAGE_KEYS.COMPANIES);
    if (companies && companies.includes('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1')) {
      Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
    }

    getStored(STORAGE_KEYS.COMPANIES, SEED_DATA.companies);
    getStored(STORAGE_KEYS.DEPARTMENTS, SEED_DATA.departments);
    
    // Seed and/or migrate users to hashed passwords
    const existingUsers = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!existingUsers) {
      const seededUsers = SEED_DATA.users.map(u => ({
        ...u,
        password: hashPassword(u.password),
        is_default_password: true
      }));
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(seededUsers));
    } else {
      const users = JSON.parse(existingUsers) as User[];
      let updated = false;
      const migratedUsers = users.map(u => {
        let changed = false;
        let newU = { ...u };
        if (u.password && !u.password.startsWith('sha256_')) {
          newU.password = hashPassword(u.password);
          changed = true;
        }
        if (newU.is_default_password === undefined) {
          const seedUser = SEED_DATA.users.find(su => su.id === u.id);
          if (seedUser) {
            newU.is_default_password = (u.password === hashPassword(seedUser.password));
          } else {
            newU.is_default_password = true;
          }
          changed = true;
        }
        if (changed) {
          updated = true;
        }
        return newU;
      });
      if (updated) {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(migratedUsers));
      }
    }
    getStored(STORAGE_KEYS.LEADS, SEED_DATA.leads);
    getStored(STORAGE_KEYS.DEALS, SEED_DATA.deals);
    getStored(STORAGE_KEYS.CLIENTS, SEED_DATA.clients);
    getStored(STORAGE_KEYS.PROJECTS, SEED_DATA.projects);
    getStored(STORAGE_KEYS.MILESTONES, SEED_DATA.milestones);
    getStored(STORAGE_KEYS.TASKS, SEED_DATA.tasks);
    getStored(STORAGE_KEYS.INVOICES, SEED_DATA.invoices);
    getStored(STORAGE_KEYS.EXPENSES, SEED_DATA.expenses);

    // Retroactive deal creation for existing qualified leads
    const leads = getStored<Lead[]>(STORAGE_KEYS.LEADS, []);
    const deals = getStored<Deal[]>(STORAGE_KEYS.DEALS, []);
    let dealsUpdated = false;
    leads.forEach(l => {
      if (l.status === 'qualified') {
        const hasDeal = deals.some(d => d.lead_id === l.id);
        if (!hasDeal) {
          deals.push({
            id: crypto.randomUUID(),
            company_id: l.company_id,
            lead_id: l.id,
            value: 0,
            stage: 'prospect',
            status: 'active',
            created_at: new Date().toISOString()
          });
          dealsUpdated = true;
        }
      }
    });
    if (dealsUpdated) {
      setStored(STORAGE_KEYS.DEALS, deals);
    }
  }

  // Auth Helpers
  static getCurrentUser(): User | null {
    const user = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return user ? JSON.parse(user) : null;
  }

  static setCurrentUser(user: User | null): void {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  }

  // RLS Checks helper
  private static getMyCompanyId(): string {
    const user = this.getCurrentUser();
    if (!user) throw new Error('Unauthenticated');
    return user.company_id;
  }

  private static getMyRole(): string {
    const user = this.getCurrentUser();
    if (!user) throw new Error('Unauthenticated');
    return user.role;
  }

  private static getMyUserId(): string {
    const user = this.getCurrentUser();
    if (!user) throw new Error('Unauthenticated');
    return user.id;
  }

  // --- CRUD METHODS WITH RLS ---

  // 1. Users CRUD
  static getUsers(): User[] {
    const myCompanyId = this.getMyCompanyId();
    const users = getStored<User[]>(STORAGE_KEYS.USERS, []);

    // Filter by company_id (Tenant Isolation)
    const companyUsers = users.filter(u => u.company_id === myCompanyId);

    // Apply password visibility rules:
    // Mask all passwords in directory lists to remove password visibility
    return companyUsers.map(u => {
      const { password, ...rest } = u;
      return { ...rest, password: '********' } as User;
    });
  }

  static insertUser(newUser: Omit<User, 'id' | 'created_at'>): User {
    const myCompanyId = this.getMyCompanyId();
    const myRole = this.getMyRole();
    if (myRole !== 'admin') throw new Error('Unauthorized: Only Admin can add users');

    const users = getStored<User[]>(STORAGE_KEYS.USERS, []);
    const created: User = {
      ...newUser,
      id: crypto.randomUUID(),
      company_id: myCompanyId, // Enforce tenant placement
      password: newUser.password ? hashPassword(newUser.password) : '',
      is_default_password: true,
      created_at: new Date().toISOString()
    };

    users.push(created);
    setStored(STORAGE_KEYS.USERS, users);
    return created;
  }

  static updateUser(userId: string, updates: Partial<User>): User {
    const myCompanyId = this.getMyCompanyId();
    const myRole = this.getMyRole();
    const myUserId = this.getMyUserId();

    if (myRole !== 'admin' && myUserId !== userId) {
      throw new Error('Unauthorized: You can only edit your own user profile');
    }

    const users = getStored<User[]>(STORAGE_KEYS.USERS, []);
    const index = users.findIndex(u => u.id === userId && u.company_id === myCompanyId);
    if (index === -1) throw new Error('User not found');

    // Prevent non-admin from changing roles or companies
    const safeUpdates = { ...updates };
    if (safeUpdates.password) {
      safeUpdates.password = hashPassword(safeUpdates.password);
      // If updating own profile, mark password as non-default (customized).
      // If updated by admin (another user), mark as default temp password.
      safeUpdates.is_default_password = (myUserId !== userId);
    }
    if (myRole !== 'admin') {
      delete safeUpdates.role;
      delete safeUpdates.company_id;
      delete safeUpdates.department_id;
    }

    const updatedUser = {
      ...users[index],
      ...safeUpdates,
    };

    users[index] = updatedUser;
    setStored(STORAGE_KEYS.USERS, users);

    // If current user updated their own profile, sync the active session
    if (myUserId === userId) {
      this.setCurrentUser(updatedUser);
    }

    return updatedUser;
  }

  static deleteUser(userId: string): void {
    const myCompanyId = this.getMyCompanyId();
    const myRole = this.getMyRole();
    const myUserId = this.getMyUserId();
    if (myRole !== 'admin') {
      throw new Error('Unauthorized: Only Admins can delete users');
    }
    if (myUserId === userId) {
      throw new Error('Unauthorized: You cannot delete your own account');
    }

    const users = getStored<User[]>(STORAGE_KEYS.USERS, []);
    const index = users.findIndex(u => u.id === userId && u.company_id === myCompanyId);
    if (index === -1) throw new Error('User not found');

    const filtered = users.filter(u => u.id !== userId || u.company_id !== myCompanyId);
    setStored(STORAGE_KEYS.USERS, filtered);
  }

  // 2. Leads CRUD
  static getLeads(): Lead[] {
    const myCompanyId = this.getMyCompanyId();
    const myRole = this.getMyRole();
    const myUserId = this.getMyUserId();
    const leads = getStored<Lead[]>(STORAGE_KEYS.LEADS, []);

    const companyLeads = leads.filter(l => l.company_id === myCompanyId);

    if (myRole === 'admin') {
      return companyLeads;
    }

    if (myRole === 'manager') {
      const users = getStored<User[]>(STORAGE_KEYS.USERS, []);
      const managedUserIds = users.filter(u => u.manager_id === myUserId).map(u => u.id);
      return companyLeads.filter(l => l.owner_id === myUserId || managedUserIds.includes(l.owner_id));
    }

    // Staff role
    return companyLeads.filter(l => l.owner_id === myUserId);
  }

  static insertLead(lead: Omit<Lead, 'id' | 'company_id' | 'created_at' | 'owner_id'>): Lead {
    const myCompanyId = this.getMyCompanyId();
    const myUserId = this.getMyUserId();
    const leads = getStored<Lead[]>(STORAGE_KEYS.LEADS, []);

    const created: Lead = {
      ...lead,
      id: crypto.randomUUID(),
      company_id: myCompanyId,
      owner_id: myUserId, // Auto assigned to creator
      created_at: new Date().toISOString(),
    };

    leads.push(created);
    setStored(STORAGE_KEYS.LEADS, leads);

    if (created.status === 'qualified') {
      this.triggerLeadQualified(created);
    }

    return created;
  }

  static updateLead(leadId: string, updates: Partial<Lead>): Lead {
    const myCompanyId = this.getMyCompanyId();
    const myRole = this.getMyRole();
    const myUserId = this.getMyUserId();
    const leads = getStored<Lead[]>(STORAGE_KEYS.LEADS, []);

    const index = leads.findIndex(l => l.id === leadId && l.company_id === myCompanyId);
    if (index === -1) throw new Error('Lead not found');

    const lead = leads[index];
    if (myRole !== 'admin' && myRole !== 'manager' && lead.owner_id !== myUserId) {
      throw new Error('Unauthorized to edit this lead');
    }

    const updated = { ...lead, ...updates };
    leads[index] = updated;
    setStored(STORAGE_KEYS.LEADS, leads);

    if (updated.status === 'qualified' && lead.status !== 'qualified') {
      this.triggerLeadQualified(updated);
    }

    return updated;
  }

  static deleteLead(leadId: string): void {
    const myCompanyId = this.getMyCompanyId();
    const myRole = this.getMyRole();
    if (myRole !== 'admin') {
      throw new Error('Unauthorized: Only Admins can delete leads');
    }

    const leads = getStored<Lead[]>(STORAGE_KEYS.LEADS, []);
    const index = leads.findIndex(l => l.id === leadId && l.company_id === myCompanyId);
    if (index === -1) throw new Error('Lead not found');

    const filtered = leads.filter(l => l.id !== leadId || l.company_id !== myCompanyId);
    setStored(STORAGE_KEYS.LEADS, filtered);

    // Cascade delete associated deals
    const deals = getStored<Deal[]>(STORAGE_KEYS.DEALS, []);
    const remainingDeals = deals.filter(d => d.lead_id !== leadId || d.company_id !== myCompanyId);
    setStored(STORAGE_KEYS.DEALS, remainingDeals);
  }

  // 3. Deals CRUD
  static getDeals(): Deal[] {
    const myCompanyId = this.getMyCompanyId();
    const deals = getStored<Deal[]>(STORAGE_KEYS.DEALS, []);
    const visibleLeads = this.getLeads();
    const visibleLeadIds = visibleLeads.map(l => l.id);
    return deals.filter(d => d.company_id === myCompanyId && visibleLeadIds.includes(d.lead_id));
  }

  static insertDeal(deal: Omit<Deal, 'id' | 'company_id' | 'created_at'>): Deal {
    const myCompanyId = this.getMyCompanyId();
    const deals = getStored<Deal[]>(STORAGE_KEYS.DEALS, []);

    const created: Deal = {
      ...deal,
      id: crypto.randomUUID(),
      company_id: myCompanyId,
      created_at: new Date().toISOString(),
    };

    deals.push(created);
    setStored(STORAGE_KEYS.DEALS, deals);
    return created;
  }

  static updateDeal(dealId: string, updates: Partial<Deal>): Deal {
    const myCompanyId = this.getMyCompanyId();
    const deals = getStored<Deal[]>(STORAGE_KEYS.DEALS, []);

    const index = deals.findIndex(d => d.id === dealId && d.company_id === myCompanyId);
    if (index === -1) throw new Error('Deal not found');

    const oldDeal = deals[index];
    const updated = { ...oldDeal, ...updates };
    deals[index] = updated;
    setStored(STORAGE_KEYS.DEALS, deals);

    // TRIGGER EMULATION: Deal WON trigger
    if (updated.stage === 'won') {
      this.triggerDealWon(updated);
    }

    return updated;
  }

  static deleteDeal(dealId: string): void {
    const myCompanyId = this.getMyCompanyId();
    const myRole = this.getMyRole();
    if (myRole !== 'admin') {
      throw new Error('Unauthorized: Only Admins can delete deals');
    }

    const deals = getStored<Deal[]>(STORAGE_KEYS.DEALS, []);
    const index = deals.findIndex(d => d.id === dealId && d.company_id === myCompanyId);
    if (index === -1) throw new Error('Deal not found');

    const filtered = deals.filter(d => d.id !== dealId || d.company_id !== myCompanyId);
    setStored(STORAGE_KEYS.DEALS, filtered);
  }

  private static triggerLeadQualified(lead: Lead): void {
    const deals = getStored<Deal[]>(STORAGE_KEYS.DEALS, []);
    const hasDeal = deals.some(d => d.lead_id === lead.id);
    if (!hasDeal) {
      deals.push({
        id: crypto.randomUUID(),
        company_id: lead.company_id,
        lead_id: lead.id,
        value: 0,
        stage: 'prospect',
        status: 'active',
        created_at: new Date().toISOString()
      });
      setStored(STORAGE_KEYS.DEALS, deals);
    }
  }

  private static triggerDealWon(deal: Deal): void {
    const myCompanyId = this.getMyCompanyId();
    
    // Find linked lead details
    const leads = getStored<Lead[]>(STORAGE_KEYS.LEADS, []);
    const lead = leads.find(l => l.id === deal.lead_id);
    const leadName = lead ? lead.name : 'Client from Deal';
    const leadEmail = lead ? lead.email : '';
    const leadPhone = lead ? lead.phone : '';

    // 1. Create client
    const clients = getStored<Client[]>(STORAGE_KEYS.CLIENTS, []);
    let client = clients.find(c => c.deal_id === deal.id);
    if (!client) {
      client = {
        id: crypto.randomUUID(),
        company_id: myCompanyId,
        deal_id: deal.id,
        name: leadName,
        contact_info: { email: leadEmail, phone: leadPhone },
        created_at: new Date().toISOString(),
      };
      clients.push(client);
      setStored(STORAGE_KEYS.CLIENTS, clients);
    }

    // 2. Create project
    const projects = getStored<Project[]>(STORAGE_KEYS.PROJECTS, []);
    let project = projects.find(p => p.client_id === client!.id);
    if (!project) {
      project = {
        id: crypto.randomUUID(),
        company_id: myCompanyId,
        client_id: client.id,
        name: `Project for ${leadName}`,
        status: 'pending_approval',
        manager_id: null,
        progress: 0.00,
        created_at: new Date().toISOString(),
      };
      projects.push(project);
      setStored(STORAGE_KEYS.PROJECTS, projects);

      // 3. Create milestones
      const milestones = getStored<Milestone[]>(STORAGE_KEYS.MILESTONES, []);
      const defaultMilestones = ['Phase 1: Planning', 'Phase 2: Design', 'Phase 3: Development', 'Phase 4: Delivery'];
      defaultMilestones.forEach((name, i) => {
        milestones.push({
          id: crypto.randomUUID(),
          company_id: myCompanyId,
          project_id: project!.id,
          name,
          sort_order: i + 1,
          created_at: new Date().toISOString(),
        });
      });
      setStored(STORAGE_KEYS.MILESTONES, milestones);
    }
  }

  // 4. Clients CRUD
  static getClients(): Client[] {
    const myCompanyId = this.getMyCompanyId();
    const clients = getStored<Client[]>(STORAGE_KEYS.CLIENTS, []);
    return clients.filter(c => c.company_id === myCompanyId);
  }

  static getProjects(): Project[] {
    const myCompanyId = this.getMyCompanyId();
    const myRole = this.getMyRole();
    const myUserId = this.getMyUserId();
    const projects = getStored<Project[]>(STORAGE_KEYS.PROJECTS, []);

    const companyProjects = projects.filter(p => p.company_id === myCompanyId);

    if (myRole === 'admin') {
      return companyProjects;
    }

    if (myRole === 'manager') {
      return companyProjects.filter(p => p.manager_id === myUserId && p.status !== 'pending_approval');
    }

    // Staff role
    const tasks = getStored<Task[]>(STORAGE_KEYS.TASKS, []);
    const myTasks = tasks.filter(t => t.company_id === myCompanyId && (t.assigned_to === myUserId || t.created_by === myUserId));
    const milestones = getStored<Milestone[]>(STORAGE_KEYS.MILESTONES, []);
    const myProjectIds = myTasks.map(t => {
      const m = milestones.find(m => m.id === t.milestone_id);
      return m ? m.project_id : null;
    }).filter(Boolean) as string[];

    return companyProjects.filter(p => p.status !== 'pending_approval' && myProjectIds.includes(p.id));
  }

  static insertProject(project: Omit<Project, 'id' | 'company_id' | 'progress' | 'created_at'>): Project {
    const myCompanyId = this.getMyCompanyId();
    const projects = getStored<Project[]>(STORAGE_KEYS.PROJECTS, []);

    const created: Project = {
      ...project,
      id: crypto.randomUUID(),
      company_id: myCompanyId,
      progress: 0.00,
      created_at: new Date().toISOString(),
    };

    projects.push(created);
    setStored(STORAGE_KEYS.PROJECTS, projects);
    return created;
  }

  static approveProject(projectId: string, managerId: string): Project {
    const myRole = this.getMyRole();
    if (myRole !== 'admin') {
      throw new Error('Unauthorized: Only Admins can approve projects');
    }

    const projects = getStored<Project[]>(STORAGE_KEYS.PROJECTS, []);
    const index = projects.findIndex(p => p.id === projectId);
    if (index === -1) throw new Error('Project not found');

    const updated = {
      ...projects[index],
      status: 'active',
      manager_id: managerId,
    };

    projects[index] = updated;
    setStored(STORAGE_KEYS.PROJECTS, projects);
    return updated;
  }

  static deleteProject(projectId: string): void {
    const myCompanyId = this.getMyCompanyId();
    const myRole = this.getMyRole();
    if (myRole !== 'admin') {
      throw new Error('Unauthorized: Only Admins can delete projects');
    }

    const projects = getStored<Project[]>(STORAGE_KEYS.PROJECTS, []);
    const index = projects.findIndex(p => p.id === projectId && p.company_id === myCompanyId);
    if (index === -1) throw new Error('Project not found');

    const filtered = projects.filter(p => p.id !== projectId || p.company_id !== myCompanyId);
    setStored(STORAGE_KEYS.PROJECTS, filtered);

    // Cascade delete milestones and tasks
    const milestones = getStored<Milestone[]>(STORAGE_KEYS.MILESTONES, []);
    const filteredMilestones = milestones.filter(m => m.project_id !== projectId || m.company_id !== myCompanyId);
    setStored(STORAGE_KEYS.MILESTONES, filteredMilestones);

    const mIds = milestones.filter(m => m.project_id === projectId).map(m => m.id);
    const tasks = getStored<Task[]>(STORAGE_KEYS.TASKS, []);
    const filteredTasks = tasks.filter(t => !mIds.includes(t.milestone_id) || t.company_id !== myCompanyId);
    setStored(STORAGE_KEYS.TASKS, filteredTasks);
  }

  // 6. Milestones CRUD
  static getMilestones(projectId?: string): Milestone[] {
    const myCompanyId = this.getMyCompanyId();
    const milestones = getStored<Milestone[]>(STORAGE_KEYS.MILESTONES, []);
    let filtered = milestones.filter(m => m.company_id === myCompanyId);
    if (projectId) {
      filtered = filtered.filter(m => m.project_id === projectId);
    }
    return filtered.sort((a, b) => a.sort_order - b.sort_order);
  }

  static insertMilestone(milestone: Omit<Milestone, 'id' | 'company_id' | 'created_at'>): Milestone {
    const myCompanyId = this.getMyCompanyId();
    const milestones = getStored<Milestone[]>(STORAGE_KEYS.MILESTONES, []);

    const created: Milestone = {
      ...milestone,
      id: crypto.randomUUID(),
      company_id: myCompanyId,
      created_at: new Date().toISOString(),
    };

    milestones.push(created);
    setStored(STORAGE_KEYS.MILESTONES, milestones);
    return created;
  }

  // 7. Tasks CRUD (RLS applies)
  static getTasks(projectId?: string): Task[] {
    const myCompanyId = this.getMyCompanyId();
    const myRole = this.getMyRole();
    const myUserId = this.getMyUserId();

    const tasks = getStored<Task[]>(STORAGE_KEYS.TASKS, []);
    let filtered = tasks.filter(t => t.company_id === myCompanyId);

    // Apply role-based filtering:
    if (myRole === 'manager') {
      const projects = getStored<Project[]>(STORAGE_KEYS.PROJECTS, []);
      const myProjectIds = projects.filter(p => p.manager_id === myUserId).map(p => p.id);
      const milestones = getStored<Milestone[]>(STORAGE_KEYS.MILESTONES, []);
      const myMilestoneIds = milestones.filter(m => myProjectIds.includes(m.project_id)).map(m => m.id);
      filtered = filtered.filter(t => myMilestoneIds.includes(t.milestone_id));
    } else if (myRole === 'staff') {
      const projects = getStored<Project[]>(STORAGE_KEYS.PROJECTS, []);
      const activeProjectIds = projects.filter(p => p.status !== 'pending_approval').map(p => p.id);
      const milestones = getStored<Milestone[]>(STORAGE_KEYS.MILESTONES, []);
      const activeMilestoneIds = milestones.filter(m => activeProjectIds.includes(m.project_id)).map(m => m.id);
      filtered = filtered.filter(t => 
        activeMilestoneIds.includes(t.milestone_id) && 
        (t.assigned_to === myUserId || t.created_by === myUserId)
      );
    }

    if (projectId) {
      const milestones = this.getMilestones(projectId);
      const milestoneIds = milestones.map(m => m.id);
      filtered = filtered.filter(t => milestoneIds.includes(t.milestone_id));
    }

    return filtered;
  }

  static insertTask(task: Omit<Task, 'id' | 'company_id' | 'created_by' | 'created_at' | 'completed_by' | 'completed_at'>): Task {
    const myCompanyId = this.getMyCompanyId();
    const myUserId = this.getMyUserId();
    const myRole = this.getMyRole();

    if (myRole === 'staff') throw new Error('Unauthorized: Staff cannot create tasks');

    if (myRole === 'manager') {
      const milestones = getStored<Milestone[]>(STORAGE_KEYS.MILESTONES, []);
      const milestone = milestones.find(m => m.id === task.milestone_id);
      if (!milestone) throw new Error('Milestone not found');

      const projects = getStored<Project[]>(STORAGE_KEYS.PROJECTS, []);
      const project = projects.find(p => p.id === milestone.project_id);
      if (!project || project.manager_id !== myUserId) {
        throw new Error('Unauthorized: Managers can only create tasks for their assigned projects');
      }
    }

    const tasks = getStored<Task[]>(STORAGE_KEYS.TASKS, []);
    const created: Task = {
      ...task,
      id: crypto.randomUUID(),
      company_id: myCompanyId,
      created_by: myUserId,
      created_at: new Date().toISOString(),
      completed_by: null,
      completed_at: null,
    };

    tasks.push(created);
    setStored(STORAGE_KEYS.TASKS, tasks);

    // TRIGGER: Update progress
    this.recalculateProjectProgress(created.milestone_id);

    return created;
  }

  static updateTask(taskId: string, updates: Partial<Task>): Task {
    const myCompanyId = this.getMyCompanyId();
    const myUserId = this.getMyUserId();
    const myRole = this.getMyRole();
    const tasks = getStored<Task[]>(STORAGE_KEYS.TASKS, []);

    const index = tasks.findIndex(t => t.id === taskId && t.company_id === myCompanyId);
    if (index === -1) throw new Error('Task not found');

    const oldTask = tasks[index];

    // Staff can only update task status of their own assigned tasks
    if (myRole === 'staff') {
      if (oldTask.assigned_to !== myUserId) {
        throw new Error('Unauthorized: Staff can only update their assigned tasks');
      }
      // Staff can only update status
      const safeUpdates: Partial<Task> = { status: updates.status };
      
      if (safeUpdates.status === 'done' && oldTask.status !== 'done') {
        safeUpdates.completed_by = myUserId;
        safeUpdates.completed_at = new Date().toISOString();
      } else if (safeUpdates.status !== 'done' && oldTask.status === 'done') {
        safeUpdates.completed_by = null;
        safeUpdates.completed_at = null;
      }

      const updated = { ...oldTask, ...safeUpdates };
      tasks[index] = updated;
      setStored(STORAGE_KEYS.TASKS, tasks);
      this.recalculateProjectProgress(oldTask.milestone_id);
      return updated;
    }

    // Manager / Admin update
    if (myRole === 'manager') {
      const milestones = getStored<Milestone[]>(STORAGE_KEYS.MILESTONES, []);
      const milestone = milestones.find(m => m.id === oldTask.milestone_id);
      if (!milestone) throw new Error('Milestone not found');

      const projects = getStored<Project[]>(STORAGE_KEYS.PROJECTS, []);
      const project = projects.find(p => p.id === milestone.project_id);
      if (!project || project.manager_id !== myUserId) {
        throw new Error('Unauthorized: Managers can only edit tasks for their assigned projects');
      }
    }

    const finalUpdates = { ...updates };
    if (finalUpdates.status === 'done' && oldTask.status !== 'done') {
      finalUpdates.completed_by = myUserId;
      finalUpdates.completed_at = new Date().toISOString();
    } else if (finalUpdates.status !== 'done' && oldTask.status === 'done') {
      finalUpdates.completed_by = null;
      finalUpdates.completed_at = null;
    }

    const updated = { ...oldTask, ...finalUpdates };
    tasks[index] = updated;
    setStored(STORAGE_KEYS.TASKS, tasks);
    this.recalculateProjectProgress(oldTask.milestone_id);
    return updated;
  }

  static deleteTask(taskId: string): void {
    const myCompanyId = this.getMyCompanyId();
    const myRole = this.getMyRole();
    if (myRole !== 'admin') {
      throw new Error('Unauthorized: Only Admins can delete tasks');
    }

    const tasks = getStored<Task[]>(STORAGE_KEYS.TASKS, []);
    const task = tasks.find(t => t.id === taskId && t.company_id === myCompanyId);
    if (!task) throw new Error('Task not found');

    const filtered = tasks.filter(t => t.id !== taskId || t.company_id !== myCompanyId);
    setStored(STORAGE_KEYS.TASKS, filtered);
    this.recalculateProjectProgress(task.milestone_id);
  }

  private static recalculateProjectProgress(milestoneId: string): void {
    const milestones = getStored<Milestone[]>(STORAGE_KEYS.MILESTONES, []);
    const milestone = milestones.find(m => m.id === milestoneId);
    if (!milestone) return;

    const projectId = milestone.project_id;
    const allMilestones = milestones.filter(m => m.project_id === projectId);
    const mIds = allMilestones.map(m => m.id);

    const tasks = getStored<Task[]>(STORAGE_KEYS.TASKS, []);
    const projectTasks = tasks.filter(t => mIds.includes(t.milestone_id));

    const total = projectTasks.length;
    const completed = projectTasks.filter(t => t.status === 'done').length;

    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    const projects = getStored<Project[]>(STORAGE_KEYS.PROJECTS, []);
    const pIndex = projects.findIndex(p => p.id === projectId);
    if (pIndex !== -1) {
      projects[pIndex].progress = progress;
      setStored(STORAGE_KEYS.PROJECTS, projects);
    }
  }

  // 8. Finance (Invoices & Expenses) - ADMIN ONLY
  static getInvoices(): Invoice[] {
    const myRole = this.getMyRole();
    if (myRole !== 'admin') throw new Error('Unauthorized: Finance is restricted to Admin only');

    const myCompanyId = this.getMyCompanyId();
    const invoices = getStored<Invoice[]>(STORAGE_KEYS.INVOICES, []);
    return invoices.filter(i => i.company_id === myCompanyId);
  }

  static insertInvoice(invoice: Omit<Invoice, 'id' | 'company_id' | 'created_at'>): Invoice {
    const myRole = this.getMyRole();
    if (myRole !== 'admin') throw new Error('Unauthorized: Finance is restricted to Admin only');

    const myCompanyId = this.getMyCompanyId();
    const invoices = getStored<Invoice[]>(STORAGE_KEYS.INVOICES, []);

    const created: Invoice = {
      ...invoice,
      id: crypto.randomUUID(),
      company_id: myCompanyId,
      created_at: new Date().toISOString(),
    };

    invoices.push(created);
    setStored(STORAGE_KEYS.INVOICES, invoices);
    return created;
  }

  static deleteInvoice(invoiceId: string): void {
    const myRole = this.getMyRole();
    if (myRole !== 'admin') throw new Error('Unauthorized: Finance is restricted to Admin only');

    const myCompanyId = this.getMyCompanyId();
    const invoices = getStored<Invoice[]>(STORAGE_KEYS.INVOICES, []);
    const index = invoices.findIndex(i => i.id === invoiceId && i.company_id === myCompanyId);
    if (index === -1) throw new Error('Invoice not found');

    const filtered = invoices.filter(i => i.id !== invoiceId || i.company_id !== myCompanyId);
    setStored(STORAGE_KEYS.INVOICES, filtered);
  }

  static getExpenses(): Expense[] {
    const myRole = this.getMyRole();
    if (myRole !== 'admin') throw new Error('Unauthorized: Finance is restricted to Admin only');

    const myCompanyId = this.getMyCompanyId();
    const expenses = getStored<Expense[]>(STORAGE_KEYS.EXPENSES, []);
    return expenses.filter(e => e.company_id === myCompanyId);
  }

  static insertExpense(expense: Omit<Expense, 'id' | 'company_id' | 'created_at'>): Expense {
    const myRole = this.getMyRole();
    if (myRole !== 'admin') throw new Error('Unauthorized: Finance is restricted to Admin only');

    const myCompanyId = this.getMyCompanyId();
    const expenses = getStored<Expense[]>(STORAGE_KEYS.EXPENSES, []);

    const created: Expense = {
      ...expense,
      id: crypto.randomUUID(),
      company_id: myCompanyId,
      created_at: new Date().toISOString(),
    };

    expenses.push(created);
    setStored(STORAGE_KEYS.EXPENSES, expenses);
    return created;
  }

  static deleteExpense(expenseId: string): void {
    const myRole = this.getMyRole();
    if (myRole !== 'admin') throw new Error('Unauthorized: Finance is restricted to Admin only');

    const myCompanyId = this.getMyCompanyId();
    const expenses = getStored<Expense[]>(STORAGE_KEYS.EXPENSES, []);
    const index = expenses.findIndex(e => e.id === expenseId && e.company_id === myCompanyId);
    if (index === -1) throw new Error('Expense not found');

    const filtered = expenses.filter(e => e.id !== expenseId || e.company_id !== myCompanyId);
    setStored(STORAGE_KEYS.EXPENSES, filtered);
  }

  // 9. Departments list helper
  static getDepartments(): Department[] {
    const myCompanyId = this.getMyCompanyId();
    const depts = getStored<Department[]>(STORAGE_KEYS.DEPARTMENTS, []);
    return depts.filter(d => d.company_id === myCompanyId);
  }

  // 10. Superadmin API methods
  static superadminGetCompanies(): Company[] {
    const myRole = this.getMyRole();
    if (myRole !== 'superadmin') throw new Error('Unauthorized: Restricted to System Master Admin only');
    
    const companies = getStored<Company[]>(STORAGE_KEYS.COMPANIES, []);
    return companies.filter(c => c.id !== '00000000-0000-0000-0000-000000000000');
  }

  static superadminCreateCompany(name: string): Company {
    const myRole = this.getMyRole();
    if (myRole !== 'superadmin') throw new Error('Unauthorized: Restricted to System Master Admin only');

    const companies = getStored<Company[]>(STORAGE_KEYS.COMPANIES, []);
    
    if (companies.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      throw new Error('A tenant with this company name already exists.');
    }

    const created: Company = {
      id: crypto.randomUUID(),
      name,
      created_at: new Date().toISOString()
    };
    companies.push(created);
    setStored(STORAGE_KEYS.COMPANIES, companies);
    return created;
  }

  static superadminDeleteCompany(companyId: string): void {
    const myRole = this.getMyRole();
    if (myRole !== 'superadmin') throw new Error('Unauthorized: Restricted to System Master Admin only');

    const companies = getStored<Company[]>(STORAGE_KEYS.COMPANIES, []);
    const index = companies.findIndex(c => c.id === companyId);
    if (index === -1) throw new Error('Company not found');
    if (companyId === '00000000-0000-0000-0000-000000000000') {
      throw new Error('Cannot delete the CRM System company');
    }

    const filteredCompanies = companies.filter(c => c.id !== companyId);
    setStored(STORAGE_KEYS.COMPANIES, filteredCompanies);

    // Cascade delete associated tenant data
    const users = getStored<User[]>(STORAGE_KEYS.USERS, []);
    setStored(STORAGE_KEYS.USERS, users.filter(u => u.company_id !== companyId));

    const leads = getStored<Lead[]>(STORAGE_KEYS.LEADS, []);
    setStored(STORAGE_KEYS.LEADS, leads.filter(l => l.company_id !== companyId));

    const deals = getStored<Deal[]>(STORAGE_KEYS.DEALS, []);
    setStored(STORAGE_KEYS.DEALS, deals.filter(d => d.company_id !== companyId));

    const clients = getStored<Client[]>(STORAGE_KEYS.CLIENTS, []);
    setStored(STORAGE_KEYS.CLIENTS, clients.filter(c => c.company_id !== companyId));

    const projects = getStored<Project[]>(STORAGE_KEYS.PROJECTS, []);
    setStored(STORAGE_KEYS.PROJECTS, projects.filter(p => p.company_id !== companyId));

    const milestones = getStored<Milestone[]>(STORAGE_KEYS.MILESTONES, []);
    setStored(STORAGE_KEYS.MILESTONES, milestones.filter(m => m.company_id !== companyId));

    const tasks = getStored<Task[]>(STORAGE_KEYS.TASKS, []);
    setStored(STORAGE_KEYS.TASKS, tasks.filter(t => t.company_id !== companyId));

    const invoices = getStored<Invoice[]>(STORAGE_KEYS.INVOICES, []);
    setStored(STORAGE_KEYS.INVOICES, invoices.filter(i => i.company_id !== companyId));

    const expenses = getStored<Expense[]>(STORAGE_KEYS.EXPENSES, []);
    setStored(STORAGE_KEYS.EXPENSES, expenses.filter(e => e.company_id !== companyId));

    const depts = getStored<Department[]>(STORAGE_KEYS.DEPARTMENTS, []);
    setStored(STORAGE_KEYS.DEPARTMENTS, depts.filter(d => d.company_id !== companyId));
  }

  static superadminGetTenantAdmins(): User[] {
    const myRole = this.getMyRole();
    if (myRole !== 'superadmin') throw new Error('Unauthorized: Restricted to System Master Admin only');

    const users = getStored<User[]>(STORAGE_KEYS.USERS, []);
    const adminUsers = users.filter(u => u.role === 'admin' && u.company_id !== '00000000-0000-0000-0000-000000000000');

    return adminUsers.map(u => {
      const { password, ...rest } = u;
      return { ...rest, password: '********' } as User;
    });
  }

  static superadminCreateTenantAdmin(companyId: string, name: string, email: string, pass: string): User {
    const myRole = this.getMyRole();
    if (myRole !== 'superadmin') throw new Error('Unauthorized: Restricted to System Master Admin only');

    const users = getStored<User[]>(STORAGE_KEYS.USERS, []);

    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('A user account with this email address already exists.');
    }

    const created: User = {
      id: crypto.randomUUID(),
      company_id: companyId,
      department_id: null,
      name,
      email,
      password: hashPassword(pass),
      role: 'admin',
      is_default_password: true,
      created_at: new Date().toISOString()
    };

    users.push(created);
    setStored(STORAGE_KEYS.USERS, users);

    const { password, ...rest } = created;
    return { ...rest, password: '********' } as User;
  }

  static superadminDeleteTenantAdmin(userId: string): void {
    const myRole = this.getMyRole();
    if (myRole !== 'superadmin') throw new Error('Unauthorized: Restricted to System Master Admin only');

    const users = getStored<User[]>(STORAGE_KEYS.USERS, []);
    const index = users.findIndex(u => u.id === userId);
    if (index === -1) throw new Error('Admin not found');
    
    const adminUser = users[index];
    if (adminUser.role !== 'admin') {
      throw new Error('Only tenant admin accounts can be deleted via this method');
    }

    const filtered = users.filter(u => u.id !== userId);
    setStored(STORAGE_KEYS.USERS, filtered);
  }

  static superadminUpdateTenantAdminPassword(userId: string, pass: string): void {
    const myRole = this.getMyRole();
    if (myRole !== 'superadmin') throw new Error('Unauthorized: Restricted to System Master Admin only');

    const users = getStored<User[]>(STORAGE_KEYS.USERS, []);
    const index = users.findIndex(u => u.id === userId);
    if (index === -1) throw new Error('Admin not found');

    const adminUser = users[index];
    if (adminUser.role !== 'admin') {
      throw new Error('Only tenant admin passwords can be managed here');
    }

    users[index].password = hashPassword(pass);
    users[index].is_default_password = true;
    setStored(STORAGE_KEYS.USERS, users);
  }
}
