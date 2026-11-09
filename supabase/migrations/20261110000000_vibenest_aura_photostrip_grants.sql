-- Sprint 3: grant authenticated room members access to photostrip media columns.
-- Existing chat_messages RLS membership policies remain the authorization boundary.
grant select (id, room_id, sender_id, sender_alias, content, created_at, read_at, media_url, message_type) on public.chat_messages to authenticated;
grant insert (room_id, sender_id, sender_alias, content, media_url, message_type) on public.chat_messages to authenticated;
