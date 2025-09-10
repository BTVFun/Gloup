// Enhanced Feed Hook with Caching and Real-time Updates
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { CacheManager, CacheKeys } from '@/lib/cache';
import { AnalyticsManager, PerformanceTracker } from '@/lib/analytics';
import { OfflineManager, OfflineActions } from '@/lib/offline';

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
  const offlineManager = OfflineManager.getInstance();
  const realtimeChannelRef = useRef<any>(null);

  // Generate cache key based on options
  const getCacheKey = useCallback(() => {
    return CacheKeys.feed(userId, category);
  }, [userId, category]);

  // Fetch posts from API with performance tracking
  const fetchPosts = useCallback(async (offset = 0, isRefresh = false) => {
    if (loading) return;
    
    setLoading(true);
    setError(null);

    try {
      const cacheKey = getCacheKey();
      
      // Try cache first for initial load
      if (offset === 0 && !isRefresh) {
        const cachedPosts = await cache.get<FeedPost[]>(cacheKey);
        if (cachedPosts && cachedPosts.length > 0) {
          setPosts(cachedPosts);
          setLoading(false);
          return;
        }
      }

      // Track API performance
      const apiStartTime = Date.now();

      let query = supabase
        .from('posts')
        .select(`
          id, content, media_urls, glow_points, created_at,
          profiles:author_id (
            id, username, avatar_url, glow_points
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
      
      AnalyticsManager.trackAPICall('/posts', 'GET', Date.now() - apiStartTime, postsError ? 500 : 200);
      
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
          isVerified: false, // Temporarily set to false until column is added
        },
        content: post.content || '',
        media_urls: post.media_urls || [],
        media_metadata: {}, // Temporarily empty until column is added
        glowPoints: post.glow_points || 0,
        reactions: reactionMap.get(post.id)!,
        userHasReacted: userReactionMap.get(post.id)!,
        timestamp: timeSince(new Date(post.created_at)),
        replyCount: 0, // Temporarily set to 0 until column is added
        shareCount: 0, // Temporarily set to 0 until column is added
        viewCount: 0, // Temporarily set to 0 until column is added
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

      // Track successful load
      AnalyticsManager.trackEvent('feed_loaded', {
        postsCount: transformedPosts.length,
        offset,
        hasMore: transformedPosts.length === pageSize,
      });

    } catch (err: any) {
      setError(err.message);
      AnalyticsManager.trackError(err, 'useFeed.fetchPosts');
    } finally {
      setLoading(false);
    }
  }, [userId, category, groupId, pageSize, getCacheKey, cache, loading]);

  // Load more posts
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    
    AnalyticsManager.trackEvent('feed_load_more', {
      currentCount: posts.length,
      offset: offsetRef.current,
    });
    
    await fetchPosts(offsetRef.current);
  }, [loading, hasMore, fetchPosts, posts.length]);

  // Refresh posts
  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    offsetRef.current = 0;
    setHasMore(true);
    
    AnalyticsManager.trackEvent('feed_refresh');
    
    await fetchPosts(0, true);
    setRefreshing(false);
  }, [fetchPosts]);

  // Handle reaction with offline support
  const handleReaction = useCallback(async (postId: string, reactionType: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check if user already reacted with this type
    const post = posts.find(p => p.id === postId);
    if (post?.userHasReacted.includes(reactionType)) {
      return; // Already reacted
    }

    // Optimistic update
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
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
      // Check if online
      if (!offlineManager.isOnline()) {
        // Queue for offline processing
        await offlineManager.queueAction(
          OfflineActions.addReaction({
            post_id: postId,
            user_id: user.id,
            kind: reactionType,
          })
        );
        return;
      }

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
      AnalyticsManager.trackError(err, 'useFeed.handleReaction');
    }
  }, [posts, offlineManager]);

  // Handle comment
  const handleComment = useCallback((postId: string) => {
    AnalyticsManager.trackEvent('comment_initiated', { postId });
    // Navigate to comment screen - would be implemented by the component
  }, []);

  // Handle share
  const handleShare = useCallback(async (postId: string) => {
    try {
      AnalyticsManager.trackEvent('post_shared', { postId });
      // Implement share functionality
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  // Handle user press
  const handleUserPress = useCallback((userId: string) => {
    AnalyticsManager.trackEvent('user_profile_viewed', { userId });
    // Navigate to user profile - would be implemented by the component
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

export { useFeed }