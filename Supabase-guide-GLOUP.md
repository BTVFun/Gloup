# Guide Supabase — GLOUP

Ce document explique comment bâtir le backend Supabase pour l’app GLOUP, pas à pas, en s’appuyant sur la structure actuelle du projet.

## Aperçu du projet (côté app)

- Stack: Expo + React Native + TypeScript + Expo Router.
- Dossiers clés: `app/(tabs)/index.tsx` (fil d’actus), `app/(tabs)/create.tsx` (création d’un post), `app/(tabs)/messages.tsx` (messagerie/groupes), `app/(tabs)/conseils.tsx` (contenus éditoriaux), `app/(tabs)/profile.tsx` (profil).
- Aujourd’hui: données mockées, aucune intégration backend. Objectif: remplacer les mocks par Supabase (auth, DB, storage, realtime) et sécuriser via RLS.

Vous avez déjà un projet Supabase: `gloup-prod`. On ajoutera en bonus une instance « gloup-dev » (recommandé) pour développer sans toucher la prod.

---

## Objectifs backend (v1 réaliste)

1) Authentification: utilisateurs avec session persistée (email/password ou OTP, social plus tard).
2) Profils: table `profiles` liée à `auth.users` (avatar, bio, stats).
3) Posts: table `posts` + stockage d’images/vidéos (bucket `posts`). Catégories conformes à l’app: `couronne|vetements|sport|mental|confiance|soins`.
4) Réactions: table `reactions` avec points par type, agrégation vers `posts.glow_points` et `profiles.glow_points`.
5) Messagerie/Groupes (v1 simple): tables `groups`, `group_members`, `group_messages`. DM en v2.
6) Realtime: abonnement aux `reactions` et `group_messages` pour mettre à jour l’UI.
7) Sécurité: RLS stricte sur toutes les tables, clés publiques côté app uniquement (anon key).

---

## Étape 1 — Préparer Supabase (console)

- Aller sur le projet `gloup-prod`.
- Auth > Settings:
  - Activer l’email (password ou OTP). Pour v1, email/password est le plus simple côté mobile.
  - Ajouter OAuth (Apple/Google) plus tard si besoin.
- Storage > Créer les buckets:
  - `avatars` (lecture publique recommandée),
  - `posts` (lecture publique au début; on pourra passer en URL signée ensuite).
- SQL Editor: exécuter le script du Schéma (Étape 2 ci-dessous). Idéalement, utilisez des migrations via le CLI Supabase pour tracer les changements.

---

## Étape 2 — Schéma SQL (tables, contraintes, RLS, triggers)

Copiez-collez l’ensemble dans l’éditeur SQL (Prod et Dev). Ajustez si vous créez d’abord un env `gloup-dev`.

