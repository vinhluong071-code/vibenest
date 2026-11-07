-- Add first-party image media to public VibeNest feed posts.
-- Public reads are intentional: the VibeNest feed is public, while uploads are owner-scoped.
alter table public.vibe_posts
  add column if not exists image_path text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'vibe_posts_image_path_owner_prefix'
      and conrelid = 'public.vibe_posts'::regclass
  ) then
    alter table public.vibe_posts
      add constraint vibe_posts_image_path_owner_prefix
      check (
        image_path is null
        or (
          char_length(image_path) between 3 and 512
          and split_part(image_path, '/', 1) = user_id::text
          and split_part(image_path, '/', 2) <> ''
          and image_path !~ '(^/|//|\\|(^|/)\.\.?(/|$))'
        )
      );
  end if;
end;
$$;

grant select (image_path) on public.vibe_posts to anon, authenticated;
grant insert (image_path) on public.vibe_posts to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vibenest-post-media',
  'vibenest-post-media',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "VibeNest users upload own post media" on storage.objects;
create policy "VibeNest users upload own post media"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'vibenest-post-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "VibeNest users delete own post media" on storage.objects;
create policy "VibeNest users delete own post media"
on storage.objects for delete to authenticated
using (
  bucket_id = 'vibenest-post-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
