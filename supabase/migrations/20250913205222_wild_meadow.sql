/*
  # Social Features Schema Update

  1. New Tables
    - `comments` - Nested comments system with threading
    - `notifications` - In-app notification system
    - `user_blocks` - Block/mute functionality
    - `post_reports` - Content reporting system
    - `user_search_history` - Search history tracking
    - `trending_topics` - Trending hashtags and topics

  2. Enhanced Tables
    - Add columns to existing tables for social features
    - Update indexes for performance
    - Add new RLS policies

  3. Security
    - Enable RLS on all new tables
    - Add comprehensive policies for privacy
    - Implement content moderation hooks
*/

-- Comments system with threading
CREATE TABLE IF NOT EXISTS public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  content text NOT NULL,
  depth integer NOT NULL DEFAULT 0,
  reply_count integer NOT NULL DEFAULT 0,
  like_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false
);

-- Comment likes
CREATE TABLE IF NOT EXISTS public.comment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Notifications system
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

-- User blocks/mutes
CREATE TABLE IF NOT EXISTS public.user_blocks (
  blocker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'block', -- 'block' or 'mute'
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

-- Post reports
CREATE TABLE IF NOT EXISTS public.post_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES public.profiles(id),
  UNIQUE(post_id, reporter_id)
);

-- User search history
CREATE TABLE IF NOT EXISTS public.user_search_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  query text NOT NULL,
  result_type text NOT NULL, -- 'user', 'post', 'group'
  result_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Trending topics
CREATE TABLE IF NOT EXISTS public.trending_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hashtag text NOT NULL UNIQUE,
  post_count integer NOT NULL DEFAULT 0,
  engagement_score integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add missing columns to existing tables
DO $$
BEGIN
  -- Add follower/following counts to profiles
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'follower_count'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN follower_count integer NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'following_count'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN following_count integer NOT NULL DEFAULT 0;
  END IF;

  -- Add hashtags support to posts
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'hashtags'
  ) THEN
    ALTER TABLE public.posts ADD COLUMN hashtags text[] DEFAULT '{}';
  END IF;

  -- Add mentions support to posts
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'mentions'
  ) THEN
    ALTER TABLE public.posts ADD COLUMN mentions uuid[] DEFAULT '{}';
  END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments(post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON public.comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON public.comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON public.comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON public.user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON public.user_blocks(blocked_id);
CREATE INDEX IF NOT EXISTS idx_post_reports_status ON public.post_reports(status);
CREATE INDEX IF NOT EXISTS idx_search_history_user ON public.user_search_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trending_topics_score ON public.trending_topics(engagement_score DESC);
CREATE INDEX IF NOT EXISTS idx_posts_hashtags ON public.posts USING GIN (hashtags);
CREATE INDEX IF NOT EXISTS idx_posts_mentions ON public.posts USING GIN (mentions);
CREATE INDEX IF NOT EXISTS idx_profiles_follower_count ON public.profiles(follower_count DESC);

-- Triggers for updated_at
CREATE TRIGGER trg_comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_trending_topics_updated_at
  BEFORE UPDATE ON public.trending_topics
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Functions for maintaining counts
CREATE OR REPLACE FUNCTION public.update_follower_counts()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment follower count for followee
    UPDATE public.profiles 
    SET follower_count = follower_count + 1 
    WHERE id = NEW.followee_id;
    
    -- Increment following count for follower
    UPDATE public.profiles 
    SET following_count = following_count + 1 
    WHERE id = NEW.follower_id;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement follower count for followee
    UPDATE public.profiles 
    SET follower_count = GREATEST(0, follower_count - 1) 
    WHERE id = OLD.followee_id;
    
    -- Decrement following count for follower
    UPDATE public.profiles 
    SET following_count = GREATEST(0, following_count - 1) 
    WHERE id = OLD.follower_id;
    
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER trg_follows_update_counts
  AFTER INSERT OR DELETE ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.update_follower_counts();

-- Function for updating comment counts
CREATE OR REPLACE FUNCTION public.update_comment_counts()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment reply count for post
    UPDATE public.posts 
    SET reply_count = reply_count + 1 
    WHERE id = NEW.post_id;
    
    -- Increment reply count for parent comment if exists
    IF NEW.parent_id IS NOT NULL THEN
      UPDATE public.comments 
      SET reply_count = reply_count + 1 
      WHERE id = NEW.parent_id;
    END IF;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement reply count for post
    UPDATE public.posts 
    SET reply_count = GREATEST(0, reply_count - 1) 
    WHERE id = OLD.post_id;
    
    -- Decrement reply count for parent comment if exists
    IF OLD.parent_id IS NOT NULL THEN
      UPDATE public.comments 
      SET reply_count = GREATEST(0, reply_count - 1) 
      WHERE id = OLD.parent_id;
    END IF;
    
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER trg_comments_update_counts
  AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.update_comment_counts();

-- RLS Policies
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trending_topics ENABLE ROW LEVEL SECURITY;

-- Comments policies
CREATE POLICY "comments_read_public" ON public.comments
  FOR SELECT USING (NOT is_deleted);

CREATE POLICY "comments_insert_own" ON public.comments
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "comments_update_own" ON public.comments
  FOR UPDATE USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);

CREATE POLICY "comments_delete_own" ON public.comments
  FOR DELETE USING (auth.uid() = author_id);

-- Comment likes policies
CREATE POLICY "comment_likes_read_all" ON public.comment_likes
  FOR SELECT USING (true);

CREATE POLICY "comment_likes_insert_own" ON public.comment_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "comment_likes_delete_own" ON public.comment_likes
  FOR DELETE USING (auth.uid() = user_id);

-- Notifications policies
CREATE POLICY "notifications_read_own" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- User blocks policies
CREATE POLICY "user_blocks_read_own" ON public.user_blocks
  FOR SELECT USING (auth.uid() = blocker_id);

CREATE POLICY "user_blocks_insert_own" ON public.user_blocks
  FOR INSERT WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "user_blocks_delete_own" ON public.user_blocks
  FOR DELETE USING (auth.uid() = blocker_id);

-- Post reports policies
CREATE POLICY "post_reports_read_own" ON public.post_reports
  FOR SELECT USING (auth.uid() = reporter_id);

CREATE POLICY "post_reports_insert_own" ON public.post_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Search history policies
CREATE POLICY "search_history_read_own" ON public.user_search_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "search_history_insert_own" ON public.user_search_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Trending topics policies (read-only for users)
CREATE POLICY "trending_topics_read_all" ON public.trending_topics
  FOR SELECT USING (true);

-- Add realtime publication for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comment_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;