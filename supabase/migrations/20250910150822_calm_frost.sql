-- 🔧 Gloup ✨ - Réparation complète du backend Supabase
-- Migration pour corriger et optimiser toute la configuration

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. VÉRIFICATION ET RÉPARATION DU SCHÉMA

-- Enhanced enums
DO $$ BEGIN
  CREATE TYPE reaction_type AS ENUM ('couronne','vetements','sport','mental','confiance','soins');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE media_type AS ENUM ('photo','video','none');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE privacy_level AS ENUM ('public','followers','friends','private');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE message_type AS ENUM ('text','image','voice','file','system');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE group_role AS ENUM ('admin','moderator','member');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Repair and enhance profiles table
DO $$ BEGIN
  -- Add missing columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'streak_count') THEN
    ALTER TABLE public.profiles ADD COLUMN streak_count INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'last_activity') THEN
    ALTER TABLE public.profiles ADD COLUMN last_activity TIMESTAMPTZ DEFAULT NOW();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_verified') THEN
    ALTER TABLE public.profiles ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'follower_count') THEN
    ALTER TABLE public.profiles ADD COLUMN follower_count INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'following_count') THEN
    ALTER TABLE public.profiles ADD COLUMN following_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- Repair and enhance posts table
DO $$ BEGIN
  -- Add missing columns for enhanced posts
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'reply_count') THEN
    ALTER TABLE public.posts ADD COLUMN reply_count INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'share_count') THEN
    ALTER TABLE public.posts ADD COLUMN share_count INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'view_count') THEN
    ALTER TABLE public.posts ADD COLUMN view_count INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'engagement_score') THEN
    ALTER TABLE public.posts ADD COLUMN engagement_score FLOAT DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'is_pinned') THEN
    ALTER TABLE public.posts ADD COLUMN is_pinned BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Ensure reactions table has correct structure
DO $$ BEGIN
  -- Update reactions points calculation
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reactions' AND column_name = 'points') THEN
    -- Drop the old generated column if it exists
    ALTER TABLE public.reactions DROP COLUMN IF EXISTS points;
  END IF;
  
  -- Add points column with proper default
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reactions' AND column_name = 'points') THEN
    ALTER TABLE public.reactions ADD COLUMN points SMALLINT DEFAULT 10;
  END IF;
END $$;

