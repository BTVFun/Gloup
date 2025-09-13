-- Gloup ✨ Enhanced Database Schema
-- Complete Supabase schema for social media platform

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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

DO $$ BEGIN
  CREATE TYPE event_status AS ENUM ('going','maybe','not_going');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Enhanced profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  glow_points INTEGER NOT NULL DEFAULT 0,
  streak_count INTEGER DEFAULT 0,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  achievements JSONB DEFAULT '[]'::jsonb,
  preferences JSONB DEFAULT '{
    "notifications": {
      "posts": true,
      "messages": true,
      "reactions": true,
      "achievements": true
    },
    "privacy": {
      "profile_visibility": "public",
      "message_requests": true
    }
  }'::jsonb,
  is_verified BOOLEAN DEFAULT FALSE,
  follower_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enhanced posts table
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT,
  media_urls TEXT[] DEFAULT '{}',
  media_metadata JSONB DEFAULT '{}'::jsonb,
  media_kind media_type NOT NULL DEFAULT 'none',
  category reaction_type NOT NULL,
  privacy privacy_level NOT NULL DEFAULT 'public',
  glow_points INTEGER NOT NULL DEFAULT 0,
  engagement_score FLOAT DEFAULT 0,
  is_pinned BOOLEAN DEFAULT FALSE,
  reply_to UUID REFERENCES public.posts(id),
  reply_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enhanced reactions table
CREATE TABLE IF NOT EXISTS public.reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind reaction_type NOT NULL,
  points SMALLINT DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, user_id, kind)
);

-- Enhanced follows table
CREATE TABLE IF NOT EXISTS public.follows (
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  followee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_id, followee_id),
  CHECK (follower_id <> followee_id)
);

-- Enhanced groups table
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  image_url TEXT,
  cover_url TEXT,
  privacy privacy_level DEFAULT 'public',
  rules TEXT[],
  member_count INTEGER DEFAULT 0,
  post_count INTEGER DEFAULT 0,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enhanced group_members table
CREATE TABLE IF NOT EXISTS public.group_members (
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role group_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  invited_by UUID REFERENCES public.profiles(id),
  PRIMARY KEY (group_id, user_id)
);

-- Enhanced group_messages table
CREATE TABLE IF NOT EXISTS public.group_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  content TEXT,
  message_type message_type DEFAULT 'text',
  media_url TEXT,
  media_metadata JSONB DEFAULT '{}'::jsonb,
  reply_to UUID REFERENCES public.group_messages(id),
  is_edited BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enhanced direct_messages table
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT,
  message_type message_type DEFAULT 'text',
  media_url TEXT,
  media_metadata JSONB DEFAULT '{}'::jsonb,
  reply_to UUID REFERENCES public.direct_messages(id),
  is_edited BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comments system
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  depth INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.comment_likes (
  comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (comment_id, user_id)
);

-- User blocks and mutes
CREATE TABLE IF NOT EXISTS public.user_blocks (
  blocker_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('block', 'mute')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id)
);

-- Search and trending
CREATE TABLE IF NOT EXISTS public.trending_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hashtag TEXT UNIQUE NOT NULL,
  post_count INTEGER DEFAULT 0,
  engagement_score FLOAT DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  result_type TEXT,
  result_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Achievements system
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  points INTEGER DEFAULT 0,
  criteria JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_achievements (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  notified BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (user_id, achievement_id)
);

-- Events system
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  location TEXT,
  max_participants INTEGER,
  participant_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.event_participants (
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  status event_status DEFAULT 'going',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (event_id, user_id)
);

-- Notifications system
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

-- Reports and moderation
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  reported_message_id UUID REFERENCES public.direct_messages(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id)
);

