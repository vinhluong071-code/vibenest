-- Enable Postgres Changes for the real VibeNest feed.
-- Idempotent and additive: no rows, policies, or existing publications are removed.
do $$
declare
  table_name text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    raise notice 'supabase_realtime publication is not available; feed subscriptions will remain inactive until enabled.';
    return;
  end if;

  foreach table_name in array array['vibe_posts', 'vibe_post_interactions', 'vibe_replies'] loop
    if to_regclass(format('public.%I', table_name)) is not null
      and not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = table_name
      ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end;
$$;
