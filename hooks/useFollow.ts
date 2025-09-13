// Follow System Hook with Optimistic Updates
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase-client';
import { realtimeManager } from '@/lib/realtime-manager';
import { AnalyticsManager } from '@/lib/analytics';
import { OfflineManager, OfflineActions } from '@/lib/offline';

interface FollowState {
  isFollowing: boolean;
  followerCount: number;
  followingCount: number;
  isLoading: boolean;
  error: string | null;
}

export function useFollow(targetUserId: string) {
  const [state, setState] = useState<FollowState>({
    isFollowing: false,
    followerCount: 0,
    followingCount: 0,
    isLoading: true,
    error: null,
  });

  const offlineManager = OfflineManager.getInstance();

  // Load follow state
  const loadFollowState = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if current user follows target user
      const { data: followData, error: followError } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('follower_id', user.id)
        .eq('followee_id', targetUserId)
        .maybeSingle();

      if (followError) throw followError;

      // Get target user's follower/following counts
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('follower_count, following_count')
        .eq('id', targetUserId)
        .single();

      if (profileError) throw profileError;

      setState({
        isFollowing: !!followData,
        followerCount: profileData.follower_count || 0,
        followingCount: profileData.following_count || 0,
        isLoading: false,
        error: null,
      });

    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message,
      }));
      AnalyticsManager.trackError(error, 'useFollow.loadFollowState');
    }
  }, [targetUserId]);

  // Follow user
  const followUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Optimistic update
    setState(prev => ({
      ...prev,
      isFollowing: true,
      followerCount: prev.followerCount + 1,
    }));

    try {
      // Check if online
      if (!offlineManager.isOnline()) {
        await offlineManager.queueAction(
          OfflineActions.followUser(user.id, targetUserId)
        );
        return;
      }

      const { error } = await supabase
        .from('follows')
        .insert({
          follower_id: user.id,
          followee_id: targetUserId,
        });

      if (error) throw error;

      // Create notification for followed user
      await supabase.functions.invoke('send-notification', {
        body: {
          user_id: targetUserId,
          type: 'follow',
          title: 'Nouveau follower',
          body: `${user.email?.split('@')[0]} vous suit maintenant`,
          data: { follower_id: user.id },
        },
      });

      AnalyticsManager.trackEvent('user_followed', {
        targetUserId,
        followerId: user.id,
      });

    } catch (error: any) {
      // Revert optimistic update
      setState(prev => ({
        ...prev,
        isFollowing: false,
        followerCount: Math.max(0, prev.followerCount - 1),
        error: error.message,
      }));
      AnalyticsManager.trackError(error, 'useFollow.followUser');
    }
  }, [targetUserId, offlineManager]);

  // Unfollow user
  const unfollowUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Optimistic update
    setState(prev => ({
      ...prev,
      isFollowing: false,
      followerCount: Math.max(0, prev.followerCount - 1),
    }));

    try {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('followee_id', targetUserId);

      if (error) throw error;

      AnalyticsManager.trackEvent('user_unfollowed', {
        targetUserId,
        followerId: user.id,
      });

    } catch (error: any) {
      // Revert optimistic update
      setState(prev => ({
        ...prev,
        isFollowing: true,
        followerCount: prev.followerCount + 1,
        error: error.message,
      }));
      AnalyticsManager.trackError(error, 'useFollow.unfollowUser');
    }
  }, [targetUserId]);

  // Toggle follow state
  const toggleFollow = useCallback(() => {
    if (state.isFollowing) {
      unfollowUser();
    } else {
      followUser();
    }
  }, [state.isFollowing, followUser, unfollowUser]);

  // Load initial state
  useEffect(() => {
    loadFollowState();
  }, [loadFollowState]);

  // Subscribe to follow changes
  useEffect(() => {
    const channelId = realtimeManager.subscribe(`follows-${targetUserId}`, {
      table: 'follows',
      event: '*',
      filter: `followee_id=eq.${targetUserId}`,
      callback: (payload) => {
        if (payload.eventType === 'INSERT') {
          setState(prev => ({
            ...prev,
            followerCount: prev.followerCount + 1,
          }));
        } else if (payload.eventType === 'DELETE') {
          setState(prev => ({
            ...prev,
            followerCount: Math.max(0, prev.followerCount - 1),
          }));
        }
      },
    });

    return () => realtimeManager.unsubscribe(channelId);
  }, [targetUserId]);

  return {
    ...state,
    followUser,
    unfollowUser,
    toggleFollow,
    refresh: loadFollowState,
  };
}

// Hook for getting user's followers/following lists
export function useFollowLists(userId: string, type: 'followers' | 'following') {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query;
      if (type === 'followers') {
        query = supabase
          .from('follows')
          .select(`
            follower_id,
            profiles:follower_id (
              id, username, full_name, avatar_url, glow_points, is_verified
            )
          `)
          .eq('followee_id', userId);
      } else {
        query = supabase
          .from('follows')
          .select(`
            followee_id,
            profiles:followee_id (
              id, username, full_name, avatar_url, glow_points, is_verified
            )
          `)
          .eq('follower_id', userId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const transformedUsers = data?.map((item: any) => ({
        id: type === 'followers' ? item.follower_id : item.followee_id,
        ...item.profiles,
      })) || [];

      setUsers(transformedUsers);
    } catch (error: any) {
      setError(error.message);
      AnalyticsManager.trackError(error, `useFollowLists.${type}`);
    } finally {
      setLoading(false);
    }
  }, [userId, type]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  return {
    users,
    loading,
    error,
    refresh: loadUsers,
  };
}