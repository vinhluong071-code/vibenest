-- Expose only the signed-in user's own inbox metadata. Participant UUIDs stay server-side.
create or replace function public.get_vibenest_inbox()
returns table (
  room_id uuid,
  post_id uuid,
  peer_alias text,
  last_message text,
  last_message_at timestamptz,
  unread_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    r.id,
    r.post_id,
    case when r.participant_a = auth.uid() then r.participant_b_alias else r.participant_a_alias end,
    coalesce(latest.content, ''),
    r.last_message_at,
    coalesce(unread.total, 0)
  from public.chat_rooms r
  left join lateral (
    select m.content from public.chat_messages m
    where m.room_id = r.id order by m.created_at desc limit 1
  ) latest on true
  left join lateral (
    select count(*) as total from public.chat_messages m
    where m.room_id = r.id and m.sender_id <> auth.uid() and m.read_at is null
  ) unread on true
  where auth.uid() in (r.participant_a, r.participant_b)
  order by r.last_message_at desc;
$$;
revoke all on function public.get_vibenest_inbox() from public, anon;
grant execute on function public.get_vibenest_inbox() to authenticated;
