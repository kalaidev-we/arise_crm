-- ============================================================
-- ARISE CRM — SCHEMA PATCH: TEMPORARY SUPPORT ACCESS & SECURITY
-- ============================================================
-- Run this in your Supabase SQL Editor.
-- ============================================================

-- 1. Create temporary support access grants table
CREATE TABLE IF NOT EXISTS superadmin_access_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  superadmin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  granted_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  duration_hours INT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS on grants
ALTER TABLE superadmin_access_grants ENABLE ROW LEVEL SECURITY;

-- 2. Define support access validation helper
CREATE OR REPLACE FUNCTION has_superadmin_access(p_company_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if there is an active, unexpired grant for this superadmin and company
  RETURN EXISTS (
    SELECT 1 
    FROM superadmin_access_grants 
    WHERE company_id = p_company_id 
      AND superadmin_id = auth.uid() 
      AND expires_at > NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Configure RLS Policies for superadmin_access_grants
DROP POLICY IF EXISTS "access_grants_select" ON superadmin_access_grants;
CREATE POLICY "access_grants_select" ON superadmin_access_grants
  FOR SELECT
  USING (
    company_id = get_current_user_company_id()
    OR superadmin_id = auth.uid()
  );

DROP POLICY IF EXISTS "access_grants_insert" ON superadmin_access_grants;
CREATE POLICY "access_grants_insert" ON superadmin_access_grants
  FOR INSERT
  WITH CHECK (
    company_id = get_current_user_company_id()
    AND get_current_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "access_grants_delete" ON superadmin_access_grants;
CREATE POLICY "access_grants_delete" ON superadmin_access_grants
  FOR DELETE
  USING (
    company_id = get_current_user_company_id()
    AND get_current_user_role() = 'admin'
    OR superadmin_id = auth.uid()
  );

-- 4. Update stored procedure: delete_tenant_user
-- Prevents admins from deleting superadmins
CREATE OR REPLACE FUNCTION delete_tenant_user(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Authorization check: only admins/superadmins can delete users
  IF (SELECT u.role FROM public.users u WHERE u.id = auth.uid()) NOT IN ('superadmin', 'admin') THEN
    RAISE EXCEPTION 'Only admins can delete users';
  END IF;

  -- Block admins from deleting superadmins
  IF (SELECT u.role FROM public.users u WHERE u.id = p_user_id) = 'superadmin' AND (SELECT u.role FROM public.users u WHERE u.id = auth.uid()) = 'admin' THEN
    RAISE EXCEPTION 'Admins cannot delete superadmins';
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

-- 5. Update RLS policies on users table so admins can see superadmins to grant them support access
DROP POLICY IF EXISTS "users_select_own_company" ON users;
CREATE POLICY "users_select_own_company" ON users
  FOR SELECT
  USING (
    auth.uid() = id
    OR company_id = get_current_user_company_id()
    OR is_current_user_superadmin()
    OR (get_current_user_role() = 'admin' AND role = 'superadmin')
  );

-- 6. Update RLS policies on company-scoped tables to restrict superadmin access
-- Leads RLS
DROP POLICY IF EXISTS "leads_all" ON leads;
CREATE POLICY "leads_all" ON leads
  FOR ALL
  USING (
    company_id = get_current_user_company_id()
    OR (is_current_user_superadmin() AND has_superadmin_access(company_id))
  );

-- Deals RLS
DROP POLICY IF EXISTS "deals_all" ON deals;
CREATE POLICY "deals_all" ON deals
  FOR ALL
  USING (
    company_id = get_current_user_company_id()
    OR (is_current_user_superadmin() AND has_superadmin_access(company_id))
  );

-- Clients RLS
DROP POLICY IF EXISTS "clients_all" ON clients;
CREATE POLICY "clients_all" ON clients
  FOR ALL
  USING (
    company_id = get_current_user_company_id()
    OR (is_current_user_superadmin() AND has_superadmin_access(company_id))
  );

-- Projects RLS
DROP POLICY IF EXISTS "projects_all" ON projects;
CREATE POLICY "projects_all" ON projects
  FOR ALL
  USING (
    company_id = get_current_user_company_id()
    OR (is_current_user_superadmin() AND has_superadmin_access(company_id))
  );

-- Milestones RLS
DROP POLICY IF EXISTS "milestones_all" ON milestones;
CREATE POLICY "milestones_all" ON milestones
  FOR ALL
  USING (
    company_id = get_current_user_company_id()
    OR (is_current_user_superadmin() AND has_superadmin_access(company_id))
  );

-- Tasks RLS
DROP POLICY IF EXISTS "tasks_all" ON tasks;
CREATE POLICY "tasks_all" ON tasks
  FOR ALL
  USING (
    company_id = get_current_user_company_id()
    OR (is_current_user_superadmin() AND has_superadmin_access(company_id))
  );

-- Invoices RLS
DROP POLICY IF EXISTS "invoices_all" ON invoices;
CREATE POLICY "invoices_all" ON invoices
  FOR ALL
  USING (
    company_id = get_current_user_company_id()
    OR (is_current_user_superadmin() AND has_superadmin_access(company_id))
  );

-- Expenses RLS
DROP POLICY IF EXISTS "expenses_all" ON expenses;
CREATE POLICY "expenses_all" ON expenses
  FOR ALL
  USING (
    company_id = get_current_user_company_id()
    OR (is_current_user_superadmin() AND has_superadmin_access(company_id))
  );
