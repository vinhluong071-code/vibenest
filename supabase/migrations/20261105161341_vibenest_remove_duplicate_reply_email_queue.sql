-- Restore a single reply-email enqueue path.
-- The existing AFTER INSERT trigger on public.notifications calls
-- public.vibenest_queue_reply_email(); do not enqueue again in this function.
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
  end if;

  return new;
end;
$function$;
