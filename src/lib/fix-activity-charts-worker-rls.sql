-- Give workers update rights to activity_charts so they can complete instructions
DROP POLICY IF EXISTS "Staff can mark instructions as complete" ON public.activity_charts;
CREATE POLICY "Staff can mark instructions as complete" 
ON public.activity_charts FOR UPDATE 
USING (
  hatchery_id IN (
    SELECT hatchery_id FROM public.profiles WHERE auth_user_id = auth.uid()
  )
)
WITH CHECK (
  hatchery_id IN (
    SELECT hatchery_id FROM public.profiles WHERE auth_user_id = auth.uid()
  )
);
