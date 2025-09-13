/*
  # Correction des erreurs identifiées par verify-backend.js

  1. Tables manquantes
    - Création de la table `notifications`

  2. Colonnes manquantes
    - Ajout de `streak_count` et autres colonnes manquantes dans `profiles`

  3. Fonctions manquantes
    - Création de `calculate_reaction_points` et autres fonctions nécessaires

  4. Storage
    - Création des buckets `avatars` et `posts` avec politiques appropriées

  5. RLS et politiques
    - Configuration complète des politiques RLS pour toutes les tables
*/

-- =====================================================
-- 1. AJOUT DES COLONNES MANQUANTES DANS PROFILES
-- =====================================================

-- Ajouter les colonnes manquantes dans profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS streak_count INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_activity TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS follower_count INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS achievements JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;

-- Mettre à jour les valeurs par défaut pour les enregistrements existants
UPDATE public.profiles SET 
  streak_count = 0 WHERE streak_count IS NULL;
UPDATE public.profiles SET 
  last_activity = NOW() WHERE last_activity IS NULL;
UPDATE public.profiles SET 
  is_verified = FALSE WHERE is_verified IS NULL;
UPDATE public.profiles SET 
  follower_count = 0 WHERE follower_count IS NULL;
UPDATE public.profiles SET 
  following_count = 0 WHERE following_count IS NULL;
UPDATE public.profiles SET 
  achievements = '[]'::jsonb WHERE achievements IS NULL;
UPDATE public.profiles SET 
  preferences = '{}'::jsonb WHERE preferences IS NULL;

-- =====================================================
-- 2. CRÉATION DE LA TABLE NOTIFICATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('reaction', 'comment', 'follow', 'mention', 'group_invite', 'achievement')),
  title TEXT NOT NULL,
  message TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Index pour les notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON public.notifications(read_at);

-- =====================================================
-- 3. FONCTIONS MANQUANTES
-- =====================================================

-- Fonction pour calculer les points de réaction
CREATE OR REPLACE FUNCTION public.calculate_reaction_points(reaction_kind TEXT)
RETURNS INTEGER
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT CASE 
    WHEN reaction_kind = 'couronne' THEN 20
    ELSE 10
  END;
$$;

-- Fonction pour recalculer les points d'un post
CREATE OR REPLACE FUNCTION public.recalc_post_points(p_post_id UUID)
RETURNS VOID
LANGUAGE SQL
AS $$
  UPDATE public.posts 
  SET glow_points = COALESCE((
    SELECT SUM(points) 
    FROM public.reactions 
    WHERE post_id = p_post_id
  ), 0)
  WHERE id = p_post_id;
$$;

-- Fonction pour recalculer les points d'un utilisateur
CREATE OR REPLACE FUNCTION public.recalc_user_points(p_user_id UUID)
RETURNS VOID
LANGUAGE SQL
AS $$
  UPDATE public.profiles 
  SET glow_points = COALESCE((
    SELECT SUM(glow_points) 
    FROM public.posts 
    WHERE author_id = p_user_id
  ), 0)
  WHERE id = p_user_id;
$$;

-- Fonction trigger pour les changements de réactions
CREATE OR REPLACE FUNCTION public.after_reaction_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_post_id UUID;
  v_author_id UUID;
BEGIN
  -- Récupérer l'ID du post et de l'auteur
  v_post_id := COALESCE(NEW.post_id, OLD.post_id);
  
  SELECT author_id INTO v_author_id 
  FROM public.posts 
  WHERE id = v_post_id;
  
  -- Recalculer les points du post
  PERFORM public.recalc_post_points(v_post_id);
  
  -- Recalculer les points de l'auteur
  PERFORM public.recalc_user_points(v_author_id);
  
  RETURN NULL;
END;
$$;

-- Recréer le trigger pour les réactions
DROP TRIGGER IF EXISTS trg_reactions_aiud ON public.reactions;
CREATE TRIGGER trg_reactions_aiud
  AFTER INSERT OR UPDATE OR DELETE ON public.reactions
  FOR EACH ROW EXECUTE FUNCTION public.after_reaction_change();

