# Gloup ✨ Custom Hooks Implementation

## 🎯 Core Hooks

### 1. Enhanced Feed Hook

```typescript
// hooks/useFeed.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { CacheManager } from '@/lib/cache';
import { AnalyticsManager } from '@/lib/analytics';

interface UseFeedOptions {
  userId?: string;
  category?: string;
  groupId?: string;
  pageSize?: number;
}

interface FeedPost {
  id: string;
  author: {
    id: string;
    name: string;
    avatar: string;
    glowPoints: number;
    isVerified: boolean;
  };
  content: string;
  media_urls: string[];
  media_metadata: any;
  glowPoints: number;
  reactions: Record<string, number>;
  userHasReacted: string[];
  timestamp: string;
  replyCount: number;
  shareCount: number;
  viewCount: number;
}

export function useFeed(options: UseFeedOptions = {}) {
  const { userId, category, groupId, pageSize = 20 } = options;
  
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const offsetRef = useRef(0);
  const cache = CacheManager.getInstance();
  const realtimeChannelRef = useRef<any>(null);

  // Generate cache key based on options
  const getCacheKey = useCallback(() => {
    const key = `feed_${userId || 'all'}_${category || 'all'}_${groupId || 'all'}`;
    return key;
  }, [userId, category, groupId]);

  // Fetch posts from API
  const fetchPosts = useCallback(async (offset = 0, isRefresh = false) => {
    try {
      const cacheKey = getCacheKey();
      
      // Try cache first for initial load
      if (offset === 0 && !isRefresh) {
        const cachedPosts = await cache.get<FeedPost[]>(cacheKey);
        if (cachedPosts && cachedPosts.length > 0) {
          setPosts(cachedPosts);
          return;
        }
      }

      let query = supabase
        .from('posts')
        .select(`
          id, content, media_urls, media_metadata, glow_points, 
          reply_count, share_count, view_count, created_at,
          profiles:author_id (
            id, username, avatar_url, glow_points, is_verified
          )
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

      // Apply filters
      if (userId) {
        query = query.eq('author_id', userId);
      }
      if (category) {
        query = query.eq('category', category);
      }
      if (groupId) {
        // For group posts, we'd need a different table or filter
        query = query.eq('group_id', groupId);
      }

      const { data: postsData, error: postsError } = await query;
      
      if (postsError) throw postsError;

      if (!postsData || postsData.length === 0) {
        setHasMore(false);
        return;
      }

      // Get current user for reactions
      const { data: { user } } = await supabase.auth.getUser();
      
      // Fetch reactions for these posts
      const postIds = postsData.map(p => p.id);
      const [reactionsData, userReactionsData] = await Promise.all([
        supabase
          .from('reactions')
          .select('post_id, kind')
          .in('post_id', postIds),
        user ? supabase
          .from('reactions')
          .select('post_id, kind')
          .in('post_id', postIds)
          .eq('user_id', user.id) : { data: [] }
      ]);

      // Process reactions
      const reactionMap = new Map<string, Record<string, number>>();
      const userReactionMap = new Map<string, string[]>();
      
      postIds.forEach(id => {
        reactionMap.set(id, {
          couronne: 0, vetements: 0, sport: 0, 
          mental: 0, confiance: 0, soins: 0
        });
        userReactionMap.set(id, []);
      });

      reactionsData.data?.forEach((r: any) => {
        const reactions = reactionMap.get(r.post_id)!;
        reactions[r.kind] += 1;
      });

      userReactionsData.data?.forEach((r: any) => {
        const userReactions = userReactionMap.get(r.post_id)!;
        userReactions.push(r.kind);
      });

      // Transform data
      const transformedPosts: FeedPost[] = postsData.map((post: any) => ({
        id: post.id,
        author: {
          id: post.profiles?.id || '',
          name: post.profiles?.username || 'Utilisateur',
          avatar: post.profiles?.avatar_url || 'https://placehold.co/100x100/png',
          glowPoints: post.profiles?.glow_points || 0,
          isVerified: post.profiles?.is_verified || false,
        },
        content: post.content || '',
        media_urls: post.media_urls || [],
        media_metadata: post.media_metadata || {},
        glowPoints: post.glow_points || 0,
        reactions: reactionMap.get(post.id)!,
        userHasReacted: userReactionMap.get(post.id)!,
        timestamp: timeSince(new Date(post.created_at)),
        replyCount: post.reply_count || 0,
        shareCount: post.share_count || 0,
        viewCount: post.view_count || 0,
      }));

      if (offset === 0) {
        setPosts(transformedPosts);
        // Cache the fresh data
        cache.set(cacheKey, transformedPosts, 300000); // 5 minutes
      } else {
        setPosts(prev => [...prev, ...transformedPosts]);
      }

      offsetRef.current = offset + transformedPosts.length;
      setHasMore(transformedPosts.length === pageSize);

    } catch (err: any) {
      setError(err.message);
      AnalyticsManager.trackError(err, 'useFeed.fetchPosts');
    }
  }, [userId, category, groupId, pageSize, getCacheKey, cache]);

  // Load more posts
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    await fetchPosts(offsetRef.current);
    setLoading(false);
  }, [loading, hasMore, fetchPosts]);

  // Refresh posts
  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    offsetRef.current = 0;
    setHasMore(true);
    await fetchPosts(0, true);
    setRefreshing(false);
  }, [fetchPosts]);

  // Handle reaction
  const handleReaction = useCallback(async (postId: string, reactionType: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Optimistic update
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        const hasReacted = post.userHasReacted.includes(reactionType);
        if (hasReacted) return post; // Already reacted

        const newReactions = { ...post.reactions };
        newReactions[reactionType] += 1;
        
        const points = reactionType === 'couronne' ? 20 : 10;
        
        return {
          ...post,
          reactions: newReactions,
          userHasReacted: [...post.userHasReacted, reactionType],
          glowPoints: post.glowPoints + points,
        };
      }
      return post;
    }));

    try {
      const { error } = await supabase
        .from('reactions')
        .insert({
          post_id: postId,
          user_id: user.id,
          kind: reactionType,
        });

      if (error) throw error;

      AnalyticsManager.trackEvent('reaction_added', {
        postId,
        reactionType,
        userId: user.id,
      });

    } catch (err: any) {
      // Revert optimistic update on error
      setPosts(prev => prev.map(post => {
        if (post.id === postId) {
          const newReactions = { ...post.reactions };
          newReactions[reactionType] -= 1;
          
          const points = reactionType === 'couronne' ? 20 : 10;
          
          return {
            ...post,
            reactions: newReactions,
            userHasReacted: post.userHasReacted.filter(r => r !== reactionType),
            glowPoints: post.glowPoints - points,
          };
        }
        return post;
      }));
      
      setError(err.message);
    }
  }, []);

  // Handle comment
  const handleComment = useCallback((postId: string) => {
    AnalyticsManager.trackEvent('comment_initiated', { postId });
    // Navigate to comment screen
  }, []);

  // Handle share
  const handleShare = useCallback(async (postId: string) => {
    try {
      // Implement share functionality
      AnalyticsManager.trackEvent('post_shared', { postId });
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  // Handle user press
  const handleUserPress = useCallback((userId: string) => {
    AnalyticsManager.trackEvent('user_profile_viewed', { userId });
    // Navigate to user profile
  }, []);

  // Setup real-time subscriptions
  useEffect(() => {
    if (!posts.length) return;

    const postIds = posts.map(p => p.id);
    
    const channel = supabase
      .channel('feed-reactions')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'reactions',
        filter: `post_id=in.(${postIds.join(',')})`
      }, (payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        const record = newRecord || oldRecord;
        
        setPosts(prev => prev.map(post => {
          if (post.id === record.post_id) {
            const newReactions = { ...post.reactions };
            const points = record.kind === 'couronne' ? 20 : 10;
            
            if (eventType === 'INSERT') {
              newReactions[record.kind] += 1;
              return {
                ...post,
                reactions: newReactions,
                glowPoints: post.glowPoints + points,
              };
            } else if (eventType === 'DELETE') {
              newReactions[record.kind] = Math.max(0, newReactions[record.kind] - 1);
              return {
                ...post,
                reactions: newReactions,
                glowPoints: Math.max(0, post.glowPoints - points),
              };
            }
          }
          return post;
        }));
      })
      .subscribe();

    realtimeChannelRef.current = channel;

    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
      }
    };
  }, [posts]);

  // Initial load
  useEffect(() => {
    fetchPosts(0);
  }, [fetchPosts]);

  return {
    posts,
    loading,
    refreshing,
    hasMore,
    error,
    loadMore,
    refresh,
    handleReaction,
    handleComment,
    handleShare,
    handleUserPress,
  };
}

