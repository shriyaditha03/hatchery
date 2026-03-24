-- Add uniqueness constraints to prevent duplicate farm and section names

-- 1. Uniqueness for Farm names under the same hatchery
ALTER TABLE public.farms 
ADD CONSTRAINT farms_hatchery_id_name_key UNIQUE (hatchery_id, name);

-- 2. Uniqueness for Section names within the same farm
ALTER TABLE public.sections 
ADD CONSTRAINT sections_farm_id_name_key UNIQUE (farm_id, name);