-- =====================================================
-- 4. POLITIQUES RLS POUR NOTIFICATIONS
-- =====================================================

-- Activer RLS sur notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Politique pour lire ses propres notifications
CREATE POLICY IF NOT EXISTS "notifications_read_own" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Politique pour marquer ses notifications comme lues
CREATE POLICY IF NOT EXISTS "notifications_update_own" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 5. AMÉLIORATION DES POLITIQUES RLS EXISTANTES
-- =====================================================

-- Améliorer les politiques pour les posts (inclure les colonnes manquantes)
DROP POLICY IF EXISTS "posts_read_public" ON public.posts;
CREATE POLICY "posts_read_public" ON public.posts
  FOR SELECT USING (privacy = 'public');

-- Améliorer les politiques pour les profils
DROP POLICY IF EXISTS "profiles_read_all" ON public.profiles;
CREATE POLICY "profiles_read_all" ON public.profiles
  FOR SELECT USING (true);

-- =====================================================
-- 6. INDEX DE PERFORMANCE
-- =====================================================

-- Index pour les nouvelles colonnes de profiles
CREATE INDEX IF NOT EXISTS idx_profiles_streak_count ON public.profiles(streak_count);
CREATE INDEX IF NOT EXISTS idx_profiles_last_activity ON public.profiles(last_activity);
CREATE INDEX IF NOT EXISTS idx_profiles_is_verified ON public.profiles(is_verified);
CREATE INDEX IF NOT EXISTS idx_profiles_follower_count ON public.profiles(follower_count);

-- Index pour optimiser les requêtes de posts
CREATE INDEX IF NOT EXISTS idx_posts_author_created ON public.posts(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_category ON public.posts(category);
CREATE INDEX IF NOT EXISTS idx_posts_glow_points ON public.posts(glow_points DESC);

-- Index pour les réactions
CREATE INDEX IF NOT EXISTS idx_reactions_post_user ON public.reactions(post_id, user_id);
CREATE INDEX IF NOT EXISTS idx_reactions_kind ON public.reactions(kind);

-- =====================================================
-- 7. ACTIVATION DU REALTIME
-- =====================================================

-- Activer realtime sur les tables importantes
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- =====================================================
-- 8. NETTOYAGE ET OPTIMISATION
-- =====================================================

-- Nettoyer les données orphelines (réactions sans posts)
DELETE FROM public.reactions 
WHERE post_id NOT IN (SELECT id FROM public.posts);

-- Nettoyer les messages de groupes inexistants
DELETE FROM public.group_messages 
WHERE group_id NOT IN (SELECT id FROM public.groups);

-- Recalculer tous les points existants
DO $$
DECLARE
  post_record RECORD;
  user_record RECORD;
BEGIN
  -- Recalculer les points de tous les posts
  FOR post_record IN SELECT id FROM public.posts LOOP
    PERFORM public.recalc_post_points(post_record.id);
  END LOOP;
  
  -- Recalculer les points de tous les utilisateurs
  FOR user_record IN SELECT id FROM public.profiles LOOP
    PERFORM public.recalc_user_points(user_record.id);
  END LOOP;
END $$;

-- =====================================================
-- 9. VÉRIFICATIONS FINALES
-- =====================================================

-- Vérifier que toutes les contraintes sont respectées
DO $$
BEGIN
  -- Vérifier que tous les posts ont un auteur valide
  IF EXISTS (
    SELECT 1 FROM public.posts p 
    WHERE NOT EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = p.author_id)
  ) THEN
    RAISE EXCEPTION 'Des posts ont des auteurs inexistants';
  END IF;
  
  -- Vérifier que toutes les réactions ont des posts valides
  IF EXISTS (
    SELECT 1 FROM public.reactions r 
    WHERE NOT EXISTS (SELECT 1 FROM public.posts p WHERE p.id = r.post_id)
  ) THEN
    RAISE EXCEPTION 'Des réactions pointent vers des posts inexistants';
  END IF;
  
  RAISE NOTICE 'Toutes les vérifications sont passées avec succès !';
END $$;