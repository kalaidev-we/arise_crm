-- ============================================================
-- ARISE CRM — ALL QUERIES REFERENCE GUIDE
-- ============================================================
-- Complete list of all SQL queries used in the project
-- ============================================================

-- ============================================================
-- TABLE CREATION QUERIES (schema.sql)
-- ============================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. COMPANIES TABLE
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  crm_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2B. SUBSCRIPTION REQUESTS TABLE
CREATE TABLE IF NOT EXISTS subscription_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  logo_url TEXT,
  crm_name TEXT,
  plan TEXT NOT NULL CHECK (plan IN ('starter', 'growth', 'enterprise')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. DEPARTMENTS TABLE
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id),
  department_id UUID REFERENCES departments(id),
  manager_id UUID REFERENCES users(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('superadmin', 'admin', 'manager', 'staff')),
  is_default_password BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. PROFILES VIEW
CREATE OR REPLACE VIEW profiles AS
SELECT 
  id, company_id, department_id, manager_id, name, email, role, is_default_password, created_at
FROM users;

-- 6. LEADS TABLE
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  title TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'lost')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 7. DEALS TABLE
CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  value NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  stage TEXT NOT NULL DEFAULT 'prospect' CHECK (stage IN ('prospect', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'won', 'lost')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 8. CLIENTS TABLE
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  contact_info JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 9. PROJECTS TABLE
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id),
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
  progress NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 10. MILESTONES TABLE
CREATE TABLE IF NOT EXISTS milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 11. TASKS TABLE
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  milestone_id UUID NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES users(id),
  assigned_role TEXT CHECK (assigned_role IN ('admin', 'manager', 'staff')),
  report_text TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in-progress', 'done')),
  due_date DATE,
  completed_by UUID REFERENCES users(id),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 12. INVOICES TABLE
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  amount NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('paid', 'unpaid', 'partial')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 13. EXPENSES TABLE
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN ('salary', 'ads', 'tools', 'freelancer', 'other')),
  amount NUMERIC(12,2) NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) - ENABLE
-- ============================================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER FUNCTIONS FOR RLS (SECURITY DEFINER)
-- ============================================================

-- Get current authenticated user ID
CREATE OR REPLACE FUNCTION get_current_user_id() 
RETURNS UUID AS $$
BEGIN
  RETURN auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_current_user_role() 
RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM users WHERE id = auth.uid() LIMIT 1;
  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_current_user_company_id() 
RETURNS UUID AS $$
DECLARE
  v_company_id UUID;
BEGIN
  SELECT company_id INTO v_company_id FROM users WHERE id = auth.uid() LIMIT 1;
  RETURN v_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION is_current_user_superadmin() 
RETURNS BOOLEAN AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM users WHERE id = auth.uid() LIMIT 1;
  RETURN v_role = 'superadmin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- USERS TABLE POLICIES
CREATE POLICY "users_select_own_company" ON users
  FOR SELECT
  USING (
    auth.uid() = id
    OR company_id = get_current_user_company_id()
    OR is_current_user_superadmin()
  );

CREATE POLICY "users_insert" ON users
  FOR INSERT
  WITH CHECK (
    get_current_user_role() IN ('admin', 'superadmin')
  );

CREATE POLICY "users_update" ON users
  FOR UPDATE
  USING (
    auth.uid() = id
    OR get_current_user_role() IN ('admin', 'superadmin')
  );

CREATE POLICY "users_delete" ON users
  FOR DELETE
  USING (
    get_current_user_role() IN ('admin', 'superadmin')
  );

-- COMPANIES TABLE POLICIES
CREATE POLICY "companies_select" ON companies
  FOR SELECT
  USING (
    id = get_current_user_company_id()
    OR is_current_user_superadmin()
  );

CREATE POLICY "companies_insert" ON companies
  FOR INSERT
  WITH CHECK (
    is_current_user_superadmin()
  );

CREATE POLICY "companies_delete" ON companies
  FOR DELETE
  USING (
    is_current_user_superadmin()
  );