```sql
-- Extensions usuelles (généralement déjà actives)
create extension if not exists pgcrypto;

-- Enums
do $$ begin
  create type reaction_type as enum ('couronne','vetements','sport','mental','confiance','soins');
exception when duplicate_object then null; end $$;

do $$ begin
  create type media_type as enum ('photo','video','none');
exception when duplicate_object then null; end $$;

do $$ begin
  create type privacy_level as enum ('public','followers','friends');
exception when duplicate_object then null; end $$;

-- Profiles (1–1 avec auth.users)
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

-- Posts
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

-- Réactions (1 utilisateur peut réagir 1× par type à un post)
create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind reaction_type not null,
  -- points dérivés du type (couronne=20, autres=10)
  points smallint generated always as (
    case when kind = 'couronne' then 20 else 10 end
  ) stored,
  created_at timestamptz not null default now(),
  unique (post_id, user_id, kind)
);

-- Follows (pour privacy followers/friends à venir)
create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followee_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

-- Groupes (v1 simple)
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  image_url text,
  created_by uuid not null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete set null,
  content text not null,
  created_at timestamptz not null default now()
);

-- Timestamps auto updated_at
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

-- Recalcul des points (post + profil auteur)
create or replace function public.recalc_post_points(p_post uuid)
returns void language sql as $$
  update public.posts p
     set glow_points = coalesce((select sum(points) from public.reactions r where r.post_id = p.id), 0)
   where p.id = p_post;
$$;

create or replace function public.recalc_author_points(p_user uuid)
returns void language sql as $$
  update public.profiles pr
     set glow_points = coalesce((
       select sum(p.glow_points) from public.posts p where p.author_id = pr.id
     ), 0)
   where pr.id = p_user;
$$;

create or replace function public.after_reaction_change()
returns trigger language plpgsql as $$
declare v_post uuid; v_author uuid;
begin
  v_post := coalesce(new.post_id, old.post_id);
  select author_id into v_author from public.posts where id = v_post;
  perform public.recalc_post_points(v_post);
  perform public.recalc_author_points(v_author);
  return null;
end $$;

drop trigger if exists trg_reactions_aiud on public.reactions;
create trigger trg_reactions_aiud
after insert or update or delete on public.reactions
for each row execute function public.after_reaction_change();

-- RLS
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.reactions enable row level security;
alter table public.follows enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_messages enable row level security;

-- Policies: profiles
do $$ begin
  create policy "profiles_read_all" on public.profiles
    for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "profiles_insert_self" on public.profiles
    for insert with check (auth.uid() = id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "profiles_update_self" on public.profiles
    for update using (auth.uid() = id) with check (auth.uid() = id);
exception when duplicate_object then null; end $$;

-- Policies: posts (v1: visibilité publique)
do $$ begin
  create policy "posts_read_public" on public.posts
    for select using (privacy = 'public');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "posts_insert_own" on public.posts
    for insert with check (auth.uid() = author_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "posts_update_own" on public.posts
    for update using (auth.uid() = author_id) with check (auth.uid() = author_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "posts_delete_own" on public.posts
    for delete using (auth.uid() = author_id);
exception when duplicate_object then null; end $$;

-- Policies: reactions
do $$ begin
  create policy "reactions_read_all" on public.reactions
    for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "reactions_insert_self" on public.reactions
    for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "reactions_delete_self" on public.reactions
    for delete using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- Policies: follows
do $$ begin
  create policy "follows_read_all" on public.follows for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "follows_insert_self" on public.follows
    for insert with check (auth.uid() = follower_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "follows_delete_self" on public.follows
    for delete using (auth.uid() = follower_id);
exception when duplicate_object then null; end $$;

-- Policies: groups & messages
do $$ begin
  create policy "groups_read_all" on public.groups for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "groups_insert_owner" on public.groups
    for insert with check (auth.uid() = created_by);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "group_members_read_member" on public.group_members
    for select using (exists (
      select 1 from public.group_members gm2
      where gm2.group_id = group_members.group_id and gm2.user_id = auth.uid()
    ));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "group_members_insert_self" on public.group_members
    for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "group_messages_read_member" on public.group_messages
    for select using (exists (
      select 1 from public.group_members gm
      where gm.group_id = group_messages.group_id and gm.user_id = auth.uid()
    ));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "group_messages_insert_member" on public.group_messages
    for insert with check (exists (
      select 1 from public.group_members gm
      where gm.group_id = group_messages.group_id and gm.user_id = auth.uid()
    ));
exception when duplicate_object then null; end $$;
```

Après exécution, vérifiez que chaque table a RLS activé et au moins une policy.

---

## Étape 3 — Variables d’environnement (Expo)

Exposez `SUPABASE_URL` et `SUPABASE_ANON_KEY` via `app.config.ts` (recommandé) + EAS Secrets.

1) Remplacez `app.json` par `app.config.ts` à la racine:

```ts
// app.config.ts
import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'gloup',
  slug: 'gloup',
  scheme: 'gloup',
  newArchEnabled: true,
  userInterfaceStyle: 'automatic',
  plugins: ['expo-router', 'expo-font', 'expo-web-browser'],
  web: { bundler: 'metro', output: 'single', favicon: './assets/images/favicon.png' },
  ios: { supportsTablet: true },
  extra: {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  },
  experiments: { typedRoutes: true },
};

export default config;
```

2) Local: créez un fichier `.env` (non commité) et lancez avec `EXPO_PUBLIC_…` ou passez par EAS.

3) CI/Build: `eas secret:create --name SUPABASE_URL --value <...>` et idem pour `SUPABASE_ANON_KEY`.

Note: l’`anon key` peut être embarquée côté client si RLS est correcte.

---

## Étape 4 — Installer et créer le client Supabase

Installez les dépendances:

```bash
npm i @supabase/supabase-js @react-native-async-storage/async-storage
```

Créez `lib/supabase.ts`:

```ts
// lib/supabase.ts
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const { SUPABASE_URL, SUPABASE_ANON_KEY } = Constants.expoConfig?.extra ?? {};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

---

## Étape 5 — Auth minimale (email/password) et profil

Flux recommandé v1:

1) Sign up: `supabase.auth.signUp({ email, password })`
2) À la 1ère connexion, créer la ligne `profiles` si absente:

```ts
import { supabase } from '@/lib/supabase';

export async function ensureProfile() {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return;
  const { data } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle();
  if (!data) {
    await supabase.from('profiles').insert({ id: user.id });
  }
}
```

Appeler `ensureProfile()` après connexion/restauration de session.

---

## Étape 6 — Remplacer les mocks par Supabase

Exemples ciblés (extraits simplifiés):

1) Fil d’actus `app/(tabs)/index.tsx`

```ts
// 1) Charger les posts
const { data: posts } = await supabase
  .from('posts')
  .select('id, content, media_url, glow_points, category, created_at, author_id, profiles!posts_author_id_fkey ( username, avatar_url, glow_points )')
  .order('created_at', { ascending: false });

