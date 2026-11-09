-- Additive social ecosystem features: Story Q&A prompt, Reddit-style voting/comments,
-- profile zodiac metadata and private Messenger message reactions.
-- Existing posts, replies, stories and chat messages are preserved.

alter table public.vibe_stories
  add column if not exists qa_question text
  check (qa_question is null or char_length(btrim(qa_question)) between 1 and 180);

grant select (qa_question) on public.vibe_stories to anon, authenticated;
grant insert (qa_question) on public.vibe_stories to authenticated;

alter table public.vibenest_profiles
  add column if not exists zodiac_sign text
    check (zodiac_sign is null or char_length(zodiac_sign) <= 24),
  add column if not exists zodiac_symbol text
    check (zodiac_symbol is null or char_length(zodiac_symbol) <= 8);

create table if not exists public.vibenest_post_votes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.vibe_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  vote smallint not null check (vote in (-1, 1)),
  created_at timestamptz not null default now(),
  constraint vibenest_post_votes_one_per_user unique (post_id, user_id)
);
create index if not exists vibenest_post_votes_post_idx
  on public.vibenest_post_votes(post_id, vote);
alter table public.vibenest_post_votes enable row level security;
drop policy if exists "Users read own VibeNest votes" on public.vibenest_post_votes;
create policy "Users read own VibeNest votes" on public.vibenest_post_votes
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "Users create own VibeNest votes" on public.vibenest_post_votes;
create policy "Users create own VibeNest votes" on public.vibenest_post_votes
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "Users update own VibeNest votes" on public.vibenest_post_votes;
create policy "Users update own VibeNest votes" on public.vibenest_post_votes
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
drop policy if exists "Users delete own VibeNest votes" on public.vibenest_post_votes;
create policy "Users delete own VibeNest votes" on public.vibenest_post_votes
  for delete to authenticated using (user_id = (select auth.uid()));
revoke all on public.vibenest_post_votes from anon, authenticated;
grant select (post_id, user_id, vote) on public.vibenest_post_votes to authenticated;
grant insert (post_id, user_id, vote) on public.vibenest_post_votes to authenticated;
grant update (vote) on public.vibenest_post_votes to authenticated;
grant delete on public.vibenest_post_votes to authenticated;

create or replace function public.vibenest_get_post_score(p_post_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(v.vote), 0)::integer
  from public.vibenest_post_votes v
  where v.post_id = p_post_id;
$$;
revoke all on function public.vibenest_get_post_score(uuid) from public;
grant execute on function public.vibenest_get_post_score(uuid) to anon, authenticated;

create table if not exists public.vibenest_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.vibe_posts(id) on delete cascade,
  parent_comment_id uuid references public.vibenest_comments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  author_alias text not null check (char_length(btrim(author_alias)) between 1 and 48),
  content text not null check (char_length(btrim(content)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists vibenest_comments_post_created_idx
  on public.vibenest_comments(post_id, created_at);
create index if not exists vibenest_comments_parent_idx
  on public.vibenest_comments(parent_comment_id, created_at);
alter table public.vibenest_comments enable row level security;
drop policy if exists "Public read VibeNest comments" on public.vibenest_comments;
create policy "Public read VibeNest comments" on public.vibenest_comments
  for select to anon, authenticated using (true);
drop policy if exists "Users insert own VibeNest comments" on public.vibenest_comments;
create policy "Users insert own VibeNest comments" on public.vibenest_comments
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "Authors delete own VibeNest comments" on public.vibenest_comments;
create policy "Authors delete own VibeNest comments" on public.vibenest_comments
  for delete to authenticated using (user_id = (select auth.uid()));
revoke all on public.vibenest_comments from anon, authenticated;
grant select (id, post_id, parent_comment_id, author_alias, content, created_at)
  on public.vibenest_comments to anon, authenticated;
grant insert (post_id, parent_comment_id, user_id, author_alias, content)
  on public.vibenest_comments to authenticated;
grant delete on public.vibenest_comments to authenticated;

create or replace function public.vibenest_validate_comment_parent()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.parent_comment_id is not null and not exists (
    select 1 from public.vibenest_comments parent
    where parent.id = new.parent_comment_id and parent.post_id = new.post_id
  ) then
    raise exception 'Parent comment must belong to the same post.' using errcode = '23514';
  end if;
  return new;
end;
$$;
drop trigger if exists vibenest_comments_parent_guard on public.vibenest_comments;
create trigger vibenest_comments_parent_guard
  before insert or update of parent_comment_id, post_id on public.vibenest_comments
  for each row execute function public.vibenest_validate_comment_parent();

create table if not exists public.chat_message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.chat_messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null check (emoji in ('❤️', '😂', '😮', '😢', '😡', '🔥')),
  created_at timestamptz not null default now(),
  constraint chat_message_reactions_one_per_user unique (message_id, user_id)
);
create index if not exists chat_message_reactions_message_idx
  on public.chat_message_reactions(message_id);
alter table public.chat_message_reactions enable row level security;
drop policy if exists "Chat members read message reactions" on public.chat_message_reactions;
create policy "Chat members read message reactions" on public.chat_message_reactions
  for select to authenticated using (
    exists (
      select 1 from public.chat_messages m
      join public.chat_rooms r on r.id = m.room_id
      where m.id = message_id
        and ((select auth.uid()) = r.participant_a or (select auth.uid()) = r.participant_b)
    )
  );
drop policy if exists "Chat members add own message reactions" on public.chat_message_reactions;
create policy "Chat members add own message reactions" on public.chat_message_reactions
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.chat_messages m
      join public.chat_rooms r on r.id = m.room_id
      where m.id = message_id
        and ((select auth.uid()) = r.participant_a or (select auth.uid()) = r.participant_b)
    )
  );
drop policy if exists "Users change own message reactions" on public.chat_message_reactions;
create policy "Users change own message reactions" on public.chat_message_reactions
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
drop policy if exists "Users remove own message reactions" on public.chat_message_reactions;
create policy "Users remove own message reactions" on public.chat_message_reactions
  for delete to authenticated using (user_id = (select auth.uid()));
revoke all on public.chat_message_reactions from anon, authenticated;
grant select (message_id, user_id, emoji, created_at) on public.chat_message_reactions to authenticated;
grant insert (message_id, user_id, emoji) on public.chat_message_reactions to authenticated;
grant update (emoji) on public.chat_message_reactions to authenticated;
grant delete on public.chat_message_reactions to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public'
         and tablename = 'chat_message_reactions'
     ) then
    alter publication supabase_realtime add table public.chat_message_reactions;
  end if;
end
$$;
