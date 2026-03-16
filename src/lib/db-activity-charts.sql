-- Create table for scheduled activities (Instructions from Supervisors/Owners)
CREATE TABLE IF NOT EXISTS public.activity_charts (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  hatchery_id uuid REFERENCES public.hatcheries(id) ON DELETE CASCADE NOT NULL,
  farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE NOT NULL,
  section_id uuid REFERENCES public.sections(id) ON DELETE CASCADE,
  tank_id uuid REFERENCES public.tanks(id) ON DELETE CASCADE,
  activity_type text NOT NULL CHECK (activity_type IN ('Feed', 'Treatment', 'Water Quality', 'Animal Quality', 'Stocking', 'Observation')),
  scheduled_date date NOT NULL,
  scheduled_time time,
  planned_data jsonb NOT NULL, -- Stores type, quantity, unit, and specific instructions
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  is_completed boolean DEFAULT false,
  completed_at timestamp with time zone,
  completed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_activity_charts_lookup ON public.activity_charts (hatchery_id, farm_id, scheduled_date);

-- Enable RLS
ALTER TABLE public.activity_charts ENABLE ROW LEVEL SECURITY;

-- Migration to allow RLS policies
-- (Assuming standard hatchery-based access matches other tables)
DROP POLICY IF EXISTS "Users can view charts in their hatchery" ON public.activity_charts;
CREATE POLICY "Users can view charts in their hatchery" 
ON public.activity_charts FOR SELECT 
USING (hatchery_id IN (
  SELECT hatchery_id FROM public.profiles WHERE auth_user_id = auth.uid()
));

DROP POLICY IF EXISTS "Owners and Supervisors can manage charts" ON public.activity_charts;
CREATE POLICY "Owners and Supervisors can manage charts" 
ON public.activity_charts FOR ALL
USING (
  hatchery_id IN (
    SELECT hatchery_id FROM public.profiles 
    WHERE auth_user_id = auth.uid() 
    AND role IN ('owner', 'supervisor')
  )
);
