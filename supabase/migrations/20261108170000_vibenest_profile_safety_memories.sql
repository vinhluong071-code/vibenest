-- Additive VibeNest profile, private memory and safety primitives.
create table if not exists public.vibenest_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  handle text not null unique check (handle ~ '^[a-z0-9._]{3,24}$'),
  bio text not null default '' check (char_length(bio) <= 180),
  avatar_url text,
  cover_url text,
  birthday date,
  instagram_url text,
  tiktok_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.vibenest_profiles enable row level security;
drop policy if exists "VibeNest public profiles readable" on public.vibenest_profiles;
create policy "VibeNest public profiles readable" on public.vibenest_profiles for select to anon, authenticated using (true);
drop policy if exists "VibeNest users insert own profile" on public.vibenest_profiles;
create policy "VibeNest users insert own profile" on public.vibenest_profiles for insert to authenticated with check (id = (select auth.uid()));
drop policy if exists "VibeNest users update own profile" on public.vibenest_profiles;
create policy "VibeNest users update own profile" on public.vibenest_profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
grant select on public.vibenest_profiles to anon, authenticated;
grant insert, update on public.vibenest_profiles to authenticated;

create table if not exists public.vibenest_memories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  media_url text not null,
  created_at timestamptz not null default now()
);
alter table public.vibenest_memories enable row level security;
drop policy if exists "Owners read own memories" on public.vibenest_memories;
create policy "Owners read own memories" on public.vibenest_memories for select to authenticated using (owner_id = (select auth.uid()));
drop policy if exists "Owners insert own memories" on public.vibenest_memories;
create policy "Owners insert own memories" on public.vibenest_memories for insert to authenticated with check (owner_id = (select auth.uid()));
drop policy if exists "Owners delete own memories" on public.vibenest_memories;
create policy "Owners delete own memories" on public.vibenest_memories for delete to authenticated using (owner_id = (select auth.uid()));
grant select, insert, delete on public.vibenest_memories to authenticated;

create table if not exists public.vibenest_safety_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid references auth.users(id) on delete set null,
  content_id text,
  reason text not null check (reason in ('harassment','nudity','violence','spam','self_harm','other')),
  details text not null default '' check (char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now()
);
alter table public.vibenest_safety_reports enable row level security;
drop policy if exists "Users create own safety reports" on public.vibenest_safety_reports;
create policy "Users create own safety reports" on public.vibenest_safety_reports for insert to authenticated with check (reporter_id = (select auth.uid()));
drop policy if exists "Users read own safety reports" on public.vibenest_safety_reports;
create policy "Users read own safety reports" on public.vibenest_safety_reports for select to authenticated using (reporter_id = (select auth.uid()));
grant insert, select on public.vibenest_safety_reports to authenticated;

create table if not exists public.vibenest_user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
alter table public.vibenest_user_blocks enable row level security;
drop policy if exists "Users manage their own blocks" on public.vibenest_user_blocks;
create policy "Users manage their own blocks" on public.vibenest_user_blocks for all to authenticated using (blocker_id = (select auth.uid())) with check (blocker_id = (select auth.uid()));
grant select, insert, update, delete on public.vibenest_user_blocks to authenticated;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('vibenest-profile-media','vibenest-profile-media',true,10485760,array['image/jpeg','image/png','image/webp']::text[])
on conflict (id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "VibeNest users upload own profile media" on storage.objects;
create policy "VibeNest users upload own profile media" on storage.objects for insert to authenticated with check (bucket_id='vibenest-profile-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "VibeNest users update own profile media" on storage.objects;
create policy "VibeNest users update own profile media" on storage.objects for update to authenticated using (bucket_id='vibenest-profile-media' and (storage.foldername(name))[1]=(select auth.uid())::text) with check (bucket_id='vibenest-profile-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "VibeNest users delete own profile media" on storage.objects;
create policy "VibeNest users delete own profile media" on storage.objects for delete to authenticated using (bucket_id='vibenest-profile-media' and (storage.foldername(name))[1]=(select auth.uid())::text);

-- Security-definer feed RPC filters accounts blocked by the current viewer without exposing Auth UUID columns.
create or replace function public.vibenest_get_feed_posts()
returns table (
  id uuid,
  alias text,
  mood text,
  content text,
  location text,
  image_path text,
  created_at timestamptz,
  empathy_count integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.alias, p.mood, p.content, p.location, p.image_path, p.created_at, p.empathy_count
  from public.vibe_posts p
  where not exists (
    select 1 from public.vibenest_user_blocks b
    where b.blocker_id = (select auth.uid()) and b.blocked_id = p.user_id
  )
  order by p.created_at desc
  limit 60;
$$;
revoke all on function public.vibenest_get_feed_posts() from public, anon, authenticated;
grant execute on function public.vibenest_get_feed_posts() to anon, authenticated;

create or replace function public.vibenest_enforce_minimum_profile_age()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.birthday is not null and new.birthday > (current_date - interval '13 years')::date then
    raise exception 'VibeNest requires users to be at least 13 years old.' using errcode = '23514';
  end if;
  return new;
end;
$$;
drop trigger if exists vibenest_profile_minimum_age on public.vibenest_profiles;
create trigger vibenest_profile_minimum_age
before insert or update of birthday on public.vibenest_profiles
for each row execute function public.vibenest_enforce_minimum_profile_age();
