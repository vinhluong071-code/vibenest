-- Cover the notifications.post_id foreign key for post cleanup and lookup paths.
create index if not exists notifications_post_id_idx
  on public.notifications(post_id);
