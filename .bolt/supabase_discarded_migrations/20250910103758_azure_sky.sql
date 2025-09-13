/*
  # Schéma complet pour le réseau social GlowUp

  1. Tables principales
    - `profiles` : Profils utilisateurs avec avatar et bio
    - `posts` : Publications avec médias et catégories
    - `reactions` : Réactions aux posts avec points
    - `follows` : Relations de suivi entre utilisateurs
    - `groups` : Groupes de discussion
    - `group_members` : Membres des groupes
    - `group_messages` : Messages dans les groupes
    - `direct_messages` : Messages privés entre utilisateurs

  2. Sécurité
    - RLS activé sur toutes les tables
    - Policies pour contrôler l'accès aux données
    - Triggers pour maintenir les points à jour

  3. Fonctionnalités
    - Authentification complète
    - Upload d'images (avatars, posts)
    - Messagerie privée et groupes
    - Système de points et réactions
*/

-- Extensions
create extension if not exists "uuid-ossp";

-- Types énumérés
do $$ begin
  create type reaction_type as enum ('couronne','vetements','sport','mental','confiance','soins');
exception when duplicate_object then null; end $$;

do $$ begin
  create type media_type as enum ('photo','video','none');
exception when duplicate_object then null; end $$;

do $$ begin
  create type privacy_level as enum ('public','followers','friends');
exception when duplicate_object then null; end $$;

-- Table des profils
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  full_name text,
  avatar_url text,
  bio text,
  glow_points integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Table des posts
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text,
  media_url text,
  media_kind media_type not null default 'none',
  category reaction_type not null,
  privacy privacy_level not null default 'public',
  glow_points integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Table des réactions
create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind reaction_type not null,
  points smallint default case when kind = 'couronne' then 20 else 10 end,
  created_at timestamptz not null default now(),
  unique (post_id, user_id, kind)
);

-- Table des follows
create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followee_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

-- Table des groupes
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category text,
  image_url text,
  created_by uuid not null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Table des membres de groupes
create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- Table des messages de groupes
create table if not exists public.group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete set null,
  content text not null,
  created_at timestamptz not null default now()
);

-- Table des messages privés
create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check (sender_id <> receiver_id)
);

-- Fonction pour mettre à jour updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Triggers pour updated_at
drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_posts_updated_at on public.posts;
create trigger trg_posts_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

-- Fonction pour recalculer les points
create or replace function public.after_reaction_change()
returns trigger language plpgsql as $$
declare
  v_post_id uuid;
  v_author_id uuid;
begin
  -- Récupérer l'ID du post et de l'auteur
  v_post_id := coalesce(new.post_id, old.post_id);
  select author_id into v_author_id from public.posts where id = v_post_id;
  
  -- Recalculer les points du post
  update public.posts 
  set glow_points = coalesce((
    select sum(points) from public.reactions where post_id = v_post_id
  ), 0)
  where id = v_post_id;
  
  -- Recalculer les points de l'auteur
  update public.profiles 
  set glow_points = coalesce((
    select sum(glow_points) from public.posts where author_id = v_author_id
  ), 0)
  where id = v_author_id;
  
  return null;
end $$;

-- Trigger pour les réactions
drop trigger if exists trg_reactions_aiud on public.reactions;
create trigger trg_reactions_aiud
  after insert or update or delete on public.reactions
  for each row execute function public.after_reaction_change();

-- Activer RLS sur toutes les tables
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.reactions enable row level security;
alter table public.follows enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_messages enable row level security;
alter table public.direct_messages enable row level security;

-- Policies pour profiles
create policy "profiles_read_all" on public.profiles
  for select using (true);

create policy "profiles_insert_self" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update_self" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Policies pour posts
create policy "posts_read_public" on public.posts
  for select using (privacy = 'public');

create policy "posts_insert_own" on public.posts
  for insert with check (auth.uid() = author_id);

create policy "posts_update_own" on public.posts
  for update using (auth.uid() = author_id) with check (auth.uid() = author_id);

create policy "posts_delete_own" on public.posts
  for delete using (auth.uid() = author_id);

-- Policies pour reactions
create policy "reactions_read_all" on public.reactions
  for select using (true);

create policy "reactions_insert_self" on public.reactions
  for insert with check (auth.uid() = user_id);

create policy "reactions_delete_self" on public.reactions
  for delete using (auth.uid() = user_id);

-- Policies pour follows
create policy "follows_read_all" on public.follows
  for select using (true);

create policy "follows_insert_self" on public.follows
  for insert with check (auth.uid() = follower_id);

create policy "follows_delete_self" on public.follows
  for delete using (auth.uid() = follower_id);

-- Policies pour groups
create policy "groups_read_all" on public.groups
  for select using (true);

create policy "groups_insert_owner" on public.groups
  for insert with check (auth.uid() = created_by);

create policy "groups_update_owner" on public.groups
  for update using (auth.uid() = created_by) with check (auth.uid() = created_by);

-- Policies pour group_members
create policy "group_members_read_member" on public.group_members
  for select using (
    exists (
      select 1 from public.group_members gm2
      where gm2.group_id = group_members.group_id and gm2.user_id = auth.uid()
    )
  );

create policy "group_members_insert_self" on public.group_members
  for insert with check (auth.uid() = user_id);

create policy "group_members_delete_self" on public.group_members
  for delete using (auth.uid() = user_id);

-- Policies pour group_messages
create policy "group_messages_read_member" on public.group_messages
  for select using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = group_messages.group_id and gm.user_id = auth.uid()
    )
  );

create policy "group_messages_insert_member" on public.group_messages
  for insert with check (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = group_messages.group_id and gm.user_id = auth.uid()
    )
  );

-- Policies pour direct_messages
create policy "direct_messages_read_participant" on public.direct_messages
  for select using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "direct_messages_insert_sender" on public.direct_messages
  for insert with check (auth.uid() = sender_id);

create policy "direct_messages_update_receiver" on public.direct_messages
  for update using (auth.uid() = receiver_id) with check (auth.uid() = receiver_id);

-- Index pour les performances
create index if not exists idx_posts_author_created on public.posts(author_id, created_at desc);
create index if not exists idx_reactions_post on public.reactions(post_id);
create index if not exists idx_group_messages_group_created on public.group_messages(group_id, created_at);
create index if not exists idx_direct_messages_participants on public.direct_messages(sender_id, receiver_id, created_at);