-- Add assigned_to column to activity_charts for targeted instructions

ALTER TABLE public.activity_charts
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Optionally, we can add an index for faster queries on assignment filtering
CREATE INDEX IF NOT EXISTS idx_activity_charts_assigned_to ON public.activity_charts(assigned_to);

-- No RLS changes are strictly required since 'Users can view charts in their hatchery' 
-- already allows workers to SEE all charts. The frontend filters them by assigned_to.
