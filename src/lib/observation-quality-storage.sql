-- Create dedicated tables for Observation quality assessments
-- Mirrored from our Stocking quality system for architectural consistency

-- 1. Observation Animal Quality Table
CREATE TABLE IF NOT EXISTS public.observation_animal_quality (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_log_id UUID NOT NULL REFERENCES public.activity_logs(id) ON DELETE CASCADE,
    hatchery_id UUID REFERENCES public.hatcheries(id) ON DELETE CASCADE,
    farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
    section_id UUID REFERENCES public.sections(id) ON DELETE CASCADE,
    tank_id UUID REFERENCES public.tanks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ratings JSONB NOT NULL DEFAULT '{}',
    average_score NUMERIC(4,2),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Observation Water Quality Table
CREATE TABLE IF NOT EXISTS public.observation_water_quality (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_log_id UUID NOT NULL REFERENCES public.activity_logs(id) ON DELETE CASCADE,
    hatchery_id UUID REFERENCES public.hatcheries(id) ON DELETE CASCADE,
    farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
    section_id UUID REFERENCES public.sections(id) ON DELETE CASCADE,
    tank_id UUID REFERENCES public.tanks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    data JSONB NOT NULL DEFAULT '{}',
    average_score NUMERIC(4,2),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.observation_animal_quality ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.observation_water_quality ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies (Allow users to see quality data for their hatchery)
DROP POLICY IF EXISTS "Users can view observation animal quality for their hatchery" ON public.observation_animal_quality;
CREATE POLICY "Users can view observation animal quality for their hatchery" ON public.observation_animal_quality
FOR SELECT USING (
    hatchery_id IN (
        SELECT hatchery_id FROM public.profiles WHERE id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can insert observation animal quality for their hatchery" ON public.observation_animal_quality;
CREATE POLICY "Users can insert observation animal quality for their hatchery" ON public.observation_animal_quality
FOR INSERT WITH CHECK (
    hatchery_id IN (
        SELECT hatchery_id FROM public.profiles WHERE id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can view observation water quality for their hatchery" ON public.observation_water_quality;
CREATE POLICY "Users can view observation water quality for their hatchery" ON public.observation_water_quality
FOR SELECT USING (
    hatchery_id IN (
        SELECT hatchery_id FROM public.profiles WHERE id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can insert observation water quality for their hatchery" ON public.observation_water_quality;
CREATE POLICY "Users can insert observation water quality for their hatchery" ON public.observation_water_quality
FOR INSERT WITH CHECK (
    hatchery_id IN (
        SELECT hatchery_id FROM public.profiles WHERE id = auth.uid()
    )
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_obs_animal_log ON public.observation_animal_quality(activity_log_id);
CREATE INDEX IF NOT EXISTS idx_obs_water_log ON public.observation_water_quality(activity_log_id);
CREATE INDEX IF NOT EXISTS idx_obs_animal_hatchery ON public.observation_animal_quality(hatchery_id);
CREATE INDEX IF NOT EXISTS idx_obs_water_hatchery ON public.observation_water_quality(hatchery_id);
