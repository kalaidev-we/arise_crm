-- ============================================================
-- ARISE CRM — DATABASE CLEANUP SCRIPT
-- ============================================================
-- Safely removes all CRM tables, views, functions, and policies
-- Run this before re-running schema.sql to start fresh
-- ============================================================

-- Drop tables in reverse order of dependencies
-- Policies and RLS rules cascade automatically with table drops

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

-- Confirmation message
DO $$
BEGIN
  RAISE NOTICE 'Database cleanup complete. All CRM tables, views, and functions have been removed.';
  RAISE NOTICE 'You can now run schema.sql to initialize a fresh database.';
END $$;
