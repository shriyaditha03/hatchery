-- Feed Types Table
CREATE TABLE IF NOT EXISTS public.feed_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    hatchery_id UUID NOT NULL REFERENCES public.hatcheries(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(name, hatchery_id)
);

-- Treatment Types Table
CREATE TABLE IF NOT EXISTS public.treatment_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    hatchery_id UUID NOT NULL REFERENCES public.hatcheries(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(name, hatchery_id)
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_feed_types_modtime
    BEFORE UPDATE ON public.feed_types
    FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_treatment_types_modtime
    BEFORE UPDATE ON public.treatment_types
    FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- RLS Policies
ALTER TABLE public.feed_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view feed types in their hatchery" 
ON public.feed_types FOR SELECT 
USING (
  hatchery_id IN (
    SELECT hatchery_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Owners can insert feed types" 
ON public.feed_types FOR INSERT 
WITH CHECK (
  hatchery_id IN (
    SELECT hatchery_id FROM public.profiles WHERE id = auth.uid() AND role = 'owner'
  )
);

CREATE POLICY "Owners can update feed types" 
ON public.feed_types FOR UPDATE 
USING (
  hatchery_id IN (
    SELECT hatchery_id FROM public.profiles WHERE id = auth.uid() AND role = 'owner'
  )
);

CREATE POLICY "Owners can delete feed types" 
ON public.feed_types FOR DELETE 
USING (
  hatchery_id IN (
    SELECT hatchery_id FROM public.profiles WHERE id = auth.uid() AND role = 'owner'
  )
);

-- Treatment Types Policies
CREATE POLICY "Users can view treatment types in their hatchery" 
ON public.treatment_types FOR SELECT 
USING (
  hatchery_id IN (
    SELECT hatchery_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Owners can insert treatment types" 
ON public.treatment_types FOR INSERT 
WITH CHECK (
  hatchery_id IN (
    SELECT hatchery_id FROM public.profiles WHERE id = auth.uid() AND role = 'owner'
  )
);

CREATE POLICY "Owners can update treatment types" 
ON public.treatment_types FOR UPDATE 
USING (
  hatchery_id IN (
    SELECT hatchery_id FROM public.profiles WHERE id = auth.uid() AND role = 'owner'
  )
);

CREATE POLICY "Owners can delete treatment types" 
ON public.treatment_types FOR DELETE 
USING (
  hatchery_id IN (
    SELECT hatchery_id FROM public.profiles WHERE id = auth.uid() AND role = 'owner'
  )
);
