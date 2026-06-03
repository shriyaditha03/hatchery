-- Create public.genetic_line_types table
CREATE TABLE IF NOT EXISTS public.genetic_line_types (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    species text NOT NULL, -- 'Litopenaeus Vannamei (Vannamei)' or 'Penaeus Monodon (Tiger)'
    hatchery_id uuid REFERENCES public.hatcheries(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT unique_genetic_line_name_hatchery_species UNIQUE (name, hatchery_id, species)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.genetic_line_types ENABLE ROW LEVEL SECURITY;

-- Drop policy if exists and create new one to allow all actions for authenticated users
DROP POLICY IF EXISTS "Allow all actions for authenticated users" ON public.genetic_line_types;
CREATE POLICY "Allow all actions for authenticated users" ON public.genetic_line_types
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Grant privileges
GRANT SELECT ON public.genetic_line_types TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.genetic_line_types TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.genetic_line_types TO service_role;
