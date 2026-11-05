-- Queue reply emails only when the post owner explicitly opted in.
-- The notification worker rechecks email verification and preference before delivery.
CREATE OR REPLACE FUNCTION public.notify_vibenest_post_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
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

    if tg_table_name = 'vibe_replies' and exists (
      select 1
      from public.vibenest_email_preferences pref
      where pref.user_id = v_owner_id
        and pref.email_on_replies = true
    ) then
      insert into public.vibenest_email_notification_queue (recipient_id, event_type, entity_id)
      values (v_owner_id, 'reply', new.id)
      on conflict (event_type, entity_id) do nothing;
    end if;
  end if;

  return new;
end;
$function$;
