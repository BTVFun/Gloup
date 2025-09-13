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
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'streak_count') THEN
    ALTER TABLE public.profiles ADD COLUMN streak_count INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'last_activity') THEN
    ALTER TABLE public.profiles ADD COLUMN last_activity TIMESTAMPTZ DEFAULT NOW();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'achievements') THEN
    ALTER TABLE public.profiles ADD COLUMN achievements JSONB DEFAULT '[]'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'preferences') THEN
    ALTER TABLE public.profiles ADD COLUMN preferences JSONB DEFAULT '{
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
    }'::jsonb;
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

-- Enhanced posts table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'media_urls') THEN
    ALTER TABLE public.posts ADD COLUMN media_urls TEXT[] DEFAULT '{}';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'media_metadata') THEN
    ALTER TABLE public.posts ADD COLUMN media_metadata JSONB DEFAULT '{}'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'engagement_score') THEN
    ALTER TABLE public.posts ADD COLUMN engagement_score FLOAT DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'is_pinned') THEN
    ALTER TABLE public.posts ADD COLUMN is_pinned BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'reply_to') THEN
    ALTER TABLE public.posts ADD COLUMN reply_to UUID REFERENCES public.posts(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'reply_count') THEN
    ALTER TABLE public.posts ADD COLUMN reply_count INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'share_count') THEN
    ALTER TABLE public.posts ADD COLUMN share_count INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'view_count') THEN
    ALTER TABLE public.posts ADD COLUMN view_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- Enhanced direct_messages table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'direct_messages' AND column_name = 'message_type') THEN
    ALTER TABLE public.direct_messages ADD COLUMN message_type message_type DEFAULT 'text';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'direct_messages' AND column_name = 'media_url') THEN
    ALTER TABLE public.direct_messages ADD COLUMN media_url TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'direct_messages' AND column_name = 'media_metadata') THEN
    ALTER TABLE public.direct_messages ADD COLUMN media_metadata JSONB DEFAULT '{}'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'direct_messages' AND column_name = 'reply_to') THEN
    ALTER TABLE public.direct_messages ADD COLUMN reply_to UUID REFERENCES public.direct_messages(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'direct_messages' AND column_name = 'is_edited') THEN
    ALTER TABLE public.direct_messages ADD COLUMN is_edited BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'direct_messages' AND column_name = 'updated_at') THEN
    ALTER TABLE public.direct_messages ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Enhanced groups table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'groups' AND column_name = 'description') THEN
    ALTER TABLE public.groups ADD COLUMN description TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'groups' AND column_name = 'cover_url') THEN
    ALTER TABLE public.groups ADD COLUMN cover_url TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'groups' AND column_name = 'privacy') THEN
    ALTER TABLE public.groups ADD COLUMN privacy privacy_level DEFAULT 'public';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'groups' AND column_name = 'rules') THEN
    ALTER TABLE public.groups ADD COLUMN rules TEXT[];
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'groups' AND column_name = 'member_count') THEN
    ALTER TABLE public.groups ADD COLUMN member_count INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'groups' AND column_name = 'post_count') THEN
    ALTER TABLE public.groups ADD COLUMN post_count INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'groups' AND column_name = 'updated_at') THEN
    ALTER TABLE public.groups ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Enhanced group_members table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'group_members' AND column_name = 'invited_by') THEN
    ALTER TABLE public.group_members ADD COLUMN invited_by UUID REFERENCES public.profiles(id);
  END IF;
END $$;

-- Enhanced group_messages table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'group_messages' AND column_name = 'message_type') THEN
    ALTER TABLE public.group_messages ADD COLUMN message_type message_type DEFAULT 'text';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'group_messages' AND column_name = 'media_url') THEN
    ALTER TABLE public.group_messages ADD COLUMN media_url TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'group_messages' AND column_name = 'media_metadata') THEN
    ALTER TABLE public.group_messages ADD COLUMN media_metadata JSONB DEFAULT '{}'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'group_messages' AND column_name = 'reply_to') THEN
    ALTER TABLE public.group_messages ADD COLUMN reply_to UUID REFERENCES public.group_messages(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'group_messages' AND column_name = 'is_edited') THEN
    ALTER TABLE public.group_messages ADD COLUMN is_edited BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'group_messages' AND column_name = 'updated_at') THEN
    ALTER TABLE public.group_messages ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

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

-- Performance indexes (without CONCURRENTLY)
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

-- Check achievements function
CREATE OR REPLACE FUNCTION public.check_user_achievements(p_user_id UUID)
RETURNS TABLE(achievement_id UUID, name TEXT, description TEXT, icon TEXT, points INTEGER) AS $$
DECLARE
  user_stats RECORD;
  achievement RECORD;
  criteria JSONB;
