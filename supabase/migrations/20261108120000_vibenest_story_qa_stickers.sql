-- Anonymous-to-the-story-owner Q&A submissions.
-- Sender IDs are retained only for abuse prevention and are never granted to readers.
create table if not exists public.vibe_story_questions (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.vibe_stories(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  question text not null check (char_length(btrim(question)) between 1 and 500),
  created_at timestamptz not null default now(),
  constraint vibe_story_questions_one_per_sender unique (story_id, sender_id)
);
create index if not exists vibe_story_questions_story_created_idx
  on public.vibe_story_questions (story_id, created_at desc);
alter table public.vibe_story_questions enable row level security;
drop policy if exists "Story owners read anonymous questions" on public.vibe_story_questions;
create policy "Story owners read anonymous questions" on public.vibe_story_questions
  for select to authenticated using (
    exists (select 1 from public.vibe_stories s where s.id = story_id and s.author_id = (select auth.uid()))
  );
drop policy if exists "Authenticated users ask active story owners" on public.vibe_story_questions;
create policy "Authenticated users ask active story owners" on public.vibe_story_questions
  for insert to authenticated with check (
    (select auth.uid()) = sender_id
    and exists (
      select 1 from public.vibe_stories s
      where s.id = story_id and s.expires_at > now() and s.author_id <> (select auth.uid())
    )
  );
revoke all on public.vibe_story_questions from anon, authenticated;
grant select (id, story_id, question, created_at) on public.vibe_story_questions to authenticated;
grant insert (story_id, sender_id, question) on public.vibe_story_questions to authenticated;

-- Anonymous poll votes expose aggregate choices only; voter identities are never selectable.
create table if not exists public.vibe_story_poll_votes (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.vibe_stories(id) on delete cascade,
  voter_id uuid not null references auth.users(id) on delete cascade,
  option_index smallint not null check (option_index in (0, 1)),
  created_at timestamptz not null default now(),
  constraint vibe_story_poll_one_vote_per_user unique (story_id, voter_id)
);
create index if not exists vibe_story_poll_votes_story_idx on public.vibe_story_poll_votes (story_id, option_index);
alter table public.vibe_story_poll_votes enable row level security;
drop policy if exists "Read active story poll totals" on public.vibe_story_poll_votes;
create policy "Read active story poll totals" on public.vibe_story_poll_votes
  for select to authenticated using (
    exists (select 1 from public.vibe_stories s where s.id = story_id and s.expires_at > now())
  );
drop policy if exists "Vote once on active story polls" on public.vibe_story_poll_votes;
create policy "Vote once on active story polls" on public.vibe_story_poll_votes
  for insert to authenticated with check (
    (select auth.uid()) = voter_id
    and exists (
      select 1 from public.vibe_stories s
      where s.id = story_id and s.expires_at > now() and s.author_id <> (select auth.uid())
    )
  );
revoke all on public.vibe_story_poll_votes from anon, authenticated;
grant select (story_id, option_index) on public.vibe_story_poll_votes to authenticated;
grant insert (story_id, voter_id, option_index) on public.vibe_story_poll_votes to authenticated;
