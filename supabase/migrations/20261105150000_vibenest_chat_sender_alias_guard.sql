-- Harden VibeNest chat sender identity and add indexes for RLS/FK lookups.
-- The database derives sender_alias from the room; clients cannot impersonate the peer.

create or replace function public.set_vibenest_chat_sender_alias()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_alias text;
begin
  select case
    when new.sender_id = r.participant_a then r.participant_a_alias
    when new.sender_id = r.participant_b then r.participant_b_alias
    else null
  end
  into v_alias
  from public.chat_rooms r
  where r.id = new.room_id;

  if v_alias is null then
    raise exception 'Chat participant not found for this room'
      using errcode = '42501';
  end if;

  new.sender_alias := v_alias;
  return new;
end;
$$;

revoke all on function public.set_vibenest_chat_sender_alias() from public, anon, authenticated;

drop trigger if exists chat_messages_set_sender_alias on public.chat_messages;
create trigger chat_messages_set_sender_alias
before insert on public.chat_messages
for each row execute function public.set_vibenest_chat_sender_alias();

create index if not exists vibe_posts_user_id_idx
  on public.vibe_posts(user_id);
create index if not exists vibe_replies_user_id_idx
  on public.vibe_replies(user_id);
create index if not exists chat_messages_sender_id_idx
  on public.chat_messages(sender_id);
