

// Database client interface switcher (Supabase <-> Local Mock)
import { createClient } from '@supabase/supabase-js';
import { 
  MockDatabase, User, Lead, Deal, Client, Project, Milestone, Task, Invoice, Expense, Department, Company, hashPassword, SubscriptionRequest
} from './mockDb';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || 'https://kciodmfxrnixzfdgcewf.supabase.co').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Ucl6IWssV3TeNNZEzZsl2Q_8PjNVFiJ').trim();

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

// Helper for superadmin impersonation scoping
function getScopedQuery(table: string) {
  let query = supabase!.from(table).select('*');
  const impersonatedId = localStorage.getItem('crm_impersonated_company_id');
  if (impersonatedId) {
    query = query.eq('company_id', impersonatedId);
  }
  return query;
}

export const db = {
  companies: {
    async get(id: string): Promise<Company | null> {
      await delay(100);
      if (isMock) {
        const companies = JSON.parse(localStorage.getItem('crm_companies') || '[]');
        const match = companies.find((c: any) => c.id === id);
        return match || null;
      }
      const { data, error } = await supabase!
        .from('companies')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    }
  },

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
      let query = supabase!.from('profiles').select('*');
      const impersonatedId = localStorage.getItem('crm_impersonated_company_id');
      if (impersonatedId) {
        query = query.eq('company_id', impersonatedId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    async create(user: Omit<User, 'id' | 'created_at'>): Promise<User> {
      await delay(400);
      if (isMock) return MockDatabase.insertUser(user);

      // Call the Supabase stored procedure to create both auth and public user
      const { data, error } = await supabase!.rpc('create_tenant_user', {
        p_company_id: user.company_id,
        p_name: user.name,
        p_email: user.email,
        p_password: user.password || '',
        p_role: user.role,
        p_department_id: user.department_id,
        p_manager_id: user.manager_id || null
      });
      
      if (error) throw error;
      return data[0]; // RPC returns array, get first element
    },

    async update(id: string, updates: Partial<User>): Promise<User> {
      await delay(300);
      if (isMock) return MockDatabase.updateUser(id, updates);

      const { password, ...otherUpdates } = updates;

      if (password) {
        // Call the RPC to update password in auth.users
        const { error: pwdError } = await supabase!.rpc('update_user_password', {
          p_user_id: id,
          p_password: password
        });
        if (pwdError) throw pwdError;
      }

      if (Object.keys(otherUpdates).length > 0) {
        const { data, error } = await supabase!
          .from('users')
          .update(otherUpdates)
          .eq('id', id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }

      // If only password was updated, fetch and return the profile
      const { data, error } = await supabase!
        .from('users')
        .select('*')
        .eq('id', id)
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
      const { error } = await supabase!.rpc('delete_tenant_user', {
        p_user_id: id
      });
      if (error) throw error;
    }
  },

  leads: {
    async list(): Promise<Lead[]> {
      await delay(300);
      if (isMock) return MockDatabase.getLeads();

      const { data, error } = await getScopedQuery('leads');
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
    async triggerDealWon(deal: Deal): Promise<void> {
      // 1. Fetch lead details
      const { data: lead, error: leadError } = await supabase!
        .from('leads')
        .select('*')
        .eq('id', deal.lead_id)
        .single();
      
      if (leadError) throw leadError;

      // 2. Check/create client
      const { data: existingClient } = await supabase!
        .from('clients')
        .select('*')
        .eq('deal_id', deal.id)
        .maybeSingle();

      let client = existingClient;
      if (!client) {
        const { data: newClient, error: clientError } = await supabase!
          .from('clients')
          .insert([{
            company_id: deal.company_id,
            deal_id: deal.id,
            name: lead.name,
            contact_info: { email: lead.email || '', phone: lead.phone || '' }
          }])
          .select()
          .single();

        if (clientError) throw clientError;
        client = newClient;
      }

      // 3. Check/create project
      const { data: existingProject } = await supabase!
        .from('projects')
        .select('*')
        .eq('client_id', client.id)
        .maybeSingle();

      let project = existingProject;
      if (!project) {
        const { data: newProject, error: projectError } = await supabase!
          .from('projects')
          .insert([{
            company_id: deal.company_id,
            client_id: client.id,
            name: `Project for ${lead.name}`,
            status: 'pending_approval',
            manager_id: null,
            progress: 0.00
          }])
          .select()
          .single();

        if (projectError) throw projectError;
        project = newProject;

        // 4. Create default milestones
        const defaultMilestones = ['Phase 1: Planning', 'Phase 2: Design', 'Phase 3: Development', 'Phase 4: Delivery'];
        const milestonesToInsert = defaultMilestones.map((name, i) => ({
          company_id: deal.company_id,
          project_id: project.id,
          name,
          sort_order: i + 1
        }));

        const { error: msError } = await supabase!
          .from('milestones')
          .insert(milestonesToInsert);

        if (msError) throw msError;
      }
    },

    async list(): Promise<Deal[]> {
      await delay(300);
      if (isMock) return MockDatabase.getDeals();

      const { data, error } = await getScopedQuery('deals');
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

      if (data.stage === 'won') {
        try {
          await this.triggerDealWon(data);
        } catch (triggerErr) {
          console.error('Failed to trigger project generation:', triggerErr);
        }
      }

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

      if (data.stage === 'won') {
        try {
          await this.triggerDealWon(data);
        } catch (triggerErr) {
          console.error('Failed to trigger project generation:', triggerErr);
        }
      }

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

      const { data, error } = await getScopedQuery('clients');
      if (error) throw error;
      return data || [];
    }
  },

  projects: {
    async list(): Promise<Project[]> {
      await delay(300);
      if (isMock) return MockDatabase.getProjects();

      const { data, error } = await getScopedQuery('projects');
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

      let query = getScopedQuery('milestones');
      if (projectId) {
        query = query.eq('project_id', projectId);
      }
      const { data, error } = await query.order('sort_order', { ascending: true });
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

      let query = getScopedQuery('tasks');
      if (projectId) {
        // Fetch tasks for the project by checking sub-milestones
        const { data: milestones } = await getScopedQuery('milestones')
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

      const { data, error } = await getScopedQuery('invoices');
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

      const { data, error } = await getScopedQuery('expenses');
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

    async createCompany(name: string, logoUrl?: string, crmName?: string): Promise<Company> {
      await delay(300);
      if (isMock) return MockDatabase.superadminCreateCompany(name, logoUrl, crmName);
      const { data, error } = await supabase!
        .from('companies')
        .insert([{ name, logo_url: logoUrl || null, crm_name: crmName || null }])
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
      const { error } = await supabase!.rpc('delete_company_cascade', {
        p_company_id: id
      });
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
      
      const { data, error } = await supabase!.rpc('create_tenant_admin_user', {
        p_company_id: companyId,
        p_name: name,
        p_email: email,
        p_password: pass
      });
      
      if (error) throw error;
      return data[0]; // RPC returns array, get first element
    },

    async deleteTenantAdmin(id: string): Promise<void> {
      await delay(250);
      if (isMock) {
        MockDatabase.superadminDeleteTenantAdmin(id);
        return;
      }
      const { error } = await supabase!.rpc('delete_tenant_user', {
        p_user_id: id
      });
      if (error) throw error;
    },

    async updateTenantAdminPassword(id: string, pass: string): Promise<void> {
      await delay(250);
      if (isMock) {
        MockDatabase.superadminUpdateTenantAdminPassword(id, pass);
        return;
      }
      const { error } = await supabase!.rpc('update_user_password', {
        p_user_id: id,
        p_password: pass
      });
      if (error) throw error;
    }
  },

  departments: {
    async list(): Promise<Department[]> {
      await delay(100);
      if (isMock) return MockDatabase.getDepartments();

      const { data, error } = await getScopedQuery('departments');
      if (error) throw error;
      return data || [];
    },

    async create(name: string, companyId: string): Promise<Department> {
      await delay(200);
      if (isMock) return MockDatabase.insertDepartment(name, companyId);

      const { data, error } = await supabase!
        .from('departments')
        .insert([{ name, company_id: companyId }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async delete(id: string): Promise<void> {
      await delay(200);
      if (isMock) {
        MockDatabase.deleteDepartment(id);
        return;
      }
      const { error } = await supabase!.from('departments').delete().eq('id', id);
      if (error) throw error;
    }
  },

  subscriptionRequests: {
    async list(): Promise<SubscriptionRequest[]> {
      await delay(300);
      if (isMock) return MockDatabase.getSubscriptionRequests();
      const { data, error } = await supabase!
        .from('subscription_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },

    async create(request: Omit<SubscriptionRequest, 'id' | 'status' | 'created_at'>): Promise<SubscriptionRequest> {
      await delay(400);
      if (isMock) return MockDatabase.insertSubscriptionRequest(request);
      const { data, error } = await supabase!
        .from('subscription_requests')
        .insert([request])
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async updateStatus(id: string, status: 'approved' | 'rejected'): Promise<SubscriptionRequest> {
      await delay(300);
      if (isMock) return MockDatabase.updateSubscriptionRequestStatus(id, status);
      const { data, error } = await supabase!
        .from('subscription_requests')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  },

  supportAccess: {
    async listGrants(companyId?: string): Promise<any[]> {
      if (isMock) {
        const grants = JSON.parse(localStorage.getItem('crm_support_grants') || '[]');
        if (companyId) return grants.filter((g: any) => g.company_id === companyId);
        return grants;
      }
      let query = supabase!.from('superadmin_access_grants').select('*');
      if (companyId) {
        query = query.eq('company_id', companyId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    async grant(superadminId: string, durationHours: number): Promise<any> {
      if (isMock) {
        const currentUser = MockDatabase.getCurrentUser();
        if (!currentUser) throw new Error('Unauthenticated');
        const grants = JSON.parse(localStorage.getItem('crm_support_grants') || '[]');
        const newGrant = {
          id: crypto.randomUUID(),
          company_id: currentUser.company_id,
          superadmin_id: superadminId,
          granted_by: currentUser.id,
          duration_hours: durationHours,
          expires_at: new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString()
        };
        grants.push(newGrant);
        localStorage.setItem('crm_support_grants', JSON.stringify(grants));
        return newGrant;
      }

      const { data: { user } } = await supabase!.auth.getUser();
      if (!user) throw new Error('Unauthenticated');
      
      const { data: profile } = await supabase!
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();
      
      if (!profile) throw new Error('Profile not found');

      const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase!
        .from('superadmin_access_grants')
        .insert([{
          company_id: profile.company_id,
          superadmin_id: superadminId,
          granted_by: user.id,
          duration_hours: durationHours,
          expires_at: expiresAt
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async revoke(grantId: string): Promise<void> {
      if (isMock) {
        const grants = JSON.parse(localStorage.getItem('crm_support_grants') || '[]');
        const filtered = grants.filter((g: any) => g.id !== grantId);
        localStorage.setItem('crm_support_grants', JSON.stringify(filtered));
        return;
      }
      const { error } = await supabase!
        .from('superadmin_access_grants')
        .delete()
        .eq('id', grantId);
      
      if (error) throw error;
    }
  }
};
