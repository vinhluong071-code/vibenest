-- ============================================================================
-- VIBENEST (OMNI.ID.VN) — PRODUCTION OAUTH 2.0, MEMORIES, SAFETY & RLS SCHEMA
-- Target Supabase Instance : https://vbuvkkheggkewnrpurqe.supabase.co
-- Android Package ID       : vn.id.omni.app
-- Compliance               : Apple Guideline 1.2, 4.8, 5.1.1(v), COPPA (13+)
-- Migration Guarantees     : 100% Idempotent (Safe for repeated executions)
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. KIỂM TRA AN TOÀN HÀM public.rls_auto_enable()
-- Dùng khối DO $$ ... END $$; để không bao giờ làm đứt chuỗi migration
-- nếu hàm public.rls_auto_enable() chưa từng được tạo trên môi trường đích.
-- ----------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'rls_auto_enable'
      and pg_get_function_identity_arguments(p.oid) = ''
  ) then
    execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated, service_role';
  end if;
end
$$;

-- ----------------------------------------------------------------------------
-- 2. SEQUENCE 8 CHỮ SỐ & BẢNG HỒ SƠ CÁ NHÂN OAUTH BÊN THỨ 3 (vibenest_profiles)
-- Tuyệt đối KHÔNG có cột số điện thoại, KHÔNG có cột password, KHÔNG có SMS OTP.
-- Tuân thủ Apple Guideline 4.8 & luật bảo vệ trẻ em COPPA (age >= 13).
-- ----------------------------------------------------------------------------
create sequence if not exists public.vibenest_uid_seq
  as bigint
  start with 10000000
  increment by 1
  minvalue 10000000
  no maxvalue
  cache 1;

create table if not exists public.vibenest_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  uid_8digit bigint unique not null default nextval('public.vibenest_uid_seq'),
  handle text unique not null check (
    char_length(handle) >= 3
    and char_length(handle) <= 32
    and handle ~ '^[a-z0-9._]+$'
  ),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 64),
  avatar_url text,
  cover_url text,
  bio text default '' check (char_length(bio) <= 300),
  birth_date date not null,
  age int not null check (age >= 13 and age <= 120),
  zodiac_sign text,
  zodiac_symbol text,
  oauth_provider text check (oauth_provider in ('apple', 'google', 'discord', 'tiktok')),
  vibe_score bigint not null default 100 check (vibe_score >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vibenest_profiles_handle_idx
  on public.vibenest_profiles (handle);

create index if not exists vibenest_profiles_uid_8digit_idx
  on public.vibenest_profiles (uid_8digit);

create or replace function public.touch_vibenest_profiles_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.touch_vibenest_profiles_updated_at() from public, anon, authenticated;

drop trigger if exists vibenest_profiles_touch_updated_at on public.vibenest_profiles;
create trigger vibenest_profiles_touch_updated_at
  before update on public.vibenest_profiles
  for each row execute function public.touch_vibenest_profiles_updated_at();

alter table public.vibenest_profiles enable row level security;

drop policy if exists "Public profiles are viewable by everyone" on public.vibenest_profiles;
create policy "Public profiles are viewable by everyone"
  on public.vibenest_profiles
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Users can insert their own OAuth profile" on public.vibenest_profiles;
create policy "Users can insert their own OAuth profile"
  on public.vibenest_profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = id and age >= 13);

drop policy if exists "Users can update their own OAuth profile" on public.vibenest_profiles;
create policy "Users can update their own OAuth profile"
  on public.vibenest_profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id and age >= 13);

drop policy if exists "Users can delete their own OAuth profile" on public.vibenest_profiles;
create policy "Users can delete their own OAuth profile"
  on public.vibenest_profiles
  for delete
  to authenticated
  using ((select auth.uid()) = id);

grant select on public.vibenest_profiles to anon, authenticated;
grant insert, update, delete on public.vibenest_profiles to authenticated;
grant usage, select on sequence public.vibenest_uid_seq to authenticated;

-- ----------------------------------------------------------------------------
-- 3. BẢNG KHO KỶ NIỆM PHOTOBOOTH 4 Ô (public.vibenest_memories)
-- Lưu trữ dải ảnh Life4Cuts tỉ lệ 1:4 từ VibeBoothStudio.
-- ----------------------------------------------------------------------------
create table if not exists public.vibenest_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.vibenest_profiles(id) on delete cascade,
  caption text default '' check (char_length(caption) <= 280),
  strip_url text not null check (char_length(btrim(strip_url)) > 0),
  frame_theme text not null default 'obsidian' check (
    frame_theme in ('indigo', 'purple', 'cyan', 'obsidian', 'rose-pastel')
  ),
  is_private boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists vibenest_memories_user_created_idx
  on public.vibenest_memories (user_id, created_at desc);

