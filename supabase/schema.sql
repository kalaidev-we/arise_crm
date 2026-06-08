-- ============================================================
-- ARISE CRM — FINAL SUPABASE DATABASE SCHEMA
-- ============================================================
-- Complete production-ready schema with all fixes applied
-- 1. Proper auth user instance_id handling
-- 2. Non-recursive RLS policies using helper functions
-- 3. Stored procedure for atomic user creation
-- ============================================================

-- ============================================================
-- EXTENSIONS & SETUP
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1. COMPANIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  crm_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ============================================================
-- 1B. SUBSCRIPTION REQUESTS TABLE
-- ============================================================
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

-- ============================================================
-- 2. DEPARTMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ============================================================
-- 3. USERS TABLE (matches auth.users profile)
-- ============================================================
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

-- Create profiles view (masks sensitive fields)
CREATE OR REPLACE VIEW profiles AS
SELECT 
  id, 
  company_id, 
  department_id, 
  manager_id, 
  name, 
  email, 
  role, 
  is_default_password, 
  created_at
FROM users;

-- ============================================================
-- 4. LEADS TABLE
-- ============================================================
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

-- ============================================================
-- 5. DEALS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  value NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  stage TEXT NOT NULL DEFAULT 'prospect' CHECK (stage IN ('prospect', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'won', 'lost')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ============================================================
-- 6. CLIENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  contact_info JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ============================================================
-- 7. PROJECTS TABLE
-- ============================================================
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

-- ============================================================
-- 8. MILESTONES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ============================================================
-- 9. TASKS TABLE
-- ============================================================
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

-- ============================================================
-- 10. INVOICES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  amount NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('paid', 'unpaid', 'partial')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ============================================================
-- 11. EXPENSES TABLE
-- ============================================================
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
-- ROW LEVEL SECURITY - ENABLE ON ALL TABLES
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
-- Prevents infinite recursion by using SECURITY DEFINER
-- These functions safely retrieve user attributes within policies

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
-- RLS POLICIES - USERS TABLE
-- ============================================================
-- Users can see: their own profile, all users in their company, or everything (if superadmin)

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

-- ============================================================
-- RLS POLICIES - COMPANIES TABLE
-- ============================================================
-- Superadmins see all companies; others see their own

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

-- ============================================================
-- RLS POLICIES - SUBSCRIPTION REQUESTS TABLE
-- ============================================================
ALTER TABLE subscription_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscription_requests_public_insert" ON subscription_requests
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "subscription_requests_superadmin_all" ON subscription_requests
  FOR ALL
  USING (is_current_user_superadmin());

-- ============================================================
-- RLS POLICIES - DEPARTMENTS TABLE
-- ============================================================

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

-- ============================================================
-- RLS POLICIES - COMPANY-SCOPED TABLES
-- ============================================================
-- All other tables (leads, deals, clients, projects, etc.)
-- are accessible to users in the same company

CREATE POLICY "leads_all" ON leads
  FOR ALL
  USING (
    company_id = get_current_user_company_id()
  );

CREATE POLICY "deals_all" ON deals
  FOR ALL
  USING (
    company_id = get_current_user_company_id()
  );

CREATE POLICY "clients_all" ON clients
  FOR ALL
  USING (
    company_id = get_current_user_company_id()
  );

CREATE POLICY "projects_all" ON projects
  FOR ALL
  USING (
    company_id = get_current_user_company_id()
  );

CREATE POLICY "milestones_all" ON milestones
  FOR ALL
  USING (
    company_id = get_current_user_company_id()
  );

CREATE POLICY "tasks_all" ON tasks
  FOR ALL
  USING (
    company_id = get_current_user_company_id()
  );

CREATE POLICY "invoices_all" ON invoices
  FOR ALL
  USING (
    company_id = get_current_user_company_id()
  );

CREATE POLICY "expenses_all" ON expenses
  FOR ALL
  USING (
    company_id = get_current_user_company_id()
  );

-- ============================================================
-- STORED PROCEDURE: CREATE TENANT ADMIN USER
-- ============================================================
-- Creates both auth user and public user profile atomically
-- Handles auth instance_id retrieval safely
-- Called via: SELECT * FROM create_tenant_admin_user(...)

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

  -- Retrieve the auth instance_id from existing users
  SELECT DISTINCT instance_id INTO v_instance_id FROM auth.users WHERE instance_id IS NOT NULL LIMIT 1;
  
  IF v_instance_id IS NULL THEN
    v_instance_id := '00000000-0000-0000-0000-000000000000';
  END IF;

  -- Generate new user ID
  v_user_id := gen_random_uuid();

  -- Create auth user
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    role
  )
  VALUES (
    v_user_id,
    v_instance_id,
    p_email,
    crypt(p_password, gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('name', p_name),
    'authenticated',
    NOW(),
    NOW(),
    '',
    '',
    '',
    '',
    'authenticated'
  );

  -- Create auth identity record
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    v_user_id,
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', p_email, 'email_verified', true),
    'email',
    v_user_id::text,
    NOW(),
    NOW(),
    NOW()
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
  SELECT 
    users.id,
    users.company_id,
    users.name,
    users.email,
    users.role,
    users.is_default_password,
    users.created_at
  FROM users
  WHERE users.id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- STORED PROCEDURE: CREATE TENANT USER
-- ============================================================
-- Creates both auth user and public user profile atomically (standard users)
-- Handles auth instance_id retrieval safely
-- Called via: SELECT * FROM create_tenant_user(...)

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

  -- Retrieve the auth instance_id from existing users
  SELECT DISTINCT instance_id INTO v_instance_id FROM auth.users WHERE instance_id IS NOT NULL LIMIT 1;
  
  IF v_instance_id IS NULL THEN
    v_instance_id := '00000000-0000-0000-0000-000000000000';
  END IF;

  -- Generate new user ID
  v_user_id := gen_random_uuid();

  -- Create auth user
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    role
  )
  VALUES (
    v_user_id,
    v_instance_id,
    p_email,
    crypt(p_password, gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('name', p_name),
    'authenticated',
    NOW(),
    NOW(),
    '',
    '',
    '',
    '',
    'authenticated'
  );

  -- Create auth identity record
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    v_user_id,
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', p_email, 'email_verified', true),
    'email',
    v_user_id::text,
    NOW(),
    NOW(),
    NOW()
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
  SELECT 
    users.id,
    users.company_id,
    users.name,
    users.email,
    users.role,
    users.is_default_password,
    users.created_at
  FROM users
  WHERE users.id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- STORED PROCEDURE: UPDATE USER PASSWORD
-- ============================================================
-- Updates password in auth.users from database side
-- Restricts who can perform the update based on role and company scoping
-- Called via: SELECT update_user_password(user_id, new_password)

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


-- ============================================================
-- STORED PROCEDURE: DELETE TENANT USER
-- ============================================================
-- Deletes user profile and auth account atomically from DB side
-- Restricts deletion based on role boundaries (admins only delete own company users)
-- Called via: SELECT delete_tenant_user(user_id)

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


-- ============================================================
-- STORED PROCEDURE: DELETE COMPANY CASCADE
-- ============================================================
-- Deletes a company and all its users (both public and auth accounts) atomically
-- Restricted to superadmins
-- Called via: SELECT delete_company_cascade(company_id)

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

