-- Fix Feed Types Policies
DROP POLICY IF EXISTS "Users can view feed types in their hatchery" ON public.feed_types;
DROP POLICY IF EXISTS "Owners can insert feed types" ON public.feed_types;
DROP POLICY IF EXISTS "Owners can update feed types" ON public.feed_types;
DROP POLICY IF EXISTS "Owners can delete feed types" ON public.feed_types;

CREATE POLICY "Users can view feed types in their hatchery" 
ON public.feed_types FOR SELECT 
USING (public.is_hatchery_member(hatchery_id));

CREATE POLICY "Owners can insert feed types" 
ON public.feed_types FOR INSERT 
WITH CHECK (public.is_hatchery_owner(hatchery_id));

CREATE POLICY "Owners can update feed types" 
ON public.feed_types FOR UPDATE 
USING (public.is_hatchery_owner(hatchery_id));

CREATE POLICY "Owners can delete feed types" 
ON public.feed_types FOR DELETE 
USING (public.is_hatchery_owner(hatchery_id));

-- Fix Treatment Types Policies
DROP POLICY IF EXISTS "Users can view treatment types in their hatchery" ON public.treatment_types;
DROP POLICY IF EXISTS "Owners can insert treatment types" ON public.treatment_types;
DROP POLICY IF EXISTS "Owners can update treatment types" ON public.treatment_types;
DROP POLICY IF EXISTS "Owners can delete treatment types" ON public.treatment_types;

CREATE POLICY "Users can view treatment types in their hatchery" 
ON public.treatment_types FOR SELECT 
USING (public.is_hatchery_member(hatchery_id));

CREATE POLICY "Owners can insert treatment types" 
ON public.treatment_types FOR INSERT 
WITH CHECK (public.is_hatchery_owner(hatchery_id));

CREATE POLICY "Owners can update treatment types" 
ON public.treatment_types FOR UPDATE 
USING (public.is_hatchery_owner(hatchery_id));

CREATE POLICY "Owners can delete treatment types" 
ON public.treatment_types FOR DELETE 
USING (public.is_hatchery_owner(hatchery_id));
