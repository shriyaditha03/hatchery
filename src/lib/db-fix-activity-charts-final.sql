-- ================================================================
-- FIX 1: Update activity_type CHECK constraint to include all
--         Maturation activity types (Sourcing & Mating, etc.)
-- ================================================================
DO $$
DECLARE
    constraint_name_var TEXT;
BEGIN
    -- Find and drop any existing CHECK constraint on activity_type
    SELECT tc.constraint_name INTO constraint_name_var
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
    WHERE tc.table_name = 'activity_charts'
      AND tc.constraint_type = 'CHECK'
      AND ccu.column_name = 'activity_type'
    LIMIT 1;

    IF constraint_name_var IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.activity_charts DROP CONSTRAINT ' || constraint_name_var;
    END IF;

    ALTER TABLE public.activity_charts DROP CONSTRAINT IF EXISTS activity_charts_activity_type_check;

    -- Re-add with ALL activity types (LRT + Maturation)
    ALTER TABLE public.activity_charts
    ADD CONSTRAINT activity_charts_activity_type_check
    CHECK (activity_type IN (
        'Feed', 'Treatment', 'Water Quality', 'Animal Quality',
        'Stocking', 'Observation', 'Artemia', 'Algae', 'Harvest',
        'Tank Shifting',
        'Sourcing & Mating', 'Spawning', 'Egg Count',
        'Nauplii Harvest', 'Nauplii Sale'
    ));
END $$;

-- ================================================================
-- FIX 2: Ensure supervisors can INSERT into activity_charts
--         (The existing policy should cover it, but re-apply cleanly)
-- ================================================================
DROP POLICY IF EXISTS "Owners and Supervisors can manage charts" ON public.activity_charts;
CREATE POLICY "Owners and Supervisors can manage charts"
ON public.activity_charts FOR ALL
USING (
  hatchery_id IN (
    SELECT hatchery_id FROM public.profiles
    WHERE auth_user_id = auth.uid()
    AND role IN ('owner', 'supervisor')
  )
)
WITH CHECK (
  hatchery_id IN (
    SELECT hatchery_id FROM public.profiles
    WHERE auth_user_id = auth.uid()
    AND role IN ('owner', 'supervisor')
  )
);
