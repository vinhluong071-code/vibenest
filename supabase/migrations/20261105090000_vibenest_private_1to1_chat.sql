-- VibeNest anonymous 1:1 chat with private Supabase Realtime channels.
-- Run after enabling Anonymous Sign-Ins. No client can choose or read another user's Auth UUID.

create table if not exists public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.vibe_posts(id) on delete cascade,
  participant_a uuid not null references auth.users(id) on delete cascade,
  participant_b uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  constraint chat_rooms_distinct_participants check (participant_a <> participant_b),
  constraint chat_rooms_unique_post_pair unique (post_id, participant_a, participant_b)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  sender_alias text not null check (char_length(sender_alias) between 3 and 48),
  content text not null check (char_length(btrim(content)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists chat_rooms_participant_a_idx on public.chat_rooms(participant_a, last_message_at desc);
create index if not exists chat_rooms_participant_b_idx on public.chat_rooms(participant_b, last_message_at desc);
create index if not exists chat_messages_room_created_idx on public.chat_messages(room_id, created_at asc);

alter table public.chat_rooms enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists "Chat participants read their rooms" on public.chat_rooms;
create policy "Chat participants read their rooms"
on public.chat_rooms for select to authenticated
using ((select auth.uid()) = participant_a or (select auth.uid()) = participant_b);

drop policy if exists "Chat participants read messages" on public.chat_messages;
create policy "Chat participants read messages"
on public.chat_messages for select to authenticated
using (
  exists (
    select 1 from public.chat_rooms r
    where r.id = chat_messages.room_id
      and ((select auth.uid()) = r.participant_a or (select auth.uid()) = r.participant_b)
  )
);

drop policy if exists "Chat participants send messages as themselves" on public.chat_messages;
create policy "Chat participants send messages as themselves"
on public.chat_messages for insert to authenticated
with check (
  (select auth.uid()) = sender_id
  and exists (
    select 1 from public.chat_rooms r
    where r.id = chat_messages.room_id
      and ((select auth.uid()) = r.participant_a or (select auth.uid()) = r.participant_b)
  )
);

revoke all on public.chat_rooms from anon, authenticated;
grant select (id, post_id, created_at, last_message_at) on public.chat_rooms to authenticated;
revoke all on public.chat_messages from anon, authenticated;
grant select (id, room_id, sender_id, sender_alias, content, created_at) on public.chat_messages to authenticated;
grant insert (room_id, sender_id, sender_alias, content) on public.chat_messages to authenticated;

-- Resolve the post author inside the database; never expose their Auth UUID to the browser.
create or replace function public.start_vibenest_chat(p_post_id uuid)
returns table (room_id uuid, peer_alias text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_peer_id uuid;
  v_peer_alias text;
  v_room_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select p.user_id, p.alias
    into v_peer_id, v_peer_alias
  from public.vibe_posts p
  where p.id = p_post_id;

  if v_peer_id is null then
    raise exception 'Post not found' using errcode = 'P0002';
  end if;

  if v_peer_id = v_user_id then
    raise exception 'Cannot start a private chat with your own post' using errcode = '22023';
  end if;

  insert into public.chat_rooms (post_id, participant_a, participant_b)
  values (p_post_id, least(v_user_id, v_peer_id), greatest(v_user_id, v_peer_id))
  on conflict (post_id, participant_a, participant_b) do nothing;

  select r.id into v_room_id
  from public.chat_rooms r
  where r.post_id = p_post_id
    and r.participant_a = least(v_user_id, v_peer_id)
    and r.participant_b = greatest(v_user_id, v_peer_id);

  return query select v_room_id, v_peer_alias;
end;
$$;

revoke all on function public.start_vibenest_chat(uuid) from public, anon;
grant execute on function public.start_vibenest_chat(uuid) to authenticated;

-- Private channel topic format: vibenest-chat:<room UUID>.
-- Only the two room participants may join/read the channel.
drop policy if exists "Room participants receive private chat events" on realtime.messages;
create policy "Room participants receive private chat events"
on realtime.messages for select to authenticated
using (
  realtime.topic() ~ '^vibenest-chat:[0-9a-fA-F-]{36}$'
  and exists (
    select 1 from public.chat_rooms r
    where r.id = split_part(realtime.topic(), ':', 2)::uuid
      and ((select auth.uid()) = r.participant_a or (select auth.uid()) = r.participant_b)
  )
);

-- Ensure message inserts are streamed by Supabase Postgres Changes.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
end
$$;