// Utility function
function timeSince(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  const intervals: [number, string][] = [
    [31536000, 'an'],
    [2592000, 'mois'],
    [86400, 'j'],
    [3600, 'h'],
    [60, 'min']
  ];
  
  for (const [seconds_in_interval, label] of intervals) {
    const interval = Math.floor(seconds / seconds_in_interval);
    if (interval >= 1) {
      return `${interval}${label}`;
    }
  }
  
  return `${seconds}s`;
}
```

### 2. Real-time Messaging Hook

```typescript
// hooks/useMessages.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { OfflineManager } from '@/lib/offline';
import NetInfo from '@react-native-community/netinfo';

interface Message {
  id: string;
  content?: string;
  message_type: 'text' | 'image' | 'voice' | 'file';
  media_url?: string;
  media_metadata?: any;
  sender_id: string;
  receiver_id?: string;
  group_id?: string;
  reply_to?: string;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  sender?: {
    id: string;
    username: string;
    avatar_url: string;
  };
}

interface TypingUser {
  id: string;
  username: string;
}

export function useMessages(conversationId: string, isGroup = false) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState<TypingUser[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const offsetRef = useRef(0);
  const channelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const offlineManager = OfflineManager.getInstance();

  // Fetch messages
  const fetchMessages = useCallback(async (offset = 0) => {
    if (loading) return;
    
    setLoading(true);
    try {
      const table = isGroup ? 'group_messages' : 'direct_messages';
      const filterColumn = isGroup ? 'group_id' : 
        `or(and(sender_id.eq.${conversationId},receiver_id.eq.${(await supabase.auth.getUser()).data.user?.id}),and(sender_id.eq.${(await supabase.auth.getUser()).data.user?.id},receiver_id.eq.${conversationId}))`;

      let query = supabase
        .from(table)
        .select(`
          id, content, message_type, media_url, media_metadata,
          sender_id, receiver_id, group_id, reply_to, is_edited,
          created_at, updated_at,
          profiles:sender_id (id, username, avatar_url)
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + 49);

      if (isGroup) {
        query = query.eq('group_id', conversationId);
      } else {
        // For direct messages, we need a more complex filter
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');
        
        query = query.or(`and(sender_id.eq.${user.id},receiver_id.eq.${conversationId}),and(sender_id.eq.${conversationId},receiver_id.eq.${user.id})`);
      }

      const { data, error: fetchError } = await query;
      
      if (fetchError) throw fetchError;

      const transformedMessages: Message[] = (data || []).reverse().map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        message_type: msg.message_type,
        media_url: msg.media_url,
        media_metadata: msg.media_metadata,
        sender_id: msg.sender_id,
        receiver_id: msg.receiver_id,
        group_id: msg.group_id,
        reply_to: msg.reply_to,
        is_edited: msg.is_edited,
        created_at: msg.created_at,
        updated_at: msg.updated_at,
        sender: msg.profiles ? {
          id: msg.profiles.id,
          username: msg.profiles.username,
          avatar_url: msg.profiles.avatar_url,
        } : undefined,
      }));

      if (offset === 0) {
        setMessages(transformedMessages);
      } else {
        setMessages(prev => [...transformedMessages, ...prev]);
      }

      offsetRef.current = offset + transformedMessages.length;
      setHasMore(transformedMessages.length === 50);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [conversationId, isGroup, loading]);

  // Send message
  const sendMessage = useCallback(async (
    content: string,
    messageType: 'text' | 'image' | 'voice' | 'file' = 'text',
    mediaUrl?: string,
    mediaMetadata?: any,
    replyTo?: string
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const messageData = {
      content: messageType === 'text' ? content : undefined,
      message_type: messageType,
      media_url: mediaUrl,
      media_metadata: mediaMetadata,
      sender_id: user.id,
      reply_to: replyTo,
      ...(isGroup ? { group_id: conversationId } : { receiver_id: conversationId }),
    };

    // Check if online
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      // Queue for offline sending
      await offlineManager.queueAction({
        id: Date.now().toString(),
        type: 'send_message',
        data: messageData,
        timestamp: Date.now(),
      });
      return;
    }

    try {
      const table = isGroup ? 'group_messages' : 'direct_messages';
      const { error } = await supabase
        .from(table)
        .insert(messageData);

      if (error) throw error;

    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [conversationId, isGroup, offlineManager]);

  // Send typing indicator
  const sendTyping = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !channelRef.current) return;

    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        user_id: user.id,
        username: user.user_metadata?.username || 'User',
      },
    });

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 3 seconds
    typingTimeoutRef.current = setTimeout(() => {
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'stop_typing',
          payload: { user_id: user.id },
        });
      }
    }, 3000);
  }, []);

  // Mark messages as read
  const markAsRead = useCallback(async () => {
    if (isGroup) return; // Group messages don't have read status

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      await supabase
        .from('direct_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('sender_id', conversationId)
        .eq('receiver_id', user.id)
        .is('read_at', null);
    } catch (err: any) {
      console.error('Error marking messages as read:', err);
    }
  }, [conversationId, isGroup]);

  // Load more messages
  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      fetchMessages(offsetRef.current);
    }
  }, [hasMore, loading, fetchMessages]);

  // Setup real-time subscriptions
  useEffect(() => {
    const { data: { user } } = supabase.auth.getUser();
    
    const channelName = isGroup ? `group-${conversationId}` : `dm-${conversationId}`;
    const channel = supabase.channel(channelName);

    // Listen for new messages
    const table = isGroup ? 'group_messages' : 'direct_messages';
    const filter = isGroup ? `group_id=eq.${conversationId}` : 
      `or(and(sender_id.eq.${conversationId},receiver_id.eq.${user?.id}),and(sender_id.eq.${user?.id},receiver_id.eq.${conversationId}))`;

    channel.on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table,
      filter,
    }, async (payload) => {
      const newMessage = payload.new as any;
      
      // Fetch sender profile
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .eq('id', newMessage.sender_id)
        .single();

      const transformedMessage: Message = {
        id: newMessage.id,
        content: newMessage.content,
        message_type: newMessage.message_type,
        media_url: newMessage.media_url,
        media_metadata: newMessage.media_metadata,
        sender_id: newMessage.sender_id,
        receiver_id: newMessage.receiver_id,
        group_id: newMessage.group_id,
        reply_to: newMessage.reply_to,
        is_edited: newMessage.is_edited,
        created_at: newMessage.created_at,
        updated_at: newMessage.updated_at,
        sender: senderProfile,
      };

      setMessages(prev => [...prev, transformedMessage]);
    });

    // Listen for typing indicators
    channel.on('broadcast', { event: 'typing' }, (payload) => {
      const { user_id, username } = payload.payload;
      if (user_id === user?.id) return; // Don't show own typing

      setTyping(prev => {
        const existing = prev.find(u => u.id === user_id);
        if (existing) return prev;
        return [...prev, { id: user_id, username }];
      });
    });

    channel.on('broadcast', { event: 'stop_typing' }, (payload) => {
      const { user_id } = payload.payload;
      setTyping(prev => prev.filter(u => u.id !== user_id));
    });

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [conversationId, isGroup]);

  // Initial load and mark as read
  useEffect(() => {
    fetchMessages(0);
    markAsRead();
  }, [fetchMessages, markAsRead]);

  return {
    messages,
    loading,
    typing,
    hasMore,
    error,
    sendMessage,
    sendTyping,
    markAsRead,
    loadMore,
  };
}
```

### 3. Gamification Hook

```typescript
// hooks/useGamification.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { AnalyticsManager } from '@/lib/analytics';
import * as Haptics from 'expo-haptics';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  criteria: any;
  earned_at?: string;
}

interface UserStats {
  glowPoints: number;
  streakCount: number;
  lastActivity: string;
  achievements: Achievement[];
  level: number;
  nextLevelPoints: number;
  rank: number;
}

export function useGamification(userId?: string) {
  const [stats, setStats] = useState<UserStats>({
    glowPoints: 0,
    streakCount: 0,
    lastActivity: '',
    achievements: [],
    level: 1,
    nextLevelPoints: 100,
    rank: 0,
  });
  const [loading, setLoading] = useState(false);
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);

  // Calculate level from points
  const calculateLevel = useCallback((points: number) => {
    // Level formula: level = floor(sqrt(points / 100)) + 1
    const level = Math.floor(Math.sqrt(points / 100)) + 1;
    const nextLevelPoints = Math.pow(level, 2) * 100;
    return { level, nextLevelPoints };
  }, []);

  // Fetch user stats
  const fetchStats = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      // Get user profile with stats
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('glow_points, streak_count, last_activity')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      // Get user achievements
      const { data: userAchievements, error: achievementsError } = await supabase
        .from('user_achievements')
        .select(`
          earned_at,
          achievements (id, name, description, icon, points, criteria)
        `)
        .eq('user_id', userId)
        .order('earned_at', { ascending: false });

      if (achievementsError) throw achievementsError;

      // Get user rank
      const { data: rankData, error: rankError } = await supabase
        .rpc('get_user_rank', { user_id: userId });

      if (rankError) console.error('Error fetching rank:', rankError);

      const { level, nextLevelPoints } = calculateLevel(profile.glow_points);

      setStats({
        glowPoints: profile.glow_points,
        streakCount: profile.streak_count,
        lastActivity: profile.last_activity,
        achievements: userAchievements?.map((ua: any) => ({
          ...ua.achievements,
          earned_at: ua.earned_at,
        })) || [],
        level,
        nextLevelPoints,
        rank: rankData || 0,
      });

    } catch (err: any) {
      console.error('Error fetching gamification stats:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, calculateLevel]);

  // Award points
  const awardPoints = useCallback(async (
    points: number, 
    reason: string,
    showNotification = true
  ) => {
    if (!userId) return;

    try {
      const { error } = await supabase.rpc('award_points', {
        user_id: userId,
        points,
        reason,
      });

      if (error) throw error;

      // Update local stats
      setStats(prev => {
        const newPoints = prev.glowPoints + points;
        const { level, nextLevelPoints } = calculateLevel(newPoints);
        
        // Check for level up
        if (level > prev.level && showNotification) {
          // Trigger level up celebration
          if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
          
          AnalyticsManager.trackEvent('level_up', {
            userId,
            newLevel: level,
            points: newPoints,
          });
        }

        return {
          ...prev,
          glowPoints: newPoints,
          level,
          nextLevelPoints,
        };
      });

      // Check for new achievements
      await checkAchievements();

    } catch (err: any) {
      console.error('Error awarding points:', err);
    }
  }, [userId, calculateLevel]);

  // Check for new achievements
  const checkAchievements = useCallback(async () => {
    if (!userId) return;

    try {
      const { data: newAchievements, error } = await supabase
        .rpc('check_user_achievements', { user_id: userId });

      if (error) throw error;

      if (newAchievements && newAchievements.length > 0) {
        setNewAchievements(newAchievements);
        
        // Trigger achievement notification
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        newAchievements.forEach((achievement: Achievement) => {
          AnalyticsManager.trackEvent('achievement_earned', {
            userId,
            achievementId: achievement.id,
            achievementName: achievement.name,
          });
        });

        // Update local achievements
        setStats(prev => ({
          ...prev,
          achievements: [...prev.achievements, ...newAchievements],
        }));
      }

    } catch (err: any) {
      console.error('Error checking achievements:', err);
    }
  }, [userId]);

  // Update streak
  const updateStreak = useCallback(async () => {
    if (!userId) return;

    try {
      const { error } = await supabase.rpc('update_user_streak', {
        user_id: userId,
      });

      if (error) throw error;

      // Refresh stats to get updated streak
      await fetchStats();

    } catch (err: any) {
      console.error('Error updating streak:', err);
    }
  }, [userId, fetchStats]);

  // Dismiss new achievements
  const dismissNewAchievements = useCallback(() => {
    setNewAchievements([]);
  }, []);

  // Get leaderboard
  const getLeaderboard = useCallback(async (timeframe: 'daily' | 'weekly' | 'monthly' | 'all' = 'weekly') => {
    try {
      const { data, error } = await supabase
        .rpc('get_leaderboard', { timeframe });

      if (error) throw error;
      return data || [];

    } catch (err: any) {
      console.error('Error fetching leaderboard:', err);
      return [];
    }
  }, []);

  // Initialize
  useEffect(() => {
    if (userId) {
      fetchStats();
    }
  }, [userId, fetchStats]);

  return {
    stats,
    loading,
    newAchievements,
    awardPoints,
    checkAchievements,
    updateStreak,
    dismissNewAchievements,
    getLeaderboard,
    refresh: fetchStats,
  };
}
```

### 4. Media Processing Hook

```typescript
// hooks/useMedia.ts
import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '@/lib/supabase';
import { MediaProcessor } from '@/lib/media';

interface MediaItem {
  id: string;
  uri: string;
  type: 'image' | 'video';
  metadata: {
    width: number;
    height: number;
    size: number;
    duration?: number;
  };
}

interface UploadProgress {
  id: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  url?: string;
  error?: string;
}

export function useMedia() {
  const [selectedMedia, setSelectedMedia] = useState<MediaItem[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, UploadProgress>>({});
  const [processing, setProcessing] = useState(false);

  // Pick images from gallery
  const pickImages = useCallback(async (maxCount = 4) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      throw new Error('Permission to access media library is required');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      quality: 0.9,
      selectionLimit: maxCount,
    });

    if (!result.canceled) {
      const mediaItems: MediaItem[] = result.assets.map(asset => ({
        id: Date.now().toString() + Math.random().toString(36),
        uri: asset.uri,
        type: asset.type === 'video' ? 'video' : 'image',
        metadata: {
          width: asset.width || 0,
          height: asset.height || 0,
          size: asset.fileSize || 0,
          duration: asset.duration,
        },
      }));

      setSelectedMedia(prev => [...prev, ...mediaItems].slice(0, maxCount));
    }
  }, []);

  // Take photo with camera
  const takePhoto = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      throw new Error('Permission to access camera is required');
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      const mediaItem: MediaItem = {
        id: Date.now().toString(),
        uri: asset.uri,
        type: 'image',
        metadata: {
          width: asset.width || 0,
          height: asset.height || 0,
          size: asset.fileSize || 0,
        },
      };

      setSelectedMedia(prev => [...prev, mediaItem]);
    }
  }, []);

  // Process and compress media
  const processMedia = useCallback(async (mediaItem: MediaItem) => {
    setProcessing(true);
    try {
      if (mediaItem.type === 'image') {
        // Compress and resize image
        const manipulatedImage = await ImageManipulator.manipulateAsync(
          mediaItem.uri,
          [
            { resize: { width: 1080 } }, // Max width 1080px
          ],
          {
            compress: 0.8,
            format: ImageManipulator.SaveFormat.JPEG,
          }
        );

        return {
          ...mediaItem,
          uri: manipulatedImage.uri,
          metadata: {
            ...mediaItem.metadata,
            width: manipulatedImage.width,
            height: manipulatedImage.height,
          },
        };
      }

      // For videos, we might want to compress or generate thumbnail
      return mediaItem;

    } catch (error) {
      console.error('Error processing media:', error);
      return mediaItem;
    } finally {
      setProcessing(false);
    }
  }, []);

  // Upload media to Supabase
  const uploadMedia = useCallback(async (
    mediaItem: MediaItem,
    bucket: string = 'posts'
  ): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const fileExt = mediaItem.type === 'video' ? 'mp4' : 'jpg';
    const fileName = `${mediaItem.id}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    // Initialize upload progress
    setUploadProgress(prev => ({
      ...prev,
      [mediaItem.id]: {
        id: mediaItem.id,
        progress: 0,
        status: 'uploading',
      },
    }));

    try {
      // Convert URI to blob
      const response = await fetch(mediaItem.uri);
      const blob = await response.blob();

      // Upload with progress tracking
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, blob, {
          contentType: mediaItem.type === 'video' ? 'video/mp4' : 'image/jpeg',
          upsert: false,
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      // Update progress to completed
      setUploadProgress(prev => ({
        ...prev,
        [mediaItem.id]: {
          id: mediaItem.id,
          progress: 100,
          status: 'completed',
          url: urlData.publicUrl,
        },
      }));

      return urlData.publicUrl;

    } catch (error: any) {
      // Update progress to error
      setUploadProgress(prev => ({
        ...prev,
        [mediaItem.id]: {
          id: mediaItem.id,
          progress: 0,
          status: 'error',
          error: error.message,
        },
      }));

      throw error;
    }
  }, []);

  // Upload multiple media items
  const uploadMultipleMedia = useCallback(async (
    mediaItems: MediaItem[],
    bucket: string = 'posts'
  ): Promise<string[]> => {
    const uploadPromises = mediaItems.map(item => uploadMedia(item, bucket));
    return Promise.all(uploadPromises);
  }, [uploadMedia]);

  // Remove media item
  const removeMedia = useCallback((mediaId: string) => {
    setSelectedMedia(prev => prev.filter(item => item.id !== mediaId));
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[mediaId];
      return newProgress;
    });
  }, []);

  // Clear all media
  const clearMedia = useCallback(() => {
    setSelectedMedia([]);
    setUploadProgress({});
  }, []);

  // Reorder media
  const reorderMedia = useCallback((fromIndex: number, toIndex: number) => {
    setSelectedMedia(prev => {
      const newMedia = [...prev];
      const [removed] = newMedia.splice(fromIndex, 1);
      newMedia.splice(toIndex, 0, removed);
      return newMedia;
    });
  }, []);

  return {
    selectedMedia,
    uploadProgress,
    processing,
    pickImages,
    takePhoto,
    processMedia,
    uploadMedia,
    uploadMultipleMedia,
    removeMedia,
    clearMedia,
    reorderMedia,
  };
}
```

These hooks provide comprehensive functionality for the enhanced Gloup ✨ application, covering feed management, real-time messaging, gamification, and media processing with proper error handling, caching, and offline support.