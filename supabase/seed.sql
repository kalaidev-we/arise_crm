-- ============================================================
-- Arise CRM — Superadmin Seed Script
-- ============================================================
-- Run this in the Supabase SQL Editor AFTER running schema.sql
--
-- This script does 3 things:
--   1. Creates the "System" company (root-level, hidden from tenants)
--   2. Creates the superadmin user in Supabase Auth
--   3. Inserts the superadmin profile in the public.users table
--
-- ⚠️  IMPORTANT: Change the email and password below before running in production!
-- ============================================================

-- Ensure pgcrypto is available (Supabase usually has it, but just in case)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================
-- CONFIGURE THESE VALUES
-- =====================
DO $$
DECLARE
  -- *** CHANGE THESE to your desired superadmin credentials ***
  sa_email    TEXT := 'master@arisecrm.com';
  sa_password TEXT := 'AriseAdmin@2026';
  sa_name     TEXT := 'Master Admin';

  -- Fixed system IDs (do not change)
  system_company_id UUID := '00000000-0000-0000-0000-000000000000';
  sa_user_id        UUID := gen_random_uuid();
  auth_instance_id  UUID;
BEGIN
  -- =====================
  -- Get the correct instance_id from existing auth users, fallback if null
  -- =====================
  SELECT DISTINCT instance_id INTO auth_instance_id FROM auth.users WHERE instance_id IS NOT NULL LIMIT 1;
  
  IF auth_instance_id IS NULL THEN
    auth_instance_id := '00000000-0000-0000-0000-000000000000';
  END IF;

  -- =====================
  -- Step 0: Clean up any existing superadmin (optional, but recommended)
  -- =====================
  DELETE FROM auth.users WHERE email = sa_email;
  DELETE FROM users WHERE email = sa_email;
  RAISE NOTICE 'Step 0 done: Cleaned up any existing superadmin.';

  -- =====================
  -- Step 1: Create the System Company
  -- =====================
  INSERT INTO companies (id, name)
  VALUES (system_company_id, 'System (Master)')
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'Step 1 done: System company created.';

  -- =====================
  -- Step 2: Create Auth User via Supabase internal auth schema
  -- =====================
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
    email_change
  )
  VALUES (
    sa_user_id,
    auth_instance_id,
    sa_email,
    crypt(sa_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('name', sa_name),
    'authenticated',
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  RAISE NOTICE 'Step 2 done: Auth user created with ID: %', sa_user_id;

  -- =====================
  -- Step 3: Create the identity record (required for email/password login)
  -- =====================
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
    sa_user_id,
    sa_user_id,
    jsonb_build_object('sub', sa_user_id::text, 'email', sa_email, 'email_verified', true),
    'email',
    sa_user_id::text,
    now(),
    now(),
    now()
  );

  RAISE NOTICE 'Step 3 done: Auth identity created.';

  -- =====================
  -- Step 4: Insert the User Profile in public.users
  -- =====================
  INSERT INTO users (id, company_id, name, email, role, is_default_password)
  VALUES (
    sa_user_id,
    system_company_id,
    sa_name,
    sa_email,
    'superadmin',
    true
  );

  RAISE NOTICE 'Step 4 done: Superadmin profile created.';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '  SUPERADMIN SEEDED SUCCESSFULLY';
  RAISE NOTICE '  Email:    %', sa_email;
  RAISE NOTICE '  Password: %', sa_password;
  RAISE NOTICE '========================================';

END $$;
