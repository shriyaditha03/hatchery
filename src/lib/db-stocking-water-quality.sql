-- NEW TABLE: STOCKING WATER QUALITY
-- Stores full water quality parameters performed during stocking, separate from the general activity_logs.

create table if not exists public.stocking_water_quality (
  id uuid default uuid_generate_v4() primary key,
  activity_log_id uuid references public.activity_logs(id) on delete cascade,
  hatchery_id uuid references public.hatcheries(id),
  farm_id uuid references public.farms(id),
  section_id uuid references public.sections(id),
  tank_id uuid references public.tanks(id),
  user_id uuid references public.profiles(id),
  data jsonb not null default '{}'::jsonb,
  average_score numeric(4, 2),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ENABLE RLS
alter table public.stocking_water_quality enable row level security;

-- POLICIES (Mirroring activity_logs)
create policy "Manage Stocking Water Quality" on public.stocking_water_quality for all using (
  user_id = (select id from public.profiles where auth_user_id = auth.uid())
  OR 
  exists (
    select 1 from public.profiles 
    where profiles.id = stocking_water_quality.user_id 
    and public.is_hatchery_owner(profiles.hatchery_id)
  )
);
