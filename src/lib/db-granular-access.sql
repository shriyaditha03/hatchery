-- Migration to support granular access (Section/Tank level)
ALTER TABLE public.farm_access ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES public.sections(id) ON DELETE CASCADE;
ALTER TABLE public.farm_access ADD COLUMN IF NOT EXISTS tank_id UUID REFERENCES public.tanks(id) ON DELETE CASCADE;

-- Update unique constraint to allow multiple records per user per farm if they are for specific sections or tanks
ALTER TABLE public.farm_access DROP CONSTRAINT IF EXISTS farm_access_user_id_farm_id_key;
ALTER TABLE public.farm_access DROP CONSTRAINT IF EXISTS farm_access_granular_unique;
ALTER TABLE public.farm_access ADD CONSTRAINT farm_access_granular_unique UNIQUE (user_id, farm_id, section_id, tank_id);

-- Update RLS policies to handle granular access
-- (Existing policies are Hatchery-wide or Farm-wide, but we need to ensure users can only see what's in farm_access)
-- This is complex because of current schema design but we can refine it.
