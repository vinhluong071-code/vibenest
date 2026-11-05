-- VibeNest social core: anonymous-authenticated posts, empathy/saves, and replies.
-- Run only after enabling Anonymous Sign-Ins in Supabase Auth settings.
create table if not exists public.vibe_posts (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 alias text not null check (char_length(alias) between 3 and 48),
 mood text not null check (mood in ('Đêm muộn','Chênh vênh','Chữa lành','Thầm thương','Khác')),
 content text not null check (char_length(btrim(content)) between 1 and 2000),
 location text check (location is null or char_length(location) <= 80),
 empathy_count integer not null default 0 check (empathy_count >= 0),
 created_at timestamptz not null default now()
);
create table if not exists public.vibe_post_interactions (
 id uuid primary key default gen_random_uuid(),
 post_id uuid not null references public.vibe_posts(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 action_type text not null check (action_type in ('empathy','save')),
 created_at timestamptz not null default now(),
 constraint vibe_post_interactions_unique unique (post_id,user_id,action_type)
);
create table if not exists public.vibe_replies (
 id uuid primary key default gen_random_uuid(),
 post_id uuid not null references public.vibe_posts(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 author_alias text not null check (char_length(author_alias) between 3 and 48),
 content text not null check (char_length(btrim(content)) between 1 and 240),
 created_at timestamptz not null default now()
);
create index if not exists vibe_posts_created_at_idx on public.vibe_posts(created_at desc);
create index if not exists vibe_interactions_post_idx on public.vibe_post_interactions(post_id,action_type);
create index if not exists vibe_interactions_user_idx on public.vibe_post_interactions(user_id,post_id);
create index if not exists vibe_replies_post_created_idx on public.vibe_replies(post_id,created_at);
alter table public.vibe_posts enable row level security;
alter table public.vibe_post_interactions enable row level security;
alter table public.vibe_replies enable row level security;
drop policy if exists "Public can read vibe posts" on public.vibe_posts;
create policy "Public can read vibe posts" on public.vibe_posts for select to anon, authenticated using (true);
drop policy if exists "Users create their own vibe posts" on public.vibe_posts;
create policy "Users create their own vibe posts" on public.vibe_posts for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Owners delete their own vibe posts" on public.vibe_posts;
create policy "Owners delete their own vibe posts" on public.vibe_posts for delete to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users read their own interactions" on public.vibe_post_interactions;
create policy "Users read their own interactions" on public.vibe_post_interactions for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users create their own interactions" on public.vibe_post_interactions;
create policy "Users create their own interactions" on public.vibe_post_interactions for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users remove their own interactions" on public.vibe_post_interactions;
create policy "Users remove their own interactions" on public.vibe_post_interactions for delete to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Public can read vibe replies" on public.vibe_replies;
create policy "Public can read vibe replies" on public.vibe_replies for select to anon, authenticated using (true);
drop policy if exists "Users create their own replies" on public.vibe_replies;
create policy "Users create their own replies" on public.vibe_replies for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Authors delete their own replies" on public.vibe_replies;
create policy "Authors delete their own replies" on public.vibe_replies for delete to authenticated using ((select auth.uid()) = user_id);
-- Public-facing column grants deliberately omit internal Auth UUIDs.
revoke all on public.vibe_posts from anon, authenticated;
grant select (id,alias,mood,content,location,empathy_count,created_at) on public.vibe_posts to anon, authenticated;
grant insert (user_id,alias,mood,content,location) on public.vibe_posts to authenticated;
revoke all on public.vibe_post_interactions from anon, authenticated;
grant select (post_id,action_type,created_at) on public.vibe_post_interactions to authenticated;
grant insert (post_id,user_id,action_type) on public.vibe_post_interactions to authenticated;
grant delete on public.vibe_post_interactions to authenticated;
revoke all on public.vibe_replies from anon, authenticated;
grant select (id,post_id,author_alias,content,created_at) on public.vibe_replies to anon, authenticated;
grant insert (post_id,user_id,author_alias,content) on public.vibe_replies to authenticated;
grant delete on public.vibe_replies to authenticated;
-- The trigger can update only the denormalized counter; clients cannot update posts.
create or replace function public.maintain_vibe_empathy_count()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
 if tg_op = 'INSERT' and new.action_type = 'empathy' then
  update public.vibe_posts set empathy_count = empathy_count + 1 where id = new.post_id;
  return new;
 elsif tg_op = 'DELETE' and old.action_type = 'empathy' then
  update public.vibe_posts set empathy_count = greatest(0, empathy_count - 1) where id = old.post_id;
  return old;
 end if;
 return null;
end;
$$;
revoke all on function public.maintain_vibe_empathy_count() from public, anon, authenticated;
drop trigger if exists vibe_interaction_empathy_count on public.vibe_post_interactions;
create trigger vibe_interaction_empathy_count after insert or delete on public.vibe_post_interactions
for each row execute function public.maintain_vibe_empathy_count();
grant usage on schema public to anon, authenticated;
