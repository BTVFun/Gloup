-- =============================================================
-- Gloup — Supabase Backend Full Rebuild (SQL-only runnable guide)
-- =============================================================
-- Notes (as SQL comments):
-- - This script is idempotent where possible (IF NOT EXISTS/exception guards).
-- - It rebuilds tables, enums, indexes, functions, triggers, RLS, storage buckets,
--   and realtime publication for the mobile app in this repo.
-- - Some settings (Auth providers, SMTP, Storage size limits) are NOT configurable by SQL;
--   set them in Supabase Dashboard > Auth/Storage. See comments near the end.

-- =====================
-- 1) Extensions
-- =====================
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- =====================
-- 2) Enums
-- =====================
do $$ begin
  create type reaction_type as enum ('couronne','vetements','sport','mental','confiance','soins');
exception when duplicate_object then null; end $$;

do $$ begin
  create type media_type as enum ('photo','video','none');
exception when duplicate_object then null; end $$;

do $$ begin
  create type privacy_level as enum ('public','followers','friends','private');
exception when duplicate_object then null; end $$;

do $$ begin
  create type group_role as enum ('admin','moderator','member');
exception when duplicate_object then null; end $$;

-- =====================
-- 3) Core Tables
-- =====================

-- 3.1 profiles (1–1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  full_name text,
  avatar_url text,
  bio text,
  glow_points integer not null default 0,
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3.2 posts
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text,
  media_url text,
  media_urls text[] not null default '{}',
  media_metadata jsonb not null default '{}'::jsonb,
  media_kind media_type not null default 'none',
  category reaction_type not null,
  privacy privacy_level not null default 'public',
  glow_points integer not null default 0,
  reply_count integer not null default 0,
  share_count integer not null default 0,
  view_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3.3 reactions (one user can react once per type per post)
create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind reaction_type not null,
  points smallint generated always as (
    case when kind = 'couronne' then 20 else 10 end
  ) stored,
  created_at timestamptz not null default now(),
  unique (post_id, user_id, kind)
);

-- 3.4 direct_messages (DMs)
create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (sender_id <> receiver_id)
);

-- 3.5 groups
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  image_url text,
  created_by uuid not null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 3.6 group_members
create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role group_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- 3.7 group_messages
create table if not exists public.group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

-- 3.8 follows (for future privacy/friends; handy now for growth features)
create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followee_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

-- =====================
-- 4) Indexes
-- =====================
create index if not exists idx_profiles_is_verified on public.profiles(is_verified);
create index if not exists idx_posts_author_created on public.posts(author_id, created_at desc);
create index if not exists idx_posts_category on public.posts(category);
create index if not exists idx_posts_glow_points on public.posts(glow_points desc);
create index if not exists idx_reactions_post on public.reactions(post_id);
create index if not exists idx_reactions_user on public.reactions(user_id);
create index if not exists idx_dm_convo on public.direct_messages(sender_id, receiver_id, created_at desc);
create index if not exists idx_dm_receiver_unread on public.direct_messages(receiver_id, read_at) where read_at is null;
create index if not exists idx_gmsg_group_time on public.group_messages(group_id, created_at desc);

-- =====================
-- 5) Utility functions and triggers
-- =====================

-- 5.1 updated_at handling
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_posts_updated_at on public.posts;
create trigger trg_posts_updated_at
before update on public.posts
for each row execute function public.set_updated_at();

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- 5.2 Recalculation helpers used by the app's admin utilities
create or replace function public.recalc_post_points(p_post_id uuid)
returns void language sql as $$
  update public.posts p
     set glow_points = coalesce((select sum(points) from public.reactions r where r.post_id = p.id), 0)
   where p.id = p_post_id;
$$;

create or replace function public.recalc_user_points(p_user_id uuid)
returns void language sql as $$
  update public.profiles pr
     set glow_points = coalesce((select sum(glow_points) from public.posts where author_id = pr.id), 0)
   where pr.id = p_user_id;
$$;

-- 5.3 Maintain points on reaction changes (insert/update/delete)
create or replace function public.after_reaction_change()
returns trigger language plpgsql as $$
declare v_post uuid; v_author uuid;
begin
  v_post := coalesce(new.post_id, old.post_id);
  select author_id into v_author from public.posts where id = v_post;
  perform public.recalc_post_points(v_post);
  perform public.recalc_user_points(v_author);
  return null;
end $$;

drop trigger if exists trg_reactions_aiud on public.reactions;
create trigger trg_reactions_aiud
after insert or update or delete on public.reactions
for each row execute function public.after_reaction_change();

-- =====================
-- 6) Row Level Security (RLS) and Policies
-- =====================

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.reactions enable row level security;
alter table public.direct_messages enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_messages enable row level security;
alter table public.follows enable row level security;

