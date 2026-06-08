-- ============================================================
-- ARISE CRM — SCHEMA PATCH: EMPLOYEE MANAGEMENT & ATTENDANCE
-- ============================================================
-- Run this in your Supabase SQL Editor.
-- ============================================================

-- 1. Add title column to users for custom job titles
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS title TEXT;

-- 2. Create attendance tracking table
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'leave')),
  check_in TIMESTAMP WITH TIME ZONE,
  check_out TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, date)
);

-- Enable RLS on attendance
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Configure RLS Policies for attendance
DROP POLICY IF EXISTS "attendance_all" ON public.attendance;
CREATE POLICY "attendance_all" ON public.attendance
  FOR ALL
  USING (
    company_id = get_current_user_company_id()
    OR (is_current_user_superadmin() AND has_superadmin_access(company_id))
  );

-- 3. Create employment events table (promotions, position changes, increments, bonuses)
CREATE TABLE IF NOT EXISTS public.employment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('promotion', 'position_change', 'increment', 'bonus', 'hired')),
  details TEXT NOT NULL,
  effective_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS on employment_events
ALTER TABLE public.employment_events ENABLE ROW LEVEL SECURITY;

-- Configure RLS Policies for employment_events
DROP POLICY IF EXISTS "employment_events_all" ON public.employment_events;
CREATE POLICY "employment_events_all" ON public.employment_events
  FOR ALL
  USING (
    company_id = get_current_user_company_id()
    OR (is_current_user_superadmin() AND has_superadmin_access(company_id))
  );