// 2) Réagir à un post
await supabase.from('reactions').insert({ post_id: postId, user_id: user.id, kind: 'sport' });
// Le trigger mettra à jour glow_points; écoutez le realtime pour refléter l’UI.

// 3) Realtime sur reactions
const channel = supabase.channel('reactions')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, payload => {
    // recharger le post ciblé ou ajuster son score local
  })
  .subscribe();
```

2) Création de post `app/(tabs)/create.tsx`

```ts
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

// 1) Upload media
const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All });
if (!result.canceled) {
  const asset = result.assets[0];
  const file = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
  const bytes = Buffer.from(file, 'base64');
  const path = `${user.id}/${Date.now()}-${asset.fileName ?? 'media'}`;
  await supabase.storage.from('posts').upload(path, bytes, { contentType: asset.mimeType ?? 'image/jpeg' });
  const { data: { publicUrl } } = supabase.storage.from('posts').getPublicUrl(path);

  // 2) Créer la ligne post
  await supabase.from('posts').insert({
    author_id: user.id,
    content,
    media_url: publicUrl,
    media_kind: asset.type === 'video' ? 'video' : 'photo',
    category: selectedCategory, // 'sport' | 'mental' ...
    privacy: 'public',
  });
}
```

3) Profil `app/(tabs)/profile.tsx`

```ts
const { data: profile } = await supabase
  .from('profiles')
  .select('full_name, avatar_url, bio, glow_points')
  .eq('id', user.id)
  .single();

const { data: stats } = await supabase
  .from('posts')
  .select('id', { count: 'exact', head: true })
  .eq('author_id', user.id);
```

4) Groupes/Messages `app/(tabs)/messages.tsx`

```ts
// Lister les groupes
const { data: groups } = await supabase
  .from('groups')
  .select('id, name, category, image_url');

// Rejoindre un groupe
await supabase.from('group_members').insert({ group_id, user_id: user.id });

// Envoyer un message
await supabase.from('group_messages').insert({ group_id, sender_id: user.id, content });

// Realtime messages
const ch = supabase.channel(`grp-${group_id}`)
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_messages', filter: `group_id=eq.${group_id}` }, (payload) => {
    // push nouveau message dans l’état
  })
  .subscribe();
```

---

## Étape 7 — Stockage et accès images

- Buckets: `avatars`, `posts`.
- V1: lecture publique (simple). V2: URLs signées (plus sécurisé), via `createSignedUrl` et cache côté client.
- Nomenclature: `userId/timestamp-filename.ext`.

---

## Étape 8 — Sécurité & bonnes pratiques

- Utiliser uniquement l’`anon key` dans l’app. Ne jamais exposer la `service_role`.
- Vérifier RLS sur chaque table; tester avec le SQL Editor en mode « as authenticated user ».
- Limiter les champs updatable via `with check` (déjà fait ci-dessus).
- Ajoutez des indexes si besoin: `create index on reactions(post_id)`, `on posts(author_id, created_at desc)`, etc.
- Journaux/Monitoring: activer Realtime seulement là où utile pour éviter le bruit.

---

## Étape 9 — Roadmap intégration dans l’app

1) Dépendances + client Supabase (`lib/supabase.ts`).
2) Écran Auth (simple email/password) + `ensureProfile()`.
3) Remplacer `mockPosts` dans `index.tsx` par un fetch Supabase + realtime.
4) Remplacer la logique de `handleReaction` par un `insert` dans `reactions`.
5) Implémenter l’upload dans `create.tsx` + `insert` dans `posts`.
6) Remplacer les mocks des `messages.tsx` par `groups`/`group_messages` + realtime.
7) Profil: requêtes `profiles` + comptages de posts.
8) Ajuster l’UI (loading/erreurs), paginations (`range`), et caches.

---

## Étape 10 — Mise en prod

- Dupliquer la configuration sur `gloup-dev` pour développer en sécurité.
- Migrations versionnées via Supabase CLI.
- Activer backups automatiques.
- Vérifier les policies RLS avec un compte test avant release.

---

## Annexes — Snippets utiles

Sélection posts avec auteur imbriqué (grâce à la FK `posts.author_id -> profiles.id`):

```ts
const { data } = await supabase
  .from('posts')
  .select(`
    id, content, media_url, glow_points, category, created_at,
    profiles:author_id ( username, avatar_url, glow_points )
  `)
  .order('created_at', { ascending: false });
```

Compte des réactions par type (côté client en une requête):

```sql
-- Exemple SQL si vous préférez une vue matérialisée plus tard
select kind, count(*) from reactions where post_id = :post group by kind;
```

Bonne implémentation ! Cette base vous donne un backend sécurisé, en temps réel, aligné avec l’UI actuelle. Vous pourrez enrichir ensuite (DM, privacy avancée, achievements automatiques, URLs signées, etc.).

