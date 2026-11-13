-- VibeNest Reels: persistent media records, likes and threaded comments.
-- Additive migration. Public media is readable; writes are owner-scoped by RLS.
create table if not exists public.vibenest_reels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  alias text not null check (char_length(btrim(alias)) between 3 and 48),
  video_url text not null check (char_length(video_url) <= 2048 and video_url ~ '^https://'),
  caption text not null default '' check (char_length(caption) <= 2200),
  audio_title text not null default 'Original audio' check (char_length(audio_title) <= 160),
  created_at timestamptz not null default now()
);
create index if not exists vibenest_reels_created_idx
  on public.vibenest_reels(created_at desc);
create index if not exists vibenest_reels_owner_created_idx
  on public.vibenest_reels(user_id, created_at desc);
alter table public.vibenest_reels enable row level security;
drop policy if exists "Anyone can read VibeNest reels" on public.vibenest_reels;
create policy "Anyone can read VibeNest reels" on public.vibenest_reels
  for select to anon, authenticated using (true);
drop policy if exists "Users create own VibeNest reels" on public.vibenest_reels;
create policy "Users create own VibeNest reels" on public.vibenest_reels
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "Owners delete own VibeNest reels" on public.vibenest_reels;
create policy "Owners delete own VibeNest reels" on public.vibenest_reels
  for delete to authenticated using (user_id = (select auth.uid()));
revoke all on public.vibenest_reels from anon, authenticated;
grant select (id, alias, video_url, caption, audio_title, created_at)
  on public.vibenest_reels to anon, authenticated;
grant insert (user_id, alias, video_url, caption, audio_title)
  on public.vibenest_reels to authenticated;
grant delete on public.vibenest_reels to authenticated;

create table if not exists public.vibenest_reel_likes (
  id uuid primary key default gen_random_uuid(),
  reel_id uuid not null references public.vibenest_reels(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint vibenest_reel_likes_one_per_user unique (reel_id, user_id)
);
create index if not exists vibenest_reel_likes_reel_idx
  on public.vibenest_reel_likes(reel_id);
alter table public.vibenest_reel_likes enable row level security;
drop policy if exists "Users read own VibeNest reel likes" on public.vibenest_reel_likes;
create policy "Users read own VibeNest reel likes" on public.vibenest_reel_likes
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "Users like VibeNest reels" on public.vibenest_reel_likes;
create policy "Users like VibeNest reels" on public.vibenest_reel_likes
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "Users unlike VibeNest reels" on public.vibenest_reel_likes;
create policy "Users unlike VibeNest reels" on public.vibenest_reel_likes
  for delete to authenticated using (user_id = (select auth.uid()));
revoke all on public.vibenest_reel_likes from anon, authenticated;
grant select (reel_id, user_id) on public.vibenest_reel_likes to authenticated;
grant insert (reel_id, user_id) on public.vibenest_reel_likes to authenticated;
grant delete on public.vibenest_reel_likes to authenticated;

create table if not exists public.vibenest_reel_comments (
  id uuid primary key default gen_random_uuid(),
  reel_id uuid not null references public.vibenest_reels(id) on delete cascade,
  parent_comment_id uuid references public.vibenest_reel_comments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  author_alias text not null check (char_length(btrim(author_alias)) between 1 and 48),
  content text not null check (char_length(btrim(content)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists vibenest_reel_comments_reel_created_idx
  on public.vibenest_reel_comments(reel_id, created_at);
create index if not exists vibenest_reel_comments_parent_idx
  on public.vibenest_reel_comments(parent_comment_id, created_at);
alter table public.vibenest_reel_comments enable row level security;
drop policy if exists "Public read VibeNest reel comments" on public.vibenest_reel_comments;
create policy "Public read VibeNest reel comments" on public.vibenest_reel_comments
  for select to anon, authenticated using (true);
drop policy if exists "Users create own VibeNest reel comments" on public.vibenest_reel_comments;
create policy "Users create own VibeNest reel comments" on public.vibenest_reel_comments
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "Authors delete own VibeNest reel comments" on public.vibenest_reel_comments;
create policy "Authors delete own VibeNest reel comments" on public.vibenest_reel_comments
  for delete to authenticated using (user_id = (select auth.uid()));
revoke all on public.vibenest_reel_comments from anon, authenticated;
grant select (id, reel_id, parent_comment_id, author_alias, content, created_at)
  on public.vibenest_reel_comments to anon, authenticated;
grant insert (reel_id, parent_comment_id, user_id, author_alias, content)
  on public.vibenest_reel_comments to authenticated;
grant delete on public.vibenest_reel_comments to authenticated;

create or replace function public.vibenest_validate_reel_comment_parent()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.parent_comment_id is not null and not exists (
    select 1 from public.vibenest_reel_comments parent
    where parent.id = new.parent_comment_id and parent.reel_id = new.reel_id
  ) then
    raise exception 'Parent comment must belong to the same reel.' using errcode = '23514';
  end if;
  return new;
end;
$$;
drop trigger if exists vibenest_reel_comments_parent_guard on public.vibenest_reel_comments;
create trigger vibenest_reel_comments_parent_guard
  before insert or update of parent_comment_id, reel_id on public.vibenest_reel_comments
  for each row execute function public.vibenest_validate_reel_comment_parent();

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'vibenest_reels') then
      alter publication supabase_realtime add table public.vibenest_reels;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'vibenest_reel_likes') then
      alter publication supabase_realtime add table public.vibenest_reel_likes;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'vibenest_reel_comments') then
      alter publication supabase_realtime add table public.vibenest_reel_comments;
    end if;
  end if;
end
$$;
