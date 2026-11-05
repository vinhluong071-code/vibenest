-- VibeNest account recovery and email notification preferences.
-- Supabase Auth stores linked email/Google identities in auth.identities; no shadow account table is needed.
create table if not exists public.vibenest_email_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email_on_replies boolean not null default false,
  email_on_messages boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.vibenest_email_preferences enable row level security;
revoke all on public.vibenest_email_preferences from anon;
grant select, insert, update on public.vibenest_email_preferences to authenticated;
drop policy if exists "Users read own VibeNest email preferences" on public.vibenest_email_preferences;
create policy "Users read own VibeNest email preferences"
  on public.vibenest_email_preferences for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists "Users insert own VibeNest email preferences" on public.vibenest_email_preferences;
create policy "Users insert own VibeNest email preferences"
  on public.vibenest_email_preferences for insert to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists "Users update own VibeNest email preferences" on public.vibenest_email_preferences;
create policy "Users update own VibeNest email preferences"
  on public.vibenest_email_preferences for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create table if not exists public.vibenest_email_notification_queue (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('reply', 'message')),
  entity_id uuid not null,
  created_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'skipped', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  sent_at timestamptz,
  unique (event_type, entity_id)
);
create index if not exists vibenest_email_queue_pending_idx
  on public.vibenest_email_notification_queue (created_at)
  where status = 'pending';
alter table public.vibenest_email_notification_queue enable row level security;
revoke all on public.vibenest_email_notification_queue from anon, authenticated;

create or replace function public.vibenest_queue_reply_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.notification_type = 'reply'
     and exists (
       select 1 from public.vibenest_email_preferences p
       where p.user_id = new.recipient_id and p.email_on_replies = true
     ) then
    insert into public.vibenest_email_notification_queue (recipient_id, event_type, entity_id)
    values (new.recipient_id, 'reply', new.id)
    on conflict (event_type, entity_id) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function public.vibenest_queue_reply_email() from public, anon, authenticated;

create or replace function public.vibenest_queue_message_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recipient uuid;
begin
  select case
    when r.participant_a = new.sender_id then r.participant_b
    when r.participant_b = new.sender_id then r.participant_a
    else null
  end
  into v_recipient
  from public.chat_rooms r
  where r.id = new.room_id;

  if v_recipient is not null and exists (
    select 1 from public.vibenest_email_preferences p
    where p.user_id = v_recipient and p.email_on_messages = true
  ) then
    insert into public.vibenest_email_notification_queue (recipient_id, event_type, entity_id)
    values (v_recipient, 'message', new.id)
    on conflict (event_type, entity_id) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function public.vibenest_queue_message_email() from public, anon, authenticated;

drop trigger if exists vibenest_queue_reply_email_after_notification on public.notifications;
create trigger vibenest_queue_reply_email_after_notification
  after insert on public.notifications
  for each row execute function public.vibenest_queue_reply_email();
drop trigger if exists vibenest_queue_message_email_after_chat_message on public.chat_messages;
create trigger vibenest_queue_message_email_after_chat_message
  after insert on public.chat_messages
  for each row execute function public.vibenest_queue_message_email();
