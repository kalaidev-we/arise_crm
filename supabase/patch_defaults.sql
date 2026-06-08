-- ============================================================
-- ARISE CRM — SCHEMA PATCH: SET DEFAULT VALUES FOR TENANT SCOPING
-- ============================================================
-- Run this in your Supabase SQL Editor to automatically populate
-- company_id and owner_id fields during frontend inserts.
-- ============================================================

-- Set defaults for leads
ALTER TABLE leads ALTER COLUMN company_id SET DEFAULT get_current_user_company_id();
ALTER TABLE leads ALTER COLUMN owner_id SET DEFAULT auth.uid();

-- Set defaults for deals
ALTER TABLE deals ALTER COLUMN company_id SET DEFAULT get_current_user_company_id();

-- Set defaults for clients
ALTER TABLE clients ALTER COLUMN company_id SET DEFAULT get_current_user_company_id();

-- Set defaults for projects
ALTER TABLE projects ALTER COLUMN company_id SET DEFAULT get_current_user_company_id();

-- Set defaults for milestones
ALTER TABLE milestones ALTER COLUMN company_id SET DEFAULT get_current_user_company_id();

-- Set defaults for tasks
ALTER TABLE tasks ALTER COLUMN company_id SET DEFAULT get_current_user_company_id();
ALTER TABLE tasks ALTER COLUMN created_by SET DEFAULT auth.uid();

-- Set defaults for invoices
ALTER TABLE invoices ALTER COLUMN company_id SET DEFAULT get_current_user_company_id();

-- Set defaults for expenses
ALTER TABLE expenses ALTER COLUMN company_id SET DEFAULT get_current_user_company_id();

-- Set defaults for departments
ALTER TABLE departments ALTER COLUMN company_id SET DEFAULT get_current_user_company_id();
