// Enhanced User Profile Hook with Social Features
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase-client';
import { AnalyticsManager } from '@/lib/analytics';
import { CacheManager, CacheKeys } from '@/lib/cache';

interface UserProfile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  glow_points: number;
  follower_count: number;
  following_count: number;
  is_verified: boolean;
  created_at: string;
  is_following?: boolean;
  is_blocked?: boolean;
  is_muted?: boolean;
  posts_count?: number;
  recent_posts?: any[];
}

export function useUserProfile(userId: string) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cache = CacheManager.getInstance();

  // Load user profile with social context
  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Check cache first
      const cacheKey = CacheKeys.profile(userId);
      const cachedProfile = await cache.get<UserProfile>(cacheKey);
      
      if (cachedProfile) {
        setProfile(cachedProfile);
        setLoading(false);
        // Continue loading fresh data in background
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      // Get profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      // Get social context if user is logged in
      let socialContext = {};
      if (user && user.id !== userId) {
        // Check if current user follows this user
        const { data: followData } = await supabase
          .from('follows')
          .select('follower_id')
          .eq('follower_id', user.id)
          .eq('followee_id', userId)
          .maybeSingle();

        // Check if current user has blocked this user
        const { data: blockData } = await supabase
          .from('user_blocks')
          .select('type')
          .eq('blocker_id', user.id)
          .eq('blocked_id', userId)
          .maybeSingle();

        socialContext = {
          is_following: !!followData,
          is_blocked: blockData?.type === 'block',
          is_muted: blockData?.type === 'mute',
        };
      }

      // Get posts count
      const { count: postsCount } = await supabase
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('author_id', userId)
        .eq('privacy', 'public');

      // Get recent posts
      const { data: recentPosts } = await supabase
        .from('posts')
        .select('id, content, media_url, glow_points, created_at')
        .eq('author_id', userId)
        .eq('privacy', 'public')
        .order('created_at', { ascending: false })
        .limit(6);

      const fullProfile: UserProfile = {
        ...profileData,
        ...socialContext,
        posts_count: postsCount || 0,
        recent_posts: recentPosts || [],
      };

      setProfile(fullProfile);

      // Cache the profile
      await cache.set(cacheKey, fullProfile, 300000); // 5 minutes

      AnalyticsManager.trackEvent('profile_viewed', {
        profileUserId: userId,
        viewerUserId: user?.id,
      });

    } catch (error: any) {
      setError(error.message);
      AnalyticsManager.trackError(error, 'useUserProfile.loadProfile');
    } finally {
      setLoading(false);
    }
  }, [userId, cache]);

  // Block user
  const blockUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !profile) return;

    try {
      const { error } = await supabase
        .from('user_blocks')
        .upsert({
          blocker_id: user.id,
          blocked_id: userId,
          type: 'block',
        });

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, is_blocked: true } : null);

      AnalyticsManager.trackEvent('user_blocked', {
        blockedUserId: userId,
        blockerUserId: user.id,
      });

    } catch (error: any) {
      AnalyticsManager.trackError(error, 'useUserProfile.blockUser');
      throw error;
    }
  }, [userId, profile]);

  // Unblock user
  const unblockUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_blocks')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', userId);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, is_blocked: false } : null);

      AnalyticsManager.trackEvent('user_unblocked', {
        unblockedUserId: userId,
        unblockerUserId: user.id,
      });

    } catch (error: any) {
      AnalyticsManager.trackError(error, 'useUserProfile.unblockUser');
      throw error;
    }
  }, [userId]);

  // Mute user
  const muteUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_blocks')
        .upsert({
          blocker_id: user.id,
          blocked_id: userId,
          type: 'mute',
        });

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, is_muted: true } : null);

      AnalyticsManager.trackEvent('user_muted', {
        mutedUserId: userId,
        muterUserId: user.id,
      });

    } catch (error: any) {
      AnalyticsManager.trackError(error, 'useUserProfile.muteUser');
      throw error;
    }
  }, [userId]);

  // Load profile on mount
  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  return {
    profile,
    loading,
    error,
    blockUser,
    unblockUser,
    muteUser,
    refresh: loadProfile,
  };
}