-- 6.1 profiles
do $$ begin
  create policy "profiles_read_all" on public.profiles for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "profiles_insert_self" on public.profiles for insert with check (auth.uid() = id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "profiles_update_self" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
exception when duplicate_object then null; end $$;

-- 6.2 posts
do $$ begin
  create policy "posts_read_public" on public.posts for select using (privacy = 'public');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "posts_insert_own" on public.posts for insert with check (auth.uid() = author_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "posts_update_own" on public.posts for update using (auth.uid() = author_id) with check (auth.uid() = author_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "posts_delete_own" on public.posts for delete using (auth.uid() = author_id);
exception when duplicate_object then null; end $$;

-- 6.3 reactions
do $$ begin
  create policy "reactions_read_all" on public.reactions for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "reactions_insert_self" on public.reactions for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "reactions_delete_self" on public.reactions for delete using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- 6.4 direct_messages (only sender/receiver may read; only sender may insert; only receiver may mark read)
do $$ begin
  create policy "dm_read_participants" on public.direct_messages
    for select using (auth.uid() = sender_id or auth.uid() = receiver_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "dm_insert_sender" on public.direct_messages
    for insert with check (auth.uid() = sender_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "dm_receiver_update_read" on public.direct_messages
    for update using (auth.uid() = receiver_id) with check (auth.uid() = receiver_id);
exception when duplicate_object then null; end $$;

-- 6.5 groups
do $$ begin
  create policy "groups_read_all" on public.groups for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "groups_insert_owner" on public.groups for insert with check (auth.uid() = created_by);
exception when duplicate_object then null; end $$;

-- 6.6 group_members
do $$ begin
  create policy "group_members_read_all" on public.group_members for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "group_members_insert_self" on public.group_members for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- 6.7 group_messages (v1: readable by all; insert restricted to group members)
do $$ begin
  create policy "group_messages_read_all" on public.group_messages for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "group_messages_insert_member" on public.group_messages
    for insert with check (exists (
      select 1 from public.group_members gm
      where gm.group_id = group_messages.group_id and gm.user_id = auth.uid()
    ));
exception when duplicate_object then null; end $$;

-- 6.8 follows
do $$ begin
  create policy "follows_read_all" on public.follows for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "follows_insert_self" on public.follows for insert with check (auth.uid() = follower_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "follows_delete_self" on public.follows for delete using (auth.uid() = follower_id);
exception when duplicate_object then null; end $$;

-- =====================
-- 7) Realtime Publication (for live updates in the app)
-- =====================
-- Supabase configures this publication; adding tables is safe. If already present, rerun causes duplicate errors.
-- If errors occur because tables were already added, safely ignore or remove duplicates manually.
alter publication supabase_realtime add table public.posts;
alter publication supabase_realtime add table public.reactions;
alter publication supabase_realtime add table public.direct_messages;
alter publication supabase_realtime add table public.group_messages;

-- =====================
-- 8) Storage Buckets and Policies (avatars, posts)
-- =====================
-- Create public buckets
insert into storage.buckets (id, name, public)
  values ('avatars','avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
  values ('posts','posts', true)
on conflict (id) do nothing;

-- Enable RLS on storage.objects (usually enabled by default)
alter table if exists storage.objects enable row level security;

-- Read access: public for these buckets
do $$ begin
  create policy "Public read for avatars/posts" on storage.objects
    for select using (bucket_id in ('avatars','posts'));
exception when duplicate_object then null; end $$;

-- Insert/Update/Delete only by owner, and within their own user-id folder (top-level prefix)
do $$ begin
  create policy "Users can upload to own folder" on storage.objects
    for insert with check (
      bucket_id in ('avatars','posts')
      and auth.uid() is not null
      and split_part(name, '/', 1) = auth.uid()::text
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can update own objects" on storage.objects
    for update using (
      bucket_id in ('avatars','posts')
      and owner = auth.uid()
    ) with check (
      bucket_id in ('avatars','posts')
      and owner = auth.uid()
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can delete own objects" on storage.objects
    for delete using (
      bucket_id in ('avatars','posts')
      and owner = auth.uid()
    );
exception when duplicate_object then null; end $$;

-- =====================
-- 9) Helpful seed/triggers (optional)
-- =====================
-- Optional: auto-create an empty profile row on new auth.users (if you want DB-managed profile creation)
-- Uncomment to enable. The app already calls ensureProfile() after sign-in.
-- do $$ begin
--   create or replace function public.handle_new_user()
--   returns trigger language plpgsql as $$
--   begin
--     insert into public.profiles (id, username, full_name)
--     values (new.id, split_part(new.email, '@', 1), coalesce(new.raw_user_meta_data->>'full_name', null))
--     on conflict (id) do nothing;
--     return new;
--   end $$;
--   drop trigger if exists on_auth_user_created on auth.users;
--   create trigger on_auth_user_created
--     after insert on auth.users
--     for each row execute function public.handle_new_user();
-- exception when others then null; end $$;

-- =====================
-- 10) Final checks and notes (comments only)
-- =====================
-- - Auth settings (email/password, SMTP) and Storage constraints (max file size, mime filters)
--   must be configured in the Supabase Dashboard and cannot be fully managed via SQL.
-- - If you require private buckets with signed URLs, set buckets public=false and add a policy
--   allowing only select for authenticated users, then generate signed URLs from the client.
-- - Policies above choose a public-read model for posts/avatars, matching current app usage of getPublicUrl().
-- - Realtime publication ALTER statements may error if already added; one-time setup is enough.

