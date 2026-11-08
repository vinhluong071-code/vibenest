-- Allow first-party images on 24-hour Stories using the same owner-scoped media bucket.
alter table public.vibe_stories
  add column if not exists image_path text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'vibe_stories_image_path_owner_prefix'
      and conrelid = 'public.vibe_stories'::regclass
  ) then
    alter table public.vibe_stories
      add constraint vibe_stories_image_path_owner_prefix
      check (
        image_path is null
        or (
          char_length(image_path) between 3 and 512
          and split_part(image_path, '/', 1) = author_id::text
          and split_part(image_path, '/', 2) <> ''
          and image_path !~ '(^/|//|\\|(^|/)\.\.?(/|$))'
        )
      );
  end if;
end;
$$;

grant select (image_path) on public.vibe_stories to anon, authenticated;
grant insert (image_path) on public.vibe_stories to authenticated;
