-- Fix for Supervisor "Assign To" dropdown issue
-- Allows Supervisors to see who else has access to a farm so they can assign activities.

DROP POLICY IF EXISTS "Unified View Access" ON public.farm_access;
CREATE POLICY "Unified View Access" ON public.farm_access
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.farms f 
    WHERE f.id = farm_access.farm_id 
    AND (
      public.is_hatchery_owner(f.hatchery_id)
      OR
      (public.is_supervisor() AND f.hatchery_id = public.get_my_hatchery_id())
    )
  )
  OR
  user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
);