alter table public.vibenest_memories enable row level security;

drop policy if exists "Users read public memories or their own private strips" on public.vibenest_memories;
create policy "Users read public memories or their own private strips"
  on public.vibenest_memories
  for select
  to anon, authenticated
  using (
    is_private = false
    or (select auth.uid()) = user_id
  );

drop policy if exists "Users insert their own photobooth memories" on public.vibenest_memories;
create policy "Users insert their own photobooth memories"
  on public.vibenest_memories
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users update their own photobooth memories" on public.vibenest_memories;
create policy "Users update their own photobooth memories"
  on public.vibenest_memories
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete their own photobooth memories" on public.vibenest_memories;
create policy "Users delete their own photobooth memories"
  on public.vibenest_memories
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select on public.vibenest_memories to anon, authenticated;
grant insert, update, delete on public.vibenest_memories to authenticated;

-- ----------------------------------------------------------------------------
-- 4. BẢNG BÁO CÁO VI PHẠM & CHẶN NGƯỜI DÙNG CHUẨN APPLE GUIDELINE 1.2
-- ----------------------------------------------------------------------------
create table if not exists public.vibenest_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (char_length(btrim(reason)) between 3 and 1000),
  created_at timestamptz not null default now(),
  constraint vibenest_reports_no_self_report check (reporter_id <> target_user_id)
);

create index if not exists vibenest_reports_reporter_idx
  on public.vibenest_reports (reporter_id, created_at desc);

create index if not exists vibenest_reports_target_idx
  on public.vibenest_reports (target_user_id, created_at desc);

alter table public.vibenest_reports enable row level security;

drop policy if exists "Users view their own submitted reports" on public.vibenest_reports;
create policy "Users view their own submitted reports"
  on public.vibenest_reports
  for select
  to authenticated
  using ((select auth.uid()) = reporter_id);

drop policy if exists "Users submit abuse reports" on public.vibenest_reports;
create policy "Users submit abuse reports"
  on public.vibenest_reports
  for insert
  to authenticated
  with check (
    (select auth.uid()) = reporter_id
    and reporter_id <> target_user_id
  );

revoke all on public.vibenest_reports from anon;
grant select, insert on public.vibenest_reports to authenticated;

create table if not exists public.vibenest_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint vibenest_blocks_no_self_block check (blocker_id <> blocked_id),
  constraint vibenest_blocks_unique_pair unique (blocker_id, blocked_id)
);

create index if not exists vibenest_blocks_blocker_idx
  on public.vibenest_blocks (blocker_id);

create index if not exists vibenest_blocks_blocked_idx
  on public.vibenest_blocks (blocked_id);

alter table public.vibenest_blocks enable row level security;

drop policy if exists "Users read their own block list" on public.vibenest_blocks;
create policy "Users read their own block list"
  on public.vibenest_blocks
  for select
  to authenticated
  using ((select auth.uid()) = blocker_id);

drop policy if exists "Users block abusive accounts" on public.vibenest_blocks;
create policy "Users block abusive accounts"
  on public.vibenest_blocks
  for insert
  to authenticated
  with check (
    (select auth.uid()) = blocker_id
    and blocker_id <> blocked_id
  );

drop policy if exists "Users unblock accounts they previously blocked" on public.vibenest_blocks;
create policy "Users unblock accounts they previously blocked"
  on public.vibenest_blocks
  for delete
  to authenticated
  using ((select auth.uid()) = blocker_id);

revoke all on public.vibenest_blocks from anon;
grant select, insert, delete on public.vibenest_blocks to authenticated;

-- ----------------------------------------------------------------------------
-- 5. RPC BẢO MẬT HỘP THƯ & TIN NHẮN RIÊNG TƯ (KHÔNG LỘ AUTH UUID THÔ)
-- ----------------------------------------------------------------------------
create or replace function public.is_chat_room_member(p_room_id uuid)
returns boolean
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or p_room_id is null then
    return false;
  end if;

  return exists (
    select 1
    from public.chat_rooms r
    where r.id = p_room_id
      and (r.participant_a = v_uid or r.participant_b = v_uid)
      and not exists (
        select 1
        from public.vibenest_blocks b
        where (b.blocker_id = r.participant_a and b.blocked_id = r.participant_b)
           or (b.blocker_id = r.participant_b and b.blocked_id = r.participant_a)
      )
  );
end;
$$;

revoke all on function public.is_chat_room_member(uuid) from public, anon;
grant execute on function public.is_chat_room_member(uuid) to authenticated;

