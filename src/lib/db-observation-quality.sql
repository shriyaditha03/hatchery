-- Create observation_animal_quality table
CREATE TABLE IF NOT EXISTS public.observation_animal_quality (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_log_id UUID NOT NULL REFERENCES public.activity_logs(id) ON DELETE CASCADE,
    hatchery_id UUID REFERENCES public.profiles(hatchery_id),
    farm_id UUID,
    section_id UUID,
    tank_id UUID,
    user_id UUID REFERENCES auth.users(id),
    ratings JSONB NOT NULL,
    average_score NUMERIC(4,2),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.observation_animal_quality ENABLE ROW LEVEL SECURITY;

-- Create Policies (Mirroring activity_logs)
CREATE POLICY "Allow select for own hatchery" ON public.observation_animal_quality
    FOR SELECT USING (
        hatchery_id IN (SELECT hatchery_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Allow insert for workspace members" ON public.observation_animal_quality
    FOR INSERT WITH CHECK (
        hatchery_id IN (SELECT hatchery_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Allow update for own records" ON public.observation_animal_quality
    FOR UPDATE USING (
        user_id = auth.uid()
    );

-- Repeat for Water Quality
CREATE TABLE IF NOT EXISTS public.observation_water_quality (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_log_id UUID NOT NULL REFERENCES public.activity_logs(id) ON DELETE CASCADE,
    hatchery_id UUID REFERENCES public.profiles(hatchery_id),
    farm_id UUID,
    section_id UUID,
    tank_id UUID,
    user_id UUID REFERENCES auth.users(id),
    data JSONB NOT NULL,
    average_score NUMERIC(4,2),
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.observation_water_quality ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select for water own hatchery" ON public.observation_water_quality
    FOR SELECT USING (
        hatchery_id IN (SELECT hatchery_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Allow insert for water workspace members" ON public.observation_water_quality
    FOR INSERT WITH CHECK (
        hatchery_id IN (SELECT hatchery_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Allow update for water own records" ON public.observation_water_quality
    FOR UPDATE USING (
        user_id = auth.uid()
    );
