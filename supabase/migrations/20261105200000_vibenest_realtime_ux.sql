-- VibeNest realtime UX: private typing, recipient-only read receipts, and owner notifications.
-- Additive migration: preserves all existing posts, rooms, and messages.

alter table public.chat_messages
  add column if not exists read_at timestamptz;

create index if not exists chat_messages_unread_recipient_idx
  on public.chat_messages(room_id, read_at)
  where read_at is null;

drop policy if exists "Chat recipients mark messages read" on public.chat_messages;
create policy "Chat recipients mark messages read"
on public.chat_messages for update to authenticated
using (
  read_at is null
  and sender_id <> (select auth.uid())
  and exists (
    select 1 from public.chat_rooms r
    where r.id = chat_messages.room_id
      and ((select auth.uid()) = r.participant_a or (select auth.uid()) = r.participant_b)
  )
)
with check (
  read_at is not null
  and sender_id <> (select auth.uid())
  and exists (
    select 1 from public.chat_rooms r
    where r.id = chat_messages.room_id
      and ((select auth.uid()) = r.participant_a or (select auth.uid()) = r.participant_b)
  )
);
grant update (read_at) on public.chat_messages to authenticated;

-- Ephemeral typing broadcasts are allowed only on a valid room topic by its two members.
drop policy if exists "Room participants send private chat events" on realtime.messages;
create policy "Room participants send private chat events"
on realtime.messages for insert to authenticated
with check (
  case
    when realtime.topic() ~ '^vibenest-chat:[0-9a-fA-F-]{36}$' then exists (
      select 1 from public.chat_rooms r
      where r.id = split_part(realtime.topic(), ':', 2)::uuid
        and ((select auth.uid()) = r.participant_a or (select auth.uid()) = r.participant_b)
    )
    else false
  end
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  notification_type text not null check (notification_type in ('empathy', 'reply')),
  actor_alias text not null check (char_length(actor_alias) between 1 and 48),
  post_id uuid not null references public.vibe_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists notifications_recipient_unread_idx
  on public.notifications(recipient_id, created_at desc)
  where read_at is null;

alter table public.notifications enable row level security;
drop policy if exists "Users read their own notifications" on public.notifications;
create policy "Users read their own notifications"
on public.notifications for select to authenticated
using ((select auth.uid()) = recipient_id);

drop policy if exists "Users mark their own notifications read" on public.notifications;
create policy "Users mark their own notifications read"
on public.notifications for update to authenticated
using ((select auth.uid()) = recipient_id and read_at is null)
with check ((select auth.uid()) = recipient_id and read_at is not null);

revoke all on public.notifications from anon, authenticated;
grant select (id, recipient_id, notification_type, actor_alias, post_id, created_at, read_at)
  on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

create or replace function public.notify_vibenest_post_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid;
  v_actor_alias text;
  v_type text;
begin
  if tg_table_name = 'vibe_post_interactions' then
    if new.action_type <> 'empathy' then
      return new;
    end if;
    v_type := 'empathy';
    v_actor_alias := 'Một người';
  else
    v_type := 'reply';
    v_actor_alias := new.author_alias;
  end if;

  select p.user_id into v_owner_id
  from public.vibe_posts p
  where p.id = new.post_id;

  if v_owner_id is not null and v_owner_id <> new.user_id then
    insert into public.notifications(recipient_id, notification_type, actor_alias, post_id)
    values (v_owner_id, v_type, v_actor_alias, new.post_id);
  end if;
  return new;
end;
$$;

revoke all on function public.notify_vibenest_post_owner() from public, anon, authenticated;
drop trigger if exists vibe_interaction_owner_notification on public.vibe_post_interactions;
create trigger vibe_interaction_owner_notification
after insert on public.vibe_post_interactions
for each row execute function public.notify_vibenest_post_owner();

drop trigger if exists vibe_reply_owner_notification on public.vibe_replies;
create trigger vibe_reply_owner_notification
after insert on public.vibe_replies
for each row execute function public.notify_vibenest_post_owner();

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end
$$;
