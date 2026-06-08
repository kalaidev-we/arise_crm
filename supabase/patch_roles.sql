-- ============================================================
-- ARISE CRM — SCHEMA PATCH: CUSTOM ROLES & ACCESS CONTROLS
-- ============================================================
-- Run this in your Supabase SQL Editor.
-- ============================================================

-- 1. Create custom_roles table
CREATE TABLE IF NOT EXISTS public.custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  base_role TEXT NOT NULL CHECK (base_role IN ('admin', 'manager', 'staff')),
  can_view_finance BOOLEAN NOT NULL DEFAULT FALSE,
  can_manage_sales BOOLEAN NOT NULL DEFAULT FALSE,
  can_manage_projects BOOLEAN NOT NULL DEFAULT FALSE,
  can_manage_team BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(company_id, name)
);

-- Enable RLS on custom_roles
ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;

-- Configure RLS Policies for custom_roles
DROP POLICY IF EXISTS "custom_roles_all" ON public.custom_roles;
CREATE POLICY "custom_roles_all" ON public.custom_roles
  FOR ALL
  USING (
    company_id = get_current_user_company_id()
    OR (is_current_user_superadmin() AND has_superadmin_access(company_id))
  );

-- 2. Add custom_role_id to users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS custom_role_id UUID REFERENCES public.custom_roles(id) ON DELETE SET NULL;

-- 3. Recreate the profiles view to include custom_role_id and title
CREATE OR REPLACE VIEW public.profiles AS
SELECT 
  id, 
  company_id, 
  department_id, 
  manager_id, 
  custom_role_id,
  name, 
  email, 
  role, 
  title,
  is_default_password, 
  created_at
FROM public.users;
