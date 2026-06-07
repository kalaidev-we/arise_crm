

// Database client interface switcher (Supabase <-> Local Mock)
import { createClient } from '@supabase/supabase-js';
import { 
  MockDatabase, User, Lead, Deal, Client, Project, Milestone, Task, Invoice, Expense, Department, Company, hashPassword 
} from './mockDb';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export const isMock = !supabaseUrl || !supabaseAnonKey;

if (isMock) {
  console.log('%c[CRM] Running in local MOCK database mode.', 'color: #3b82f6; font-weight: bold;');
  MockDatabase.init();
} else {
  console.log('%c[CRM] Connected to Supabase backend.', 'color: #10b981; font-weight: bold;');
}

export const supabase = !isMock 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

// Simulated loading delay helper
const delay = (ms = 400) => new Promise(res => setTimeout(res, ms));

export const db = {
  auth: {
    async getCurrentUser(): Promise<User | null> {
      await delay(100);
      if (isMock) {
        return MockDatabase.getCurrentUser();
      }
      
      const { data: { user } } = await supabase!.auth.getUser();
      if (!user) return null;

      const { data } = await supabase!
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      return data || null;
    },

    async login(email: string, password: string): Promise<User> {
      await delay(500);
      if (isMock) {
        // Fetch users using the raw SEED list since RLS getStored might strip password
        const dbUsers = JSON.parse(localStorage.getItem('crm_users') || '[]');
        const matched = dbUsers.find((u: any) => u.email.toLowerCase() === email.toLowerCase() && u.password === hashPassword(password));
        if (!matched) throw new Error('Invalid email or password');
        MockDatabase.setCurrentUser(matched);
        return matched;
      }

      // Real Supabase Auth login
      const { data: authData, error: authError } = await supabase!.auth.signInWithPassword({
        email,
        password
      });
      if (authError) throw authError;

      const { data: profile, error: profileError } = await supabase!
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();
      
      if (profileError) throw profileError;
      return profile;
    },

    async logout(): Promise<void> {
      await delay(200);
      if (isMock) {
        MockDatabase.setCurrentUser(null);
        return;
      }
      await supabase!.auth.signOut();
    },

    async updatePassword(password: string): Promise<void> {
      await delay(300);
      if (isMock) {
        const currentUser = MockDatabase.getCurrentUser();
        if (!currentUser) throw new Error('Not authenticated');
        MockDatabase.updateUser(currentUser.id, { password });
        return;
      }
      
      const { error } = await supabase!.auth.updateUser({ password });
      if (error) throw error;
    }
  },

  users: {
    async list(): Promise<User[]> {
      await delay(300);
      if (isMock) return MockDatabase.getUsers();

      // Real Supabase: query the dynamic view "profiles" (which masks passwords on database side)
      const { data, error } = await supabase!.from('profiles').select('*');
      if (error) throw error;
      return data || [];
    },

    async create(user: Omit<User, 'id' | 'created_at'>): Promise<User> {
      await delay(400);
      if (isMock) return MockDatabase.insertUser(user);

      // Real Supabase Auth: Admins create users.
      // Note: For real Supabase, admins usually call an edge function or auth.signUp().
      // Here we write directly to public.users (which matches Auth user id).
      const { data, error } = await supabase!
        .from('users')
        .insert([user])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },

    async update(id: string, updates: Partial<User>): Promise<User> {
      await delay(300);
      if (isMock) return MockDatabase.updateUser(id, updates);

      const { data, error } = await supabase!
        .from('users')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },

    async delete(id: string): Promise<void> {
      await delay(200);
      if (isMock) {
        MockDatabase.deleteUser(id);
        return;
      }
      const { error } = await supabase!.from('users').delete().eq('id', id);
      if (error) throw error;
    }
  },

  leads: {
    async list(): Promise<Lead[]> {
      await delay(300);
      if (isMock) return MockDatabase.getLeads();

      const { data, error } = await supabase!.from('leads').select('*');
      if (error) throw error;
      return data || [];
    },

    async create(lead: Omit<Lead, 'id' | 'company_id' | 'created_at' | 'owner_id'>): Promise<Lead> {
      await delay(300);
      if (isMock) return MockDatabase.insertLead(lead);

      const { data, error } = await supabase!
        .from('leads')
        .insert([lead])
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async update(id: string, updates: Partial<Lead>): Promise<Lead> {
      await delay(200);
      if (isMock) return MockDatabase.updateLead(id, updates);

      const { data, error } = await supabase!
        .from('leads')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async delete(id: string): Promise<void> {
      await delay(200);
      if (isMock) {
        MockDatabase.deleteLead(id);
        return;
      }
      const { error } = await supabase!.from('leads').delete().eq('id', id);
      if (error) throw error;
    }
  },

  deals: {
    async list(): Promise<Deal[]> {
      await delay(300);
      if (isMock) return MockDatabase.getDeals();

      const { data, error } = await supabase!.from('deals').select('*');
      if (error) throw error;
      return data || [];
    },

    async create(deal: Omit<Deal, 'id' | 'company_id' | 'created_at'>): Promise<Deal> {
      await delay(300);
      if (isMock) return MockDatabase.insertDeal(deal);

      const { data, error } = await supabase!
        .from('deals')
        .insert([deal])
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async update(id: string, updates: Partial<Deal>): Promise<Deal> {
      await delay(300);
      if (isMock) return MockDatabase.updateDeal(id, updates);

      const { data, error } = await supabase!
        .from('deals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async delete(id: string): Promise<void> {
      await delay(200);
      if (isMock) {
        MockDatabase.deleteDeal(id);
        return;
      }
      const { error } = await supabase!.from('deals').delete().eq('id', id);
      if (error) throw error;
    }
  },

  clients: {
    async list(): Promise<Client[]> {
      await delay(300);
      if (isMock) return MockDatabase.getClients();

      const { data, error } = await supabase!.from('clients').select('*');
      if (error) throw error;
      return data || [];
    }
  },

  projects: {
    async list(): Promise<Project[]> {
      await delay(300);
      if (isMock) return MockDatabase.getProjects();

      const { data, error } = await supabase!.from('projects').select('*');
      if (error) throw error;
      return data || [];
    },

    async create(project: Omit<Project, 'id' | 'company_id' | 'progress' | 'created_at'>): Promise<Project> {
      await delay(350);
      if (isMock) return MockDatabase.insertProject(project);

      const { data, error } = await supabase!
        .from('projects')
        .insert([project])
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async delete(id: string): Promise<void> {
      await delay(250);
      if (isMock) {
        MockDatabase.deleteProject(id);
        return;
      }
      const { error } = await supabase!.from('projects').delete().eq('id', id);
      if (error) throw error;
    },

    async approve(id: string, managerId: string): Promise<Project> {
      await delay(300);
      if (isMock) return MockDatabase.approveProject(id, managerId);

      const { data, error } = await supabase!
        .from('projects')
        .update({ status: 'active', manager_id: managerId })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  },

  milestones: {
    async list(projectId?: string): Promise<Milestone[]> {
      await delay(200);
      if (isMock) return MockDatabase.getMilestones(projectId);

      let query = supabase!.from('milestones').select('*').order('sort_order', { ascending: true });
      if (projectId) {
        query = query.eq('project_id', projectId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    async create(milestone: Omit<Milestone, 'id' | 'company_id' | 'created_at'>): Promise<Milestone> {
      await delay(200);
      if (isMock) return MockDatabase.insertMilestone(milestone);

      const { data, error } = await supabase!
        .from('milestones')
        .insert([milestone])
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  },

  tasks: {
    async list(projectId?: string): Promise<Task[]> {
      await delay(300);
      if (isMock) return MockDatabase.getTasks(projectId);

      let query = supabase!.from('tasks').select('*');
      if (projectId) {
        // Fetch tasks for the project by checking sub-milestones
        const { data: milestones } = await supabase!
          .from('milestones')
          .select('id')
          .eq('project_id', projectId);
        
        const milestoneIds = (milestones || []).map(m => m.id);
        query = query.in('milestone_id', milestoneIds);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    async create(task: Omit<Task, 'id' | 'company_id' | 'created_by' | 'created_at' | 'completed_by' | 'completed_at'>): Promise<Task> {
      await delay(300);
      if (isMock) return MockDatabase.insertTask(task);

      const { data, error } = await supabase!
        .from('tasks')
        .insert([task])
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async update(id: string, updates: Partial<Task>): Promise<Task> {
      await delay(250);
      if (isMock) return MockDatabase.updateTask(id, updates);

      const { data, error } = await supabase!
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async delete(id: string): Promise<void> {
      await delay(200);
      if (isMock) {
        MockDatabase.deleteTask(id);
        return;
      }

      const { error } = await supabase!
        .from('tasks')
        .delete()
        .eq('id', id);
      if (error) throw error;
    }
  },

  invoices: {
    async list(): Promise<Invoice[]> {
      await delay(300);
      if (isMock) return MockDatabase.getInvoices();

      const { data, error } = await supabase!.from('invoices').select('*');
      if (error) throw error;
      return data || [];
    },

    async create(invoice: Omit<Invoice, 'id' | 'company_id' | 'created_at'>): Promise<Invoice> {
      await delay(300);
      if (isMock) return MockDatabase.insertInvoice(invoice);

      const { data, error } = await supabase!
        .from('invoices')
        .insert([invoice])
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async delete(id: string): Promise<void> {
      await delay(200);
      if (isMock) {
        MockDatabase.deleteInvoice(id);
        return;
      }
      const { error } = await supabase!.from('invoices').delete().eq('id', id);
      if (error) throw error;
    }
  },

  expenses: {
    async list(): Promise<Expense[]> {
      await delay(300);
      if (isMock) return MockDatabase.getExpenses();

      const { data, error } = await supabase!.from('expenses').select('*');
      if (error) throw error;
      return data || [];
    },

    async create(expense: Omit<Expense, 'id' | 'company_id' | 'created_at'>): Promise<Expense> {
      await delay(300);
      if (isMock) return MockDatabase.insertExpense(expense);

      const { data, error } = await supabase!
        .from('expenses')
        .insert([expense])
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async delete(id: string): Promise<void> {
      await delay(200);
      if (isMock) {
        MockDatabase.deleteExpense(id);
        return;
      }
      const { error } = await supabase!.from('expenses').delete().eq('id', id);
      if (error) throw error;
    }
  },

  superadmin: {
    async getCompanies(): Promise<Company[]> {
      await delay(300);
      if (isMock) return MockDatabase.superadminGetCompanies();
      const { data, error } = await supabase!.from('companies').select('*');
      if (error) throw error;
      return data || [];
    },

    async createCompany(name: string): Promise<Company> {
      await delay(300);
      if (isMock) return MockDatabase.superadminCreateCompany(name);
      const { data, error } = await supabase!
        .from('companies')
        .insert([{ name }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async deleteCompany(id: string): Promise<void> {
      await delay(300);
      if (isMock) {
        MockDatabase.superadminDeleteCompany(id);
        return;
      }
      const { error } = await supabase!.from('companies').delete().eq('id', id);
      if (error) throw error;
    },

    async getTenantAdmins(): Promise<User[]> {
      await delay(300);
      if (isMock) return MockDatabase.superadminGetTenantAdmins();
      const { data, error } = await supabase!
        .from('users')
        .select('*')
        .eq('role', 'admin');
      if (error) throw error;
      return data || [];
    },

    async createTenantAdmin(companyId: string, name: string, email: string, pass: string): Promise<User> {
      await delay(350);
      if (isMock) return MockDatabase.superadminCreateTenantAdmin(companyId, name, email, pass);
      const { data, error } = await supabase!
        .from('users')
        .insert([{ company_id: companyId, name, email, role: 'admin' }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async deleteTenantAdmin(id: string): Promise<void> {
      await delay(250);
      if (isMock) {
        MockDatabase.superadminDeleteTenantAdmin(id);
        return;
      }
      const { error } = await supabase!.from('users').delete().eq('id', id);
      if (error) throw error;
    },

    async updateTenantAdminPassword(id: string, pass: string): Promise<void> {
      await delay(250);
      if (isMock) {
        MockDatabase.superadminUpdateTenantAdminPassword(id, pass);
        return;
      }
      const { error } = await supabase!
        .from('users')
        .update({ password: hashPassword(pass) })
        .eq('id', id);
      if (error) throw error;
    }
  },

  departments: {
    async list(): Promise<Department[]> {
      await delay(100);
      if (isMock) return MockDatabase.getDepartments();

      const { data, error } = await supabase!.from('departments').select('*');
      if (error) throw error;
      return data || [];
    }
  }
};
