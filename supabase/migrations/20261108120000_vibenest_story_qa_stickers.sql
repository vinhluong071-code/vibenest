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