-- Create missing tables
CREATE TABLE IF NOT EXISTS public.follows (
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  followee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_id, followee_id),
  CHECK (follower_id <> followee_id)
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_posts_created_at_desc ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author_created ON public.posts(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_category_created ON public.posts(category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reactions_post_user ON public.reactions(post_id, user_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user_created ON public.reactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.direct_messages(sender_id, receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_unread ON public.direct_messages(receiver_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_group_messages_group_time ON public.group_messages(group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_username_trgm ON public.profiles USING gin(username gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_followee ON public.follows(followee_id);

-- 3. UTILITY FUNCTIONS

-- Updated at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Points calculation functions
CREATE OR REPLACE FUNCTION public.calculate_reaction_points(reaction_kind reaction_type)
RETURNS INTEGER AS $$
BEGIN
  CASE reaction_kind
    WHEN 'couronne' THEN RETURN 20;
    ELSE RETURN 10;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Recalculate post points
CREATE OR REPLACE FUNCTION public.recalc_post_points(p_post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.posts 
  SET glow_points = COALESCE((
    SELECT SUM(public.calculate_reaction_points(kind)) 
    FROM public.reactions 
    WHERE post_id = p_post_id
  ), 0)
  WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql;

-- Recalculate user points
CREATE OR REPLACE FUNCTION public.recalc_user_points(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles 
  SET glow_points = COALESCE((
    SELECT SUM(glow_points) 
    FROM public.posts 
    WHERE author_id = p_user_id
  ), 0)
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Update reaction points in existing reactions
UPDATE public.reactions 
SET points = public.calculate_reaction_points(kind)
WHERE points != public.calculate_reaction_points(kind) OR points IS NULL;

-- 4. TRIGGERS POUR GLOW POINTS

-- Main reaction trigger function
CREATE OR REPLACE FUNCTION public.after_reaction_change()
RETURNS TRIGGER AS $$
DECLARE 
  v_post_id UUID;
  v_author_id UUID;
  v_points INTEGER;
BEGIN
  v_post_id := COALESCE(NEW.post_id, OLD.post_id);
  
  -- Get post author
  SELECT author_id INTO v_author_id 
  FROM public.posts 
  WHERE id = v_post_id;
  
  -- Update reaction points if inserting
  IF TG_OP = 'INSERT' THEN
    v_points := public.calculate_reaction_points(NEW.kind);
    UPDATE public.reactions 
    SET points = v_points 
    WHERE id = NEW.id;
  END IF;
  
  -- Recalculate points
  PERFORM public.recalc_post_points(v_post_id);
  PERFORM public.recalc_user_points(v_author_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Follower count triggers
CREATE OR REPLACE FUNCTION public.update_follower_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    UPDATE public.profiles SET follower_count = follower_count + 1 WHERE id = NEW.followee_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles SET following_count = GREATEST(0, following_count - 1) WHERE id = OLD.follower_id;
    UPDATE public.profiles SET follower_count = GREATEST(0, follower_count - 1) WHERE id = OLD.followee_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Group member count trigger
CREATE OR REPLACE FUNCTION public.update_group_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.groups SET member_count = member_count + 1 WHERE id = NEW.group_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.groups SET member_count = GREATEST(0, member_count - 1) WHERE id = OLD.group_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create/recreate triggers
DROP TRIGGER IF EXISTS trg_posts_updated_at ON public.posts;
CREATE TRIGGER trg_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_reactions_aiud ON public.reactions;
CREATE TRIGGER trg_reactions_aiud
  AFTER INSERT OR UPDATE OR DELETE ON public.reactions
  FOR EACH ROW EXECUTE FUNCTION public.after_reaction_change();

DROP TRIGGER IF EXISTS trg_follows_count ON public.follows;
CREATE TRIGGER trg_follows_count
  AFTER INSERT OR DELETE ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.update_follower_counts();

DROP TRIGGER IF EXISTS trg_group_members_count ON public.group_members;
CREATE TRIGGER trg_group_members_count
  AFTER INSERT OR DELETE ON public.group_members
  FOR EACH ROW EXECUTE FUNCTION public.update_group_member_count();

-- 5. ROW LEVEL SECURITY (RLS)

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
DROP POLICY IF EXISTS "profiles_read_all" ON public.profiles;
CREATE POLICY "profiles_read_all" ON public.profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;
CREATE POLICY "profiles_insert_self" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
CREATE POLICY "profiles_update_self" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- POSTS POLICIES
DROP POLICY IF EXISTS "posts_read_public" ON public.posts;
CREATE POLICY "posts_read_public" ON public.posts
  FOR SELECT USING (
    privacy = 'public' OR 
    author_id = auth.uid() OR
    (privacy = 'followers' AND EXISTS (
      SELECT 1 FROM public.follows 
      WHERE followee_id = author_id AND follower_id = auth.uid()
    ))
  );

DROP POLICY IF EXISTS "posts_insert_own" ON public.posts;
CREATE POLICY "posts_insert_own" ON public.posts
  FOR INSERT WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "posts_update_own" ON public.posts;
CREATE POLICY "posts_update_own" ON public.posts
  FOR UPDATE USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "posts_delete_own" ON public.posts;
CREATE POLICY "posts_delete_own" ON public.posts
  FOR DELETE USING (auth.uid() = author_id);

-- REACTIONS POLICIES
DROP POLICY IF EXISTS "reactions_read_all" ON public.reactions;
CREATE POLICY "reactions_read_all" ON public.reactions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "reactions_insert_self" ON public.reactions;
CREATE POLICY "reactions_insert_self" ON public.reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "reactions_delete_self" ON public.reactions;
CREATE POLICY "reactions_delete_self" ON public.reactions
  FOR DELETE USING (auth.uid() = user_id);

-- FOLLOWS POLICIES
DROP POLICY IF EXISTS "follows_read_all" ON public.follows;
CREATE POLICY "follows_read_all" ON public.follows
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "follows_insert_self" ON public.follows;
CREATE POLICY "follows_insert_self" ON public.follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "follows_delete_self" ON public.follows;
CREATE POLICY "follows_delete_self" ON public.follows
  FOR DELETE USING (auth.uid() = follower_id);

-- DIRECT MESSAGES POLICIES
DROP POLICY IF EXISTS "direct_messages_read_participant" ON public.direct_messages;
CREATE POLICY "direct_messages_read_participant" ON public.direct_messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "direct_messages_insert_sender" ON public.direct_messages;
CREATE POLICY "direct_messages_insert_sender" ON public.direct_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "direct_messages_update_receiver" ON public.direct_messages;
CREATE POLICY "direct_messages_update_receiver" ON public.direct_messages
  FOR UPDATE USING (auth.uid() = receiver_id) WITH CHECK (auth.uid() = receiver_id);

-- GROUPS POLICIES
DROP POLICY IF EXISTS "groups_read_all" ON public.groups;
CREATE POLICY "groups_read_all" ON public.groups
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "groups_insert_owner" ON public.groups;
CREATE POLICY "groups_insert_owner" ON public.groups
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- GROUP MEMBERS POLICIES
DROP POLICY IF EXISTS "group_members_read_all" ON public.group_members;
CREATE POLICY "group_members_read_all" ON public.group_members
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "group_members_insert_self" ON public.group_members;
CREATE POLICY "group_members_insert_self" ON public.group_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- GROUP MESSAGES POLICIES
DROP POLICY IF EXISTS "group_messages_read_member" ON public.group_messages;
CREATE POLICY "group_messages_read_member" ON public.group_messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.group_members WHERE group_id = group_messages.group_id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "group_messages_insert_member" ON public.group_messages;
CREATE POLICY "group_messages_insert_member" ON public.group_messages
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.group_members WHERE group_id = group_messages.group_id AND user_id = auth.uid())
  );

-- NOTIFICATIONS POLICIES
DROP POLICY IF EXISTS "notifications_read_own" ON public.notifications;
CREATE POLICY "notifications_read_own" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- 6. REALTIME ACTIVATION
-- Enable realtime on critical tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 7. RECALCULATE ALL EXISTING POINTS
-- Fix existing data
DO $$
DECLARE
  post_record RECORD;
  user_record RECORD;
BEGIN
  -- Recalculate all post points
  FOR post_record IN SELECT id FROM public.posts LOOP
    PERFORM public.recalc_post_points(post_record.id);
  END LOOP;
  
  -- Recalculate all user points
  FOR user_record IN SELECT id FROM public.profiles LOOP
    PERFORM public.recalc_user_points(user_record.id);
  END LOOP;
END $$;

-- 8. STORAGE BUCKET POLICIES (to be run in Supabase dashboard)
/*
-- Create storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('posts', 'posts', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own avatar" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies for posts
CREATE POLICY "Post images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'posts');

CREATE POLICY "Users can upload post images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'posts' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );
*/

-- Success message
DO $$ BEGIN
  RAISE NOTICE '✅ Backend Supabase réparé avec succès !';
  RAISE NOTICE '📊 Tables vérifiées et corrigées';
  RAISE NOTICE '🔒 RLS activé sur toutes les tables';
  RAISE NOTICE '⚡ Triggers et fonctions mis à jour';
  RAISE NOTICE '🔄 Realtime activé';
  RAISE NOTICE '💎 Glow Points recalculés';
END $$;