-- SUBSCRIPTION REQUESTS TABLE POLICIES
ALTER TABLE subscription_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscription_requests_public_insert" ON subscription_requests
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "subscription_requests_superadmin_all" ON subscription_requests
  FOR ALL
  USING (is_current_user_superadmin());

-- DEPARTMENTS TABLE POLICY
CREATE POLICY "departments_select" ON departments
  FOR SELECT
  USING (
    company_id = get_current_user_company_id()
    OR is_current_user_superadmin()
  );

CREATE POLICY "departments_insert" ON departments
  FOR INSERT
  WITH CHECK (
    company_id = get_current_user_company_id()
    AND get_current_user_role() IN ('admin', 'superadmin')
  );

CREATE POLICY "departments_delete" ON departments
  FOR DELETE
  USING (
    company_id = get_current_user_company_id()
    AND get_current_user_role() IN ('admin', 'superadmin')
  );

-- COMPANY-SCOPED TABLE POLICIES
CREATE POLICY "leads_all" ON leads
  FOR ALL
  USING (company_id = get_current_user_company_id());

CREATE POLICY "deals_all" ON deals
  FOR ALL
  USING (company_id = get_current_user_company_id());

CREATE POLICY "clients_all" ON clients
  FOR ALL
  USING (company_id = get_current_user_company_id());

CREATE POLICY "projects_all" ON projects
  FOR ALL
  USING (company_id = get_current_user_company_id());

CREATE POLICY "milestones_all" ON milestones
  FOR ALL
  USING (company_id = get_current_user_company_id());

CREATE POLICY "tasks_all" ON tasks
  FOR ALL
  USING (company_id = get_current_user_company_id());

CREATE POLICY "invoices_all" ON invoices
  FOR ALL
  USING (company_id = get_current_user_company_id());

CREATE POLICY "expenses_all" ON expenses
  FOR ALL
  USING (company_id = get_current_user_company_id());

-- ============================================================
-- STORED PROCEDURES (EDGE FUNCTIONS)
-- ============================================================

-- Create Tenant Admin User (atomic operation)
CREATE OR REPLACE FUNCTION create_tenant_admin_user(
  p_company_id UUID,
  p_name TEXT,
  p_email TEXT,
  p_password TEXT
)
RETURNS TABLE (
  id UUID,
  company_id UUID,
  name TEXT,
  email TEXT,
  role TEXT,
  is_default_password BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
#variable_conflict use_column
DECLARE
  v_user_id UUID;
  v_instance_id UUID;
BEGIN
  -- Authorization check: only admins can create users
  IF (SELECT u.role FROM public.users u WHERE u.id = auth.uid()) NOT IN ('superadmin', 'admin') THEN
    RAISE EXCEPTION 'Only admins can create users';
  END IF;

  -- Retrieve the auth instance_id from existing users, fallback if null
  SELECT DISTINCT instance_id INTO v_instance_id FROM auth.users WHERE instance_id IS NOT NULL LIMIT 1;
  
  IF v_instance_id IS NULL THEN
    v_instance_id := '00000000-0000-0000-0000-000000000000';
  END IF;

  -- Generate new user ID
  v_user_id := gen_random_uuid();

  -- Create auth user
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, aud, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change, role
  )
  VALUES (
    v_user_id, v_instance_id, p_email, crypt(p_password, gen_salt('bf')), NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('name', p_name),
    'authenticated', NOW(), NOW(), '', '', '', '', 'authenticated'
  );

  -- Create auth identity record
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  )
  VALUES (
    v_user_id, v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', p_email, 'email_verified', true),
    'email', v_user_id::text, NOW(), NOW(), NOW()
  );

  -- Create public user profile
  INSERT INTO users (id, company_id, name, email, role, is_default_password)
  VALUES (v_user_id, p_company_id, p_name, p_email, 'admin', TRUE)
  ON CONFLICT (id) DO UPDATE
  SET company_id = EXCLUDED.company_id,
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      role = EXCLUDED.role,
      is_default_password = EXCLUDED.is_default_password;

  -- Return created user
  RETURN QUERY
  SELECT users.id, users.company_id, users.name, users.email, users.role,
         users.is_default_password, users.created_at
  FROM users
  WHERE users.id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Create Tenant User (atomic operation, standard users)