-- Performance indexes (removed CONCURRENTLY to avoid transaction block error)
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
CREATE INDEX IF NOT EXISTS idx_comments_post_created ON public.comments(post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON public.comments(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON public.user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_trending_engagement ON public.trending_topics(engagement_score DESC);

-- Utility functions
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

CREATE OR REPLACE FUNCTION public.recalc_post_points(p_post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.posts 
  SET glow_points = COALESCE((
    SELECT SUM(calculate_reaction_points(kind)) 
    FROM public.reactions 
    WHERE post_id = p_post_id
  ), 0)
  WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql;

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

-- Award points function for gamification
CREATE OR REPLACE FUNCTION public.award_points(
  user_id UUID,
  points INTEGER,
  reason TEXT DEFAULT 'manual'
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles 
  SET glow_points = glow_points + points,
      last_activity = NOW()
  WHERE id = user_id;
  
  -- Log the points award
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    user_id,
    'points_awarded',
    'Points gagnés !',
    format('Vous avez gagné %s points pour %s', points, reason),
    jsonb_build_object('points', points, 'reason', reason)
  );
END;
$$ LANGUAGE plpgsql;

-- Trigger functions
CREATE OR REPLACE FUNCTION public.after_reaction_change()
RETURNS TRIGGER AS $$
DECLARE 
  v_post_id UUID;
  v_author_id UUID;
BEGIN
  v_post_id := COALESCE(NEW.post_id, OLD.post_id);
  
  SELECT author_id INTO v_author_id 
  FROM public.posts 
  WHERE id = v_post_id;
  
  PERFORM public.recalc_post_points(v_post_id);
  PERFORM public.recalc_user_points(v_author_id);
  
  -- Award points to reactor for engagement
  IF TG_OP = 'INSERT' THEN
    PERFORM public.award_points(NEW.user_id, 1, 'reaction_given');
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_follower_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    UPDATE public.profiles SET follower_count = follower_count + 1 WHERE id = NEW.followee_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles SET following_count = following_count - 1 WHERE id = OLD.follower_id;
    UPDATE public.profiles SET follower_count = follower_count - 1 WHERE id = OLD.followee_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_group_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.groups SET member_count = member_count + 1 WHERE id = NEW.group_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.groups SET member_count = member_count - 1 WHERE id = OLD.group_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_comment_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update post reply count
    UPDATE public.posts SET reply_count = reply_count + 1 WHERE id = NEW.post_id;
    
    -- Update parent comment reply count if it's a reply
    IF NEW.parent_id IS NOT NULL THEN
      UPDATE public.comments SET reply_count = reply_count + 1 WHERE id = NEW.parent_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    -- Update post reply count
    UPDATE public.posts SET reply_count = reply_count - 1 WHERE id = OLD.post_id;
    
    -- Update parent comment reply count if it was a reply
    IF OLD.parent_id IS NOT NULL THEN
      UPDATE public.comments SET reply_count = reply_count - 1 WHERE id = OLD.parent_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_comment_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.comments SET like_count = like_count + 1 WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.comments SET like_count = like_count - 1 WHERE id = OLD.comment_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trg_posts_updated_at ON public.posts;
CREATE TRIGGER trg_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_groups_updated_at ON public.groups;
CREATE TRIGGER trg_groups_updated_at
  BEFORE UPDATE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_comments_updated_at ON public.comments;
CREATE TRIGGER trg_comments_updated_at
  BEFORE UPDATE ON public.comments
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

DROP TRIGGER IF EXISTS trg_comments_count ON public.comments;
CREATE TRIGGER trg_comments_count
  AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.update_comment_counts();

DROP TRIGGER IF EXISTS trg_comment_likes_count ON public.comment_likes;
CREATE TRIGGER trg_comment_likes_count
  AFTER INSERT OR DELETE ON public.comment_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_comment_like_count();

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trending_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Profiles policies
DROP POLICY IF EXISTS "profiles_read_all" ON public.profiles;
CREATE POLICY "profiles_read_all" ON public.profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;
CREATE POLICY "profiles_insert_self" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
CREATE POLICY "profiles_update_self" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Posts policies
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

-- Reactions policies
DROP POLICY IF EXISTS "reactions_read_all" ON public.reactions;
CREATE POLICY "reactions_read_all" ON public.reactions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "reactions_insert_self" ON public.reactions;
CREATE POLICY "reactions_insert_self" ON public.reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "reactions_delete_self" ON public.reactions;
CREATE POLICY "reactions_delete_self" ON public.reactions
  FOR DELETE USING (auth.uid() = user_id);

-- Follows policies
DROP POLICY IF EXISTS "follows_read_all" ON public.follows;
CREATE POLICY "follows_read_all" ON public.follows
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "follows_insert_self" ON public.follows;
CREATE POLICY "follows_insert_self" ON public.follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "follows_delete_self" ON public.follows;
CREATE POLICY "follows_delete_self" ON public.follows
  FOR DELETE USING (auth.uid() = follower_id);

-- Comments policies
DROP POLICY IF EXISTS "comments_read_all" ON public.comments;
CREATE POLICY "comments_read_all" ON public.comments
  FOR SELECT USING (NOT is_deleted);

DROP POLICY IF EXISTS "comments_insert_auth" ON public.comments;
CREATE POLICY "comments_insert_auth" ON public.comments
  FOR INSERT WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "comments_update_own" ON public.comments;
CREATE POLICY "comments_update_own" ON public.comments
  FOR UPDATE USING (auth.uid() = author_id);

-- Comment likes policies
DROP POLICY IF EXISTS "comment_likes_read_all" ON public.comment_likes;
CREATE POLICY "comment_likes_read_all" ON public.comment_likes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "comment_likes_insert_self" ON public.comment_likes;
CREATE POLICY "comment_likes_insert_self" ON public.comment_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "comment_likes_delete_self" ON public.comment_likes;
CREATE POLICY "comment_likes_delete_self" ON public.comment_likes
  FOR DELETE USING (auth.uid() = user_id);

-- User blocks policies
DROP POLICY IF EXISTS "user_blocks_read_own" ON public.user_blocks;
CREATE POLICY "user_blocks_read_own" ON public.user_blocks
  FOR SELECT USING (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "user_blocks_insert_self" ON public.user_blocks;
CREATE POLICY "user_blocks_insert_self" ON public.user_blocks
  FOR INSERT WITH CHECK (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "user_blocks_delete_self" ON public.user_blocks;
CREATE POLICY "user_blocks_delete_self" ON public.user_blocks
  FOR DELETE USING (auth.uid() = blocker_id);

-- Direct messages policies
DROP POLICY IF EXISTS "direct_messages_read_participant" ON public.direct_messages;
CREATE POLICY "direct_messages_read_participant" ON public.direct_messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "direct_messages_insert_sender" ON public.direct_messages;
CREATE POLICY "direct_messages_insert_sender" ON public.direct_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "direct_messages_update_participant" ON public.direct_messages;
CREATE POLICY "direct_messages_update_participant" ON public.direct_messages
  FOR UPDATE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Groups policies
DROP POLICY IF EXISTS "groups_read_all" ON public.groups;
CREATE POLICY "groups_read_all" ON public.groups
  FOR SELECT USING (
    privacy = 'public' OR
    EXISTS (SELECT 1 FROM public.group_members WHERE group_id = id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "groups_insert_creator" ON public.groups;
CREATE POLICY "groups_insert_creator" ON public.groups
  FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "groups_update_admin" ON public.groups;
CREATE POLICY "groups_update_admin" ON public.groups
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.group_members 
      WHERE group_id = id AND user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- Group members policies
DROP POLICY IF EXISTS "group_members_read_all" ON public.group_members;
CREATE POLICY "group_members_read_all" ON public.group_members
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "group_members_insert_self" ON public.group_members;
CREATE POLICY "group_members_insert_self" ON public.group_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Group messages policies
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

-- Notifications policies
DROP POLICY IF EXISTS "notifications_read_own" ON public.notifications;
CREATE POLICY "notifications_read_own" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Search history policies
DROP POLICY IF EXISTS "search_history_read_own" ON public.user_search_history;
CREATE POLICY "search_history_read_own" ON public.user_search_history
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "search_history_insert_own" ON public.user_search_history;
CREATE POLICY "search_history_insert_own" ON public.user_search_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Trending topics policies
DROP POLICY IF EXISTS "trending_topics_read_all" ON public.trending_topics;
CREATE POLICY "trending_topics_read_all" ON public.trending_topics
  FOR SELECT USING (true);

-- Achievements policies
DROP POLICY IF EXISTS "achievements_read_all" ON public.achievements;
CREATE POLICY "achievements_read_all" ON public.achievements
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "user_achievements_read_own" ON public.user_achievements;
CREATE POLICY "user_achievements_read_own" ON public.user_achievements
  FOR SELECT USING (auth.uid() = user_id);

-- Reports policies
DROP POLICY IF EXISTS "reports_insert_auth" ON public.reports;
CREATE POLICY "reports_insert_auth" ON public.reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "reports_read_own" ON public.reports;
CREATE POLICY "reports_read_own" ON public.reports
  FOR SELECT USING (auth.uid() = reporter_id);

-- Insert default achievements
INSERT INTO public.achievements (name, description, icon, points, criteria) VALUES
('Premier Glow', 'Publier votre premier post', '✨', 10, '{"type": "posts_count", "value": 1}'),
('100 Glow Points', 'Atteindre 100 Glow Points', '👑', 50, '{"type": "total_points", "value": 100}'),
('Inspirateur', 'Recevoir 50 réactions', '💫', 25, '{"type": "reactions_received", "value": 50}'),
('Communautaire', 'Rejoindre 5 groupes', '🤝', 15, '{"type": "groups_joined", "value": 5}'),
('Messager', 'Envoyer 100 messages', '💬', 20, '{"type": "messages_sent", "value": 100}'),
('Fidèle', 'Se connecter 7 jours consécutifs', '🔥', 30, '{"type": "streak_days", "value": 7}'),
('Populaire', 'Avoir 50 abonnés', '⭐', 40, '{"type": "followers_count", "value": 50}'),
('Créateur de contenu', 'Publier 50 posts', '📝', 35, '{"type": "posts_count", "value": 50}')
ON CONFLICT (name) DO NOTHING;