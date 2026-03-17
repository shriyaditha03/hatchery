-- Robust migration to update activity_charts check constraint
-- This script handles cases where the constraint name might differ

DO $$ 
DECLARE 
    constraint_name_var TEXT;
BEGIN
    -- Find the check constraint name for activity_type in activity_charts table
    SELECT tc.constraint_name INTO constraint_name_var
    FROM information_schema.table_constraints AS tc 
    JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
    WHERE tc.table_name = 'activity_charts' 
      AND tc.constraint_type = 'CHECK'
      AND ccu.column_name = 'activity_type'
    LIMIT 1;

    -- Drop it if found
    IF constraint_name_var IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.activity_charts DROP CONSTRAINT ' || constraint_name_var;
    END IF;

    -- Also try dropping it by the common conventional name just in case
    ALTER TABLE public.activity_charts DROP CONSTRAINT IF EXISTS activity_charts_activity_type_check;

    -- Add the updated constraint
    ALTER TABLE public.activity_charts 
    ADD CONSTRAINT activity_charts_activity_type_check 
    CHECK (activity_type IN ('Feed', 'Treatment', 'Water Quality', 'Animal Quality', 'Stocking', 'Observation', 'Artemia', 'Algae'));

END $$;
