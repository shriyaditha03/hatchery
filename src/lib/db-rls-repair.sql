-- FINAL RLS REPAIR - NUKE CONFLICTS & FIX RECURSION
-- Run this in Supabase SQL Editor to restore login access.

-- 1. CLEANUP: Drop all potential conflicting policies
DROP POLICY IF EXISTS "Select Profiles" ON public.profiles;
DROP POLICY IF EXISTS "Supervisor View Profiles" ON public.profiles;
DROP POLICY IF EXISTS "Supervisor View Activity Logs" ON public.activity_logs;
DROP POLICY IF EXISTS "User View Farms" ON public.farms;
DROP POLICY IF EXISTS "View Own Access" ON public.farm_access;

-- 2. HELPER FUNCTIONS (Security Definer bypasses RLS recursion)
CREATE OR REPLACE FUNCTION public.is_supervisor()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE auth_user_id = auth.uid()
    AND role = 'supervisor'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_my_hatchery_id()
RETURNS uuid LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT hatchery_id FROM public.profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- 3. UNIFIED PROFILE POLICY
-- Allows: 1. Self, 2. Owner of same hatchery, 3. Supervisor of same hatchery
CREATE POLICY "Unified Select Profiles" ON public.profiles
FOR SELECT USING (
  auth_user_id = auth.uid() -- Safe check for self
  OR 
  public.is_hatchery_owner(hatchery_id) -- Safe check via owner helper
  OR 
  (public.is_supervisor() AND hatchery_id = public.get_my_hatchery_id()) -- Safe check via supervisor helpers
);

-- 4. UNIFIED FARM ACCESS POLICY
-- Allows: 1. Owner of farm, 2. Self (user seeing their own permissions)
CREATE POLICY "Unified View Access" ON public.farm_access
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.farms f 
    WHERE f.id = farm_access.farm_id 
    AND public.is_hatchery_owner(f.hatchery_id)
  )
  OR
  user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
);

-- 5. UNIFIED FARM VIEW POLICY
-- Allows: 1. Members of hatchery, 2. Assigned workers (redundant but safe)
CREATE POLICY "Unified Select Farms" ON public.farms
FOR SELECT USING (
  public.is_hatchery_member(hatchery_id)
);