drop function if exists public.get_my_chat_inbox();
create or replace function public.get_my_chat_inbox()
returns table (
  room_id uuid,
  post_id uuid,
  peer_alias text,
  peer_display_name text,
  peer_handle text,
  peer_avatar_url text,
  last_message_content text,
  last_message_at timestamptz,
  unread_count bigint
)
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  return query
  select
    r.id as room_id,
    r.post_id,
    case
      when r.participant_a = v_uid then r.participant_b_alias
      else r.participant_a_alias
    end as peer_alias,
    coalesce(
      prof.display_name,
      case
        when r.participant_a = v_uid then r.participant_b_alias
        else r.participant_a_alias
      end
    ) as peer_display_name,
    coalesce(prof.handle, 'vibenest.soul') as peer_handle,
    prof.avatar_url as peer_avatar_url,
    latest_msg.content as last_message_content,
    coalesce(latest_msg.created_at, r.last_message_at) as last_message_at,
    coalesce(unread_agg.unread_total, 0::bigint) as unread_count
  from public.chat_rooms r
  left join public.vibenest_profiles prof
    on prof.id = (
      case
        when r.participant_a = v_uid then r.participant_b
        else r.participant_a
      end
    )
  left join lateral (
    select m.content, m.created_at
    from public.chat_messages m
    where m.room_id = r.id
    order by m.created_at desc
    limit 1
  ) latest_msg on true
  left join lateral (
    select count(*)::bigint as unread_total
    from public.chat_messages m
    where m.room_id = r.id
      and m.sender_id <> v_uid
      and m.read_at is null
  ) unread_agg on true
  where (r.participant_a = v_uid or r.participant_b = v_uid)
    and not exists (
      select 1
      from public.vibenest_blocks b
      where (b.blocker_id = r.participant_a and b.blocked_id = r.participant_b)
         or (b.blocker_id = r.participant_b and b.blocked_id = r.participant_a)
    )
  order by coalesce(latest_msg.created_at, r.last_message_at) desc;
end;
$$;

revoke all on function public.get_my_chat_inbox() from public, anon;
grant execute on function public.get_my_chat_inbox() to authenticated;

-- Củng cố RLS trên chat_rooms & chat_messages sử dụng is_chat_room_member()
alter table public.chat_rooms enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists "Chat participants read their rooms" on public.chat_rooms;
create policy "Chat participants read their rooms"
  on public.chat_rooms
  for select
  to authenticated
  using (public.is_chat_room_member(id));

drop policy if exists "Chat participants read messages" on public.chat_messages;
create policy "Chat participants read messages"
  on public.chat_messages
  for select
  to authenticated
  using (public.is_chat_room_member(room_id));

drop policy if exists "Chat participants send messages as themselves" on public.chat_messages;
create policy "Chat participants send messages as themselves"
  on public.chat_messages
  for insert
  to authenticated
  with check (
    (select auth.uid()) = sender_id
    and public.is_chat_room_member(room_id)
  );

-- ----------------------------------------------------------------------------
-- 6. RPC XÓA TÀI KHOẢN VĨNH VIỄN CHUẨN APPLE GUIDELINE 5.1.1(V) & GOOGLE PLAY
-- Xác thực chính chủ auth.uid() = target_user_id và xóa sạch toàn bộ dữ liệu
-- trong vibenest_memories, vibenest_reports, vibenest_blocks, vibenest_profiles
-- cùng bản ghi gốc trong bảng auth.users.
-- ----------------------------------------------------------------------------
drop function if exists public.delete_user_account(uuid);
create or replace function public.delete_user_account(
  target_user_id uuid default auth.uid()
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_uid uuid := auth.uid();
  v_effective_uid uuid := coalesce(target_user_id, auth.uid());
begin
  if v_caller_uid is null then
    raise exception 'Authentication required to delete account' using errcode = '28000';
  end if;

  if v_caller_uid <> v_effective_uid then
    raise exception 'Forbidden: You can only delete your own account' using errcode = '42501';
  end if;

  -- 1. Xóa toàn bộ dải ảnh Kho Kỷ Niệm Photobooth 4 ô
  delete from public.vibenest_memories
  where user_id = v_effective_uid;

  -- 2. Xóa lịch sử báo cáo và danh sách chặn liên quan tới người dùng
  delete from public.vibenest_reports
  where reporter_id = v_effective_uid
     or target_user_id = v_effective_uid;

  delete from public.vibenest_blocks
  where blocker_id = v_effective_uid
     or blocked_id = v_effective_uid;

  -- 3. Xóa hồ sơ OAuth cá nhân trong vibenest_profiles
  delete from public.vibenest_profiles
  where id = v_effective_uid;

  -- 4. Xóa vĩnh viễn tài khoản gốc trong auth.users (Cascade toàn bộ bảng phụ thuộc)
  delete from auth.users
  where id = v_effective_uid;

  return true;
end;
$$;

revoke all on function public.delete_user_account(uuid) from public, anon;
grant execute on function public.delete_user_account(uuid) to authenticated;

commit;