CREATE OR REPLACE FUNCTION create_tenant_user(
  p_company_id UUID,
  p_name TEXT,
  p_email TEXT,
  p_password TEXT,
  p_role TEXT,
  p_department_id UUID,
  p_manager_id UUID
)
RETURNS TABLE (
  id UUID,
  company_id UUID,
  name TEXT,
  email TEXT,
  role TEXT,
  is_default_password BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
#variable_conflict use_column
DECLARE
  v_user_id UUID;
  v_instance_id UUID;
BEGIN
  -- Authorization check: only admins/superadmins can create users
  IF (SELECT u.role FROM public.users u WHERE u.id = auth.uid()) NOT IN ('superadmin', 'admin') THEN
    RAISE EXCEPTION 'Only admins can create users';
  END IF;

  -- If the caller is an admin (not superadmin), they can only create users in their own company
  IF (SELECT u.role FROM public.users u WHERE u.id = auth.uid()) = 'admin' AND p_company_id != (SELECT u.company_id FROM public.users u WHERE u.id = auth.uid()) THEN
    RAISE EXCEPTION 'Admins can only create users in their own company';
  END IF;

  -- Validate role
  IF p_role NOT IN ('admin', 'manager', 'staff') THEN
    RAISE EXCEPTION 'Invalid role specified';
  END IF;

  -- Retrieve the auth instance_id from existing users, fallback if null
  SELECT DISTINCT instance_id INTO v_instance_id FROM auth.users WHERE instance_id IS NOT NULL LIMIT 1;
  
  IF v_instance_id IS NULL THEN
    v_instance_id := '00000000-0000-0000-0000-000000000000';
  END IF;

  -- Generate new user ID
  v_user_id := gen_random_uuid();

  -- Create auth user
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, aud, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change, role
  )
  VALUES (
    v_user_id, v_instance_id, p_email, crypt(p_password, gen_salt('bf')), NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('name', p_name),
    'authenticated', NOW(), NOW(), '', '', '', '', 'authenticated'
  );

  -- Create auth identity record
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  )
  VALUES (
    v_user_id, v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', p_email, 'email_verified', true),
    'email', v_user_id::text, NOW(), NOW(), NOW()
  );

  -- Create public user profile
  INSERT INTO users (id, company_id, department_id, manager_id, name, email, role, is_default_password)
  VALUES (v_user_id, p_company_id, p_department_id, p_manager_id, p_name, p_email, p_role, TRUE)
  ON CONFLICT (id) DO UPDATE
  SET company_id = EXCLUDED.company_id,
      department_id = EXCLUDED.department_id,
      manager_id = EXCLUDED.manager_id,
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      role = EXCLUDED.role,
      is_default_password = EXCLUDED.is_default_password;

  -- Return created user
  RETURN QUERY
  SELECT users.id, users.company_id, users.name, users.email, users.role,
         users.is_default_password, users.created_at
  FROM users
  WHERE users.id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Update User Password
