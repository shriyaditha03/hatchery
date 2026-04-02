-- Migration to support modular types (LRT vs Maturation)

-- 1. Add section_category column with default 'LRT'
ALTER TABLE public.feed_types ADD COLUMN IF NOT EXISTS section_category TEXT DEFAULT 'LRT';
ALTER TABLE public.treatment_types ADD COLUMN IF NOT EXISTS section_category TEXT DEFAULT 'LRT';

-- 2. Update existing records to 'LRT' (optional, as default is 'LRT')
UPDATE public.feed_types SET section_category = 'LRT' WHERE section_category IS NULL;
UPDATE public.treatment_types SET section_category = 'LRT' WHERE section_category IS NULL;

-- 3. Update unique constraints to include section_category
-- Drop existing constraints if they exist
ALTER TABLE public.feed_types DROP CONSTRAINT IF EXISTS feed_types_name_hatchery_id_key;
ALTER TABLE public.feed_types ADD CONSTRAINT feed_types_name_hatchery_id_section_category_key UNIQUE (name, hatchery_id, section_category);

ALTER TABLE public.treatment_types DROP CONSTRAINT IF EXISTS treatment_types_name_hatchery_id_key;
ALTER TABLE public.treatment_types ADD CONSTRAINT treatment_types_name_hatchery_id_section_category_key UNIQUE (name, hatchery_id, section_category);

-- 4. Ensure RLS policies still work (they use hatchery_id which is unchanged)
