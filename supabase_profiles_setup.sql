-- ============================================================
-- Uqoodi — profiles table setup / repair script
-- Run this in Supabase Dashboard → SQL Editor → New query
-- Safe to re-run (uses IF NOT EXISTS / OR REPLACE / drop-if-exists).
-- ============================================================

-- 1) Table, correctly linked to auth.users (id is both PK and FK)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  name        text,
  plan        text        not null default 'مجانية',
  tries_left  integer     not null default 3,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- If the table already existed without the FK/cascade, add it now.
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public' and table_name = 'profiles'
      and constraint_type = 'FOREIGN KEY'
  ) then
    alter table public.profiles
      add constraint profiles_id_fkey foreign key (id) references auth.users(id) on delete cascade;
  end if;
end $$;

-- 2) Enable Row Level Security
alter table public.profiles enable row level security;

-- 3) Policies — a user may only see/edit their own row.
--    (Drop-then-create so this script is idempotent.)
drop policy if exists "Profiles are viewable by owner" on public.profiles;
create policy "Profiles are viewable by owner"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Profiles are insertable by owner" on public.profiles;
create policy "Profiles are insertable by owner"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Profiles are updatable by owner" on public.profiles;
create policy "Profiles are updatable by owner"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 4) Auto-create a profile row the moment a new auth user is created.
--    This is the important part: it makes signup → profile creation
--    happen server-side (SECURITY DEFINER bypasses RLS), so it can never
--    silently fail because of a client-side timing issue or a missing
--    INSERT policy. The app.js upsert becomes a harmless no-op fallback.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, plan, tries_left)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'مجانية',
    3
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5) Keep updated_at fresh on every change.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- 6) One-off backfill: create profile rows for any existing auth users
--    that don't have one yet (e.g. users who signed up before this fix).
insert into public.profiles (id, email, name, plan, tries_left)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  'مجانية',
  3
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;
