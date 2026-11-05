-- VibeNest anonymous 1:1 chat with private Supabase Realtime channels.
-- Run after enabling Anonymous Sign-Ins. No client can choose or read another user's Auth UUID.

create table if not exists public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.vibe_posts(id) on delete cascade,
  participant_a uuid not null references auth.users(id) on delete cascade,
  participant_b uuid not null references auth.users(id) on delete cascade,
  participant_a_alias text not null check (char_length(participant_a_alias) between 3 and 48),
  participant_b_alias text not null check (char_length(participant_b_alias) between 3 and 48),
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
drop function if exists public.start_vibenest_chat(uuid);
create or replace function public.start_vibenest_chat(p_post_id uuid, p_alias text)
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
  v_a uuid;
  v_b uuid;
  v_a_alias text;
  v_b_alias text;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_alias is null or char_length(p_alias) not between 3 and 48 then
    raise exception 'A valid anonymous display name is required' using errcode = '22023';
  end if;

  select p.user_id, p.alias
    into v_peer_id, v_peer_alias
  from public.vibe_posts p
  where p.id = p_post_id;

  if v_peer_id is null then
    raise exception 'Post not found' using errcode = 'P0002';
  end if;

  -- The author reopens the latest existing conversation for this post.
  -- Readers create (or reuse) their own independent 1:1 room with the author.
  if v_peer_id = v_user_id then
    select r.id,
      case when r.participant_a = v_user_id then r.participant_b_alias else r.participant_a_alias end
      into v_room_id, v_peer_alias
    from public.chat_rooms r
    where r.post_id = p_post_id
      and (r.participant_a = v_user_id or r.participant_b = v_user_id)
    order by r.last_message_at desc, r.created_at desc
    limit 1;

    if v_room_id is null then
      raise exception 'No conversation exists for this post yet' using errcode = 'P0002';
    end if;
    return query select v_room_id, v_peer_alias;
    return;
  end if;

  v_a := least(v_user_id, v_peer_id);
  v_b := greatest(v_user_id, v_peer_id);
  if v_user_id = v_a then
    v_a_alias := p_alias;
    v_b_alias := v_peer_alias;
  else
    v_a_alias := v_peer_alias;
    v_b_alias := p_alias;
  end if;

  insert into public.chat_rooms (
    post_id, participant_a, participant_b, participant_a_alias, participant_b_alias
  )
  values (p_post_id, v_a, v_b, v_a_alias, v_b_alias)
  on conflict (post_id, participant_a, participant_b) do nothing;

  select r.id,
    case when r.participant_a = v_user_id then r.participant_b_alias else r.participant_a_alias end
    into v_room_id, v_peer_alias
  from public.chat_rooms r
  where r.post_id = p_post_id
    and r.participant_a = v_a
    and r.participant_b = v_b;

  return query select v_room_id, v_peer_alias;
end;
$$;

revoke all on function public.start_vibenest_chat(uuid, text) from public, anon;
grant execute on function public.start_vibenest_chat(uuid, text) to authenticated;

-- Keep the author's "latest conversation" shortcut useful after each new message.
create or replace function public.touch_vibenest_chat_room()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.chat_rooms
  set last_message_at = new.created_at
  where id = new.room_id;
  return new;
end;
$$;
revoke all on function public.touch_vibenest_chat_room() from public, anon, authenticated;
drop trigger if exists chat_messages_touch_room on public.chat_messages;
create trigger chat_messages_touch_room
after insert on public.chat_messages
for each row execute function public.touch_vibenest_chat_room();

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
