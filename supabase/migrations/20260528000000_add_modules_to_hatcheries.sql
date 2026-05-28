-- Add modules column to public.hatcheries and configure explicit grants for the May 30, 2026 Supabase updates.

ALTER TABLE public.hatcheries 
ADD COLUMN IF NOT EXISTS modules text[] DEFAULT '{LRT,MATURATION}';

GRANT SELECT ON public.hatcheries TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hatcheries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hatcheries TO service_role;
