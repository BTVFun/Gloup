-- Add missing columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;

-- Add missing columns to posts table
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS media_metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS media_urls TEXT[] DEFAULT '{}';
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS reply_count INTEGER DEFAULT 0;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS share_count INTEGER DEFAULT 0;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Create indexes for performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_profiles_is_verified ON public.profiles(is_verified);
CREATE INDEX IF NOT EXISTS idx_posts_media_metadata ON public.posts USING GIN (media_metadata);
CREATE INDEX IF NOT EXISTS idx_posts_reply_count ON public.posts(reply_count);
CREATE INDEX IF NOT EXISTS idx_posts_share_count ON public.posts(share_count);
CREATE INDEX IF NOT EXISTS idx_posts_view_count ON public.posts(view_count);

-- Update existing records to set defaults where needed
UPDATE public.profiles SET is_verified = FALSE WHERE is_verified IS NULL;
UPDATE public.posts SET media_metadata = '{}'::jsonb WHERE media_metadata IS NULL;
UPDATE public.posts SET media_urls = '{}' WHERE media_urls IS NULL;
UPDATE public.posts SET reply_count = 0 WHERE reply_count IS NULL;
UPDATE public.posts SET share_count = 0 WHERE share_count IS NULL;
UPDATE public.posts SET view_count = 0 WHERE view_count IS NULL;