BEGIN
  -- Get user stats
  SELECT 
    p.glow_points,
    p.streak_count,
    p.follower_count,
    p.following_count,
    (SELECT COUNT(*) FROM posts WHERE author_id = p_user_id) as posts_count,
    (SELECT COUNT(*) FROM reactions WHERE user_id = p_user_id) as reactions_given,
    (SELECT COUNT(*) FROM reactions r JOIN posts po ON r.post_id = po.id WHERE po.author_id = p_user_id) as reactions_received,
    (SELECT COUNT(*) FROM group_members WHERE user_id = p_user_id) as groups_joined,
    (SELECT COUNT(*) FROM direct_messages WHERE sender_id = p_user_id) + 
    (SELECT COUNT(*) FROM group_messages WHERE sender_id = p_user_id) as messages_sent
  INTO user_stats
  FROM profiles p WHERE p.id = p_user_id;

  -- Check each achievement
  FOR achievement IN 
    SELECT a.id, a.name, a.description, a.icon, a.points, a.criteria
    FROM achievements a
    WHERE a.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM user_achievements ua 
      WHERE ua.user_id = p_user_id AND ua.achievement_id = a.id
    )
  LOOP
    criteria := achievement.criteria;
    
    -- Check if criteria is met
    IF (criteria->>'type' = 'posts_count' AND user_stats.posts_count >= (criteria->>'value')::INTEGER) OR
       (criteria->>'type' = 'total_points' AND user_stats.glow_points >= (criteria->>'value')::INTEGER) OR
       (criteria->>'type' = 'reactions_received' AND user_stats.reactions_received >= (criteria->>'value')::INTEGER) OR
       (criteria->>'type' = 'groups_joined' AND user_stats.groups_joined >= (criteria->>'value')::INTEGER) OR
       (criteria->>'type' = 'messages_sent' AND user_stats.messages_sent >= (criteria->>'value')::INTEGER) OR
       (criteria->>'type' = 'streak_days' AND user_stats.streak_count >= (criteria->>'value')::INTEGER) OR
       (criteria->>'type' = 'followers_count' AND user_stats.follower_count >= (criteria->>'value')::INTEGER)
    THEN
      -- Award achievement
      INSERT INTO user_achievements (user_id, achievement_id) 
      VALUES (p_user_id, achievement.id);
      
      -- Return the achievement
      achievement_id := achievement.id;
      name := achievement.name;
      description := achievement.description;
      icon := achievement.icon;
      points := achievement.points;
      RETURN NEXT;
    END IF;
  END LOOP;
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

DROP TRIGGER IF EXISTS trg_direct_messages_updated_at ON public.direct_messages;
CREATE TRIGGER trg_direct_messages_updated_at
  BEFORE UPDATE ON public.direct_messages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_group_messages_updated_at ON public.group_messages;
CREATE TRIGGER trg_group_messages_updated_at
  BEFORE UPDATE ON public.group_messages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_events_updated_at ON public.events;
CREATE TRIGGER trg_events_updated_at
  BEFORE UPDATE ON public.events
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

-- Enable Row Level Security for new tables
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Enhanced RLS Policies

-- Achievements policies (read-only for users)
DROP POLICY IF EXISTS "achievements_read_all" ON public.achievements;
CREATE POLICY "achievements_read_all" ON public.achievements
  FOR SELECT USING (is_active = true);

-- User achievements policies
DROP POLICY IF EXISTS "user_achievements_read_own" ON public.user_achievements;
CREATE POLICY "user_achievements_read_own" ON public.user_achievements
  FOR SELECT USING (auth.uid() = user_id);

-- Events policies
DROP POLICY IF EXISTS "events_read_group_member" ON public.events;
CREATE POLICY "events_read_group_member" ON public.events
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.group_members WHERE group_id = events.group_id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "events_insert_group_admin" ON public.events;
CREATE POLICY "events_insert_group_admin" ON public.events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_members 
      WHERE group_id = events.group_id AND user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- Event participants policies
DROP POLICY IF EXISTS "event_participants_read_group_member" ON public.event_participants;
CREATE POLICY "event_participants_read_group_member" ON public.event_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.events e 
      JOIN public.group_members gm ON e.group_id = gm.group_id 
      WHERE e.id = event_id AND gm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "event_participants_insert_self" ON public.event_participants;
CREATE POLICY "event_participants_insert_self" ON public.event_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Notifications policies
DROP POLICY IF EXISTS "notifications_read_own" ON public.notifications;
CREATE POLICY "notifications_read_own" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Reports policies
DROP POLICY IF EXISTS "reports_insert_own" ON public.reports;
CREATE POLICY "reports_insert_own" ON public.reports
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