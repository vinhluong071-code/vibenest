-- VibeNest 24-hour stories and warmth reactions.
-- Stories expire exactly 24 hours after creation; RLS and reads filter expired rows.

create table if not exists public.vibe_stories (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  alias text not null check (char_length(btrim(alias)) between 3 and 48),
  mood text not null check (char_length(btrim(mood)) between 1 and 40),
  location text check (location is null or char_length(location) <= 120),
  caption text check (caption is null or char_length(caption) <= 500),
  image_url text check (image_url is null or (char_length(image_url) <= 2048 and image_url ~ '^https://')),
  canvas_preset text not null default 'rose-dusk' check (char_length(canvas_preset) between 1 and 48),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  heart_count integer not null default 0 check (heart_count >= 0),
  warmth_count integer not null default 0 check (warmth_count >= 0),
  constraint vibe_stories_expiry_window check (
    expires_at > created_at and expires_at <= created_at + interval '24 hours'
  )
);

create table if not exists public.story_warmths (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.vibe_stories(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction_type text not null check (reaction_type in ('heart', 'warmth')),
  created_at timestamptz not null default now(),
  constraint story_warmths_one_reaction_per_user unique (story_id, user_id)
);

create index if not exists vibe_stories_active_expiry_idx on public.vibe_stories (expires_at, created_at desc);
create index if not exists vibe_stories_author_expiry_idx on public.vibe_stories (author_id, expires_at desc);
create index if not exists story_warmths_story_type_idx on public.story_warmths (story_id, reaction_type);
create index if not exists story_warmths_user_story_idx on public.story_warmths (user_id, story_id);

alter table public.vibe_stories enable row level security;
alter table public.story_warmths enable row level security;

drop policy if exists "Read active stories and own expired stories" on public.vibe_stories;
create policy "Read active stories and own expired stories" on public.vibe_stories
  for select to anon, authenticated using (expires_at > now() or author_id = (select auth.uid()));
drop policy if exists "Create own stories" on public.vibe_stories;
create policy "Create own stories" on public.vibe_stories
  for insert to authenticated with check ((select auth.uid()) = author_id);
drop policy if exists "Delete own stories" on public.vibe_stories;
create policy "Delete own stories" on public.vibe_stories
  for delete to authenticated using ((select auth.uid()) = author_id);

drop policy if exists "Read own story warmth" on public.story_warmths;
create policy "Read own story warmth" on public.story_warmths
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Add warmth to active stories" on public.story_warmths;
create policy "Add warmth to active stories" on public.story_warmths
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.vibe_stories s where s.id = story_id and s.expires_at > now())
  );
drop policy if exists "Change own warmth on active stories" on public.story_warmths;
create policy "Change own warmth on active stories" on public.story_warmths
  for update to authenticated
  using (
    (select auth.uid()) = user_id
    and exists (select 1 from public.vibe_stories s where s.id = story_id and s.expires_at > now())
  )
  with check ((select auth.uid()) = user_id);
drop policy if exists "Remove own story warmth" on public.story_warmths;
create policy "Remove own story warmth" on public.story_warmths
  for delete to authenticated using ((select auth.uid()) = user_id);

create or replace function public.sync_vibe_story_warmth_counts()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.reaction_type = 'heart' then
      update public.vibe_stories set heart_count = heart_count + 1 where id = new.story_id;
    else
      update public.vibe_stories set warmth_count = warmth_count + 1 where id = new.story_id;
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    if old.reaction_type = 'heart' then
      update public.vibe_stories set heart_count = greatest(0, heart_count - 1) where id = old.story_id;
    else
      update public.vibe_stories set warmth_count = greatest(0, warmth_count - 1) where id = old.story_id;
    end if;
    return old;
  elsif tg_op = 'UPDATE' and old.reaction_type is distinct from new.reaction_type then
    if old.reaction_type = 'heart' then
      update public.vibe_stories set heart_count = greatest(0, heart_count - 1) where id = old.story_id;
    else
      update public.vibe_stories set warmth_count = greatest(0, warmth_count - 1) where id = old.story_id;
    end if;
    if new.reaction_type = 'heart' then
      update public.vibe_stories set heart_count = heart_count + 1 where id = new.story_id;
    else
      update public.vibe_stories set warmth_count = warmth_count + 1 where id = new.story_id;
    end if;
    return new;
  end if;
  return coalesce(new, old);
end;
$$;
revoke all on function public.sync_vibe_story_warmth_counts() from public, anon, authenticated, service_role;
drop trigger if exists story_warmths_sync_counts on public.story_warmths;
create trigger story_warmths_sync_counts
  after insert or update of reaction_type or delete on public.story_warmths
  for each row execute function public.sync_vibe_story_warmth_counts();

revoke all on public.vibe_stories from anon, authenticated;
revoke all on public.story_warmths from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select (id, alias, mood, location, caption, image_url, canvas_preset, created_at, expires_at, heart_count, warmth_count)
  on public.vibe_stories to anon, authenticated;
grant insert (author_id, alias, mood, location, caption, image_url, canvas_preset)
  on public.vibe_stories to authenticated;
grant delete on public.vibe_stories to authenticated;
grant select (id, story_id, user_id, reaction_type, created_at) on public.story_warmths to authenticated;
grant insert (story_id, user_id, reaction_type) on public.story_warmths to authenticated;
grant update (reaction_type) on public.story_warmths to authenticated;
grant delete on public.story_warmths to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'vibe_stories') then
      alter publication supabase_realtime add table public.vibe_stories;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'story_warmths') then
      alter publication supabase_realtime add table public.story_warmths;
    end if;
  end if;
end;
$$;
