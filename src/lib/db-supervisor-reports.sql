-- Migration to allow Supervisors to see reports and profiles in their assigned areas

-- 1. Allow Supervisors to see profiles in the same hatchery
-- This ensures they can see names in reports
DROP POLICY IF EXISTS "Supervisor View Profiles" ON public.profiles;
CREATE POLICY "Supervisor View Profiles" ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.auth_user_id = auth.uid()
    AND p.role = 'supervisor'
    AND p.hatchery_id = public.profiles.hatchery_id
  )
);

-- 2. Allow Supervisors to see activity logs in their assigned areas
DROP POLICY IF EXISTS "Supervisor View Activity Logs" ON public.activity_logs;
CREATE POLICY "Supervisor View Activity Logs" ON public.activity_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.auth_user_id = auth.uid()
    AND p.role = 'supervisor'
    AND EXISTS (
      SELECT 1 FROM public.farm_access fa
      WHERE fa.user_id = p.id
      AND (
        fa.farm_id = activity_logs.farm_id AND fa.section_id IS NULL AND fa.tank_id IS NULL -- Whole Farm
        OR (activity_logs.section_id = fa.section_id AND fa.tank_id IS NULL) -- Specific Section
        OR (activity_logs.tank_id = fa.tank_id) -- Specific Tank
      )
    )
  )
);

-- 3. Allow Users (Workers/Supervisors) to see farms they have access to
DROP POLICY IF EXISTS "User View Farms" ON public.farms;
CREATE POLICY "User View Farms" ON public.farms
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.auth_user_id = auth.uid()
    AND (p.role = 'supervisor' OR p.role = 'worker')
    AND EXISTS (
      SELECT 1 FROM public.farm_access fa
      WHERE fa.user_id = p.id
      AND fa.farm_id = public.farms.id
    )
  )
);