CREATE OR REPLACE FUNCTION update_user_password(
  p_user_id UUID,
  p_password TEXT
)
RETURNS VOID AS $$
BEGIN
  -- Authorization check: only admins/superadmins can update other passwords, OR user can update their own
  IF (SELECT u.role FROM public.users u WHERE u.id = auth.uid()) NOT IN ('superadmin', 'admin') AND auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized to change this password';
  END IF;

  -- If caller is admin, they can only change password for users in their own company
  IF (SELECT u.role FROM public.users u WHERE u.id = auth.uid()) = 'admin' AND (SELECT u.company_id FROM public.users u WHERE u.id = p_user_id) != (SELECT u.company_id FROM public.users u WHERE u.id = auth.uid()) THEN
    RAISE EXCEPTION 'Admins can only change passwords for users in their own company';
  END IF;

  -- Update auth.users encrypted_password
  UPDATE auth.users
  SET encrypted_password = crypt(p_password, gen_salt('bf')),
      updated_at = NOW()
  WHERE id = p_user_id;

  -- Update public.users is_default_password
  UPDATE users
  SET is_default_password = (auth.uid() != p_user_id)
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Delete Tenant User
CREATE OR REPLACE FUNCTION delete_tenant_user(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Authorization check: only admins/superadmins can delete users
  IF (SELECT u.role FROM public.users u WHERE u.id = auth.uid()) NOT IN ('superadmin', 'admin') THEN
    RAISE EXCEPTION 'Only admins can delete users';
  END IF;

  -- If caller is admin, they can only delete users in their own company
  IF (SELECT u.role FROM public.users u WHERE u.id = auth.uid()) = 'admin' AND (SELECT u.company_id FROM public.users u WHERE u.id = p_user_id) != (SELECT u.company_id FROM public.users u WHERE u.id = auth.uid()) THEN
    RAISE EXCEPTION 'Admins can only delete users in their own company';
  END IF;

  -- Prevent deleting self
  IF auth.uid() = p_user_id THEN
    RAISE EXCEPTION 'Cannot delete your own account';
  END IF;

  -- Delete from public.users first
  DELETE FROM users WHERE id = p_user_id;

  -- Delete from auth.users (which cascades to auth.identities)
  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Delete Company Cascade
CREATE OR REPLACE FUNCTION delete_company_cascade(p_company_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Authorization check: only superadmins can delete companies
  IF NOT is_current_user_superadmin() THEN
    RAISE EXCEPTION 'Only superadmins can delete companies';
  END IF;

  -- 1. Delete all users belonging to this company from auth.users (which cascades to public.users and auth.identities)
  DELETE FROM auth.users WHERE id IN (SELECT u.id FROM public.users u WHERE u.company_id = p_company_id);

  -- 2. Delete the company itself (which cascades to all other company-scoped tables)
  DELETE FROM companies WHERE id = p_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- SEED QUERIES (seed.sql)
-- ============================================================

-- 1. Create System Company
INSERT INTO companies (id, name)
VALUES ('00000000-0000-0000-0000-000000000000', 'System (Master)')
ON CONFLICT (id) DO NOTHING;

-- 2. Create Superadmin Auth User
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, aud, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
VALUES (
  sa_user_id, auth_instance_id, 'master@arisecrm.com',
  crypt('AriseAdmin@2026', gen_salt('bf')), NOW(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('name', 'Master Admin'),
  'authenticated', NOW(), NOW(), '', '', '', ''
);

-- 3. Create Superadmin Identity
INSERT INTO auth.identities (
  id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
)
VALUES (
  sa_user_id, sa_user_id,
  jsonb_build_object('sub', sa_user_id::text, 'email', 'master@arisecrm.com', 'email_verified', true),
  'email', sa_user_id::text, NOW(), NOW(), NOW()
);

-- 4. Create Superadmin Profile
INSERT INTO users (id, company_id, name, email, role, is_default_password)
VALUES (
  sa_user_id, '00000000-0000-0000-0000-000000000000',
  'Master Admin', 'master@arisecrm.com', 'superadmin', TRUE
);

-- ============================================================
-- CLEANUP QUERIES (cleanup.sql)
-- ============================================================

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS milestones CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS deals CASCADE;
DROP TABLE IF EXISTS leads CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS companies CASCADE;

-- Drop views
DROP VIEW IF EXISTS profiles CASCADE;

-- Drop helper functions
DROP FUNCTION IF EXISTS get_current_user_id() CASCADE;
DROP FUNCTION IF EXISTS get_current_user_role() CASCADE;
DROP FUNCTION IF EXISTS get_current_user_company_id() CASCADE;
DROP FUNCTION IF EXISTS is_current_user_superadmin() CASCADE;

-- Drop stored procedures
DROP FUNCTION IF EXISTS create_tenant_admin_user(UUID, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS create_tenant_user(UUID, TEXT, TEXT, TEXT, TEXT, UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS update_user_password(UUID, TEXT) CASCADE;

-- ============================================================
-- COMMONLY USED SELECT QUERIES
-- ============================================================

-- Get current user profile
SELECT * FROM users WHERE id = auth.uid();

-- Get all users in current company
SELECT * FROM users WHERE company_id = get_current_user_company_id();

-- Get all companies (superadmin only)
SELECT * FROM companies;

-- Get all leads in current company
SELECT * FROM leads WHERE company_id = get_current_user_company_id();

-- Get all deals with lead info
SELECT d.*, l.name as lead_name FROM deals d
JOIN leads l ON d.lead_id = l.id
WHERE d.company_id = get_current_user_company_id();

-- Get all projects in current company
SELECT * FROM projects WHERE company_id = get_current_user_company_id();

-- Get all tasks assigned to current user
SELECT * FROM tasks WHERE assigned_to = auth.uid();

-- Get all invoices in current company
SELECT * FROM invoices WHERE company_id = get_current_user_company_id();

-- Get all expenses in current company
SELECT * FROM expenses WHERE company_id = get_current_user_company_id();

-- ============================================================
-- COMMON INSERT QUERIES
-- ============================================================

-- Create new company (superadmin only)
INSERT INTO companies (name) VALUES ('New Company Name');

-- Create new lead
INSERT INTO leads (company_id, owner_id, name, email, phone, status)
VALUES (current_company_id, current_user_id, 'Lead Name', 'email@example.com', '+1234567890', 'new');

-- Create new project
INSERT INTO projects (company_id, client_id, name, status, manager_id)
VALUES (current_company_id, client_id, 'Project Name', 'active', manager_user_id);

-- Create new task
INSERT INTO tasks (company_id, milestone_id, title, assigned_to, created_by, status, due_date)
VALUES (current_company_id, milestone_id, 'Task Title', assigned_user_id, current_user_id, 'todo', '2026-12-31');

-- Create new invoice
INSERT INTO invoices (company_id, project_id, client_id, amount, status)
VALUES (current_company_id, project_id, client_id, 5000.00, 'unpaid');

-- ============================================================
-- COMMON UPDATE QUERIES
-- ============================================================

-- Update user role
UPDATE users SET role = 'manager' WHERE id = user_id AND company_id = get_current_user_company_id();

-- Update lead status
UPDATE leads SET status = 'qualified' WHERE id = lead_id AND company_id = get_current_user_company_id();

-- Update project progress
UPDATE projects SET progress = 75.00 WHERE id = project_id AND company_id = get_current_user_company_id();

-- Update task status
UPDATE tasks SET status = 'in-progress' WHERE id = task_id AND company_id = get_current_user_company_id();

-- Update invoice status
UPDATE invoices SET status = 'paid' WHERE id = invoice_id AND company_id = get_current_user_company_id();

-- ============================================================
-- COMMON DELETE QUERIES
-- ============================================================

-- Delete user (admin only)
DELETE FROM users WHERE id = user_id AND company_id = get_current_user_company_id();

-- Delete lead
DELETE FROM leads WHERE id = lead_id AND company_id = get_current_user_company_id();

-- Delete project
DELETE FROM projects WHERE id = project_id AND company_id = get_current_user_company_id();

-- Delete task
DELETE FROM tasks WHERE id = task_id AND company_id = get_current_user_company_id();

-- Delete invoice
DELETE FROM invoices WHERE id = invoice_id AND company_id = get_current_user_company_id();

-- ============================================================
-- 13. INITIAL SEED DATA (SUPERADMIN)
-- ============================================================
-- Create System Company
INSERT INTO companies (id, name) 
VALUES ('00000000-0000-0000-0000-000000000000', 'AriseAgency') 
ON CONFLICT (id) DO NOTHING;

-- Create Super Admin in Auth schema
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, created_at, updated_at, role
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'admin@ariseagency.com',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{}',
  'authenticated',
  now(),
  now(),
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
  id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  format('{"sub":"%s","email":"%s"}', '00000000-0000-0000-0000-000000000001', 'admin@ariseagency.com')::jsonb,
  'email',
  '00000000-0000-0000-0000-000000000001',
  now(),
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;

-- Create Super Admin in Public schema
INSERT INTO users (id, company_id, name, email, role, is_default_password)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'System Superadmin',
  'admin@ariseagency.com',
  'superadmin',
  TRUE
) ON CONFLICT (id) DO NOTHING;

