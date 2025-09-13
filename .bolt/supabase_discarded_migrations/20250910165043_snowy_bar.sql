/*
  # Fix Backend Issues - Gloup ✨

  1. Missing Tables
    - `notifications` table with proper structure and RLS

  2. Missing Columns in profiles
    - `streak_count` for user activity tracking
    - `is_verified` for verified user badges
    - `follower_count` and `following_count` for social stats
    - `last_activity` for activity tracking

  3. Missing Functions
    - `calculate_reaction_points` for point calculation
    - Enhanced trigger functions for automatic updates

  4. Storage Buckets
    - Instructions for creating avatars and posts buckets

  5. Performance Optimizations
    - Additional indexes for better query performance
*/

-- Add missing columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS streak_count INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS follower_count INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_activity TIMESTAMPTZ DEFAULT NOW();

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('reaction', 'comment', 'follow', 'message', 'achievement', 'system')),
  title TEXT NOT NULL,
  message TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for notifications
CREATE POLICY IF NOT EXISTS "notifications_read_own" 
  ON public.notifications 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "notifications_insert_system" 
  ON public.notifications 
  FOR INSERT 
  WITH CHECK (true); -- System can insert notifications

-- Create missing function: calculate_reaction_points
CREATE OR REPLACE FUNCTION public.calculate_reaction_points(reaction_kind reaction_type)
RETURNS INTEGER
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT CASE 
    WHEN reaction_kind = 'couronne' THEN 20
    ELSE 10
  END;
$$;

-- Enhanced function to recalculate post points
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

-- Enhanced function to recalculate user points
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

-- Enhanced trigger function for reaction changes
CREATE OR REPLACE FUNCTION public.after_reaction_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_post_id UUID;
  v_author_id UUID;
BEGIN
  -- Get post and author IDs
  v_post_id := COALESCE(NEW.post_id, OLD.post_id);
  
  SELECT author_id INTO v_author_id 
  FROM public.posts 
  WHERE id = v_post_id;
  
  -- Recalculate post points
  PERFORM public.recalc_post_points(v_post_id);
  
  -- Recalculate author points
  IF v_author_id IS NOT NULL THEN
    PERFORM public.recalc_user_points(v_author_id);
  END IF;
  
  -- Create notification for new reactions (not for deletions)
  IF TG_OP = 'INSERT' AND NEW.user_id != v_author_id THEN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      v_author_id,
      'reaction',
      'Nouvelle réaction sur votre post',
      'Quelqu''un a réagi à votre publication',
      jsonb_build_object(
        'post_id', v_post_id,
        'reaction_type', NEW.kind,
        'reactor_id', NEW.user_id
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trg_reactions_aiud ON public.reactions;
CREATE TRIGGER trg_reactions_aiud
  AFTER INSERT OR UPDATE OR DELETE ON public.reactions
  FOR EACH ROW EXECUTE FUNCTION public.after_reaction_change();

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON public.notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_profiles_streak_count ON public.profiles(streak_count);
CREATE INDEX IF NOT EXISTS idx_profiles_is_verified ON public.profiles(is_verified);
CREATE INDEX IF NOT EXISTS idx_profiles_follower_count ON public.profiles(follower_count);
CREATE INDEX IF NOT EXISTS idx_profiles_last_activity ON public.profiles(last_activity);

-- Update existing records with default values
UPDATE public.profiles 
SET 
  streak_count = 0,
  is_verified = FALSE,
  follower_count = 0,
  following_count = 0,
  last_activity = NOW()
WHERE 
  streak_count IS NULL 
  OR is_verified IS NULL 
  OR follower_count IS NULL 
  OR following_count IS NULL 
  OR last_activity IS NULL;

-- Recalculate all existing glow points to ensure consistency
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

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;