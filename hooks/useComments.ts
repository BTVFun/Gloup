// Comments System Hook with Threading Support
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase-client';
import { realtimeManager } from '@/lib/realtime-manager';
import { AnalyticsManager } from '@/lib/analytics';
import { OfflineManager, OfflineActions } from '@/lib/offline';

interface Comment {
  id: string;
  content: string;
  author: {
    id: string;
    username: string;
    avatar_url: string;
    is_verified: boolean;
  };
  depth: number;
  parent_id: string | null;
  reply_count: number;
  like_count: number;
  user_has_liked: boolean;
  created_at: string;
  replies?: Comment[];
}

interface UseCommentsOptions {
  postId: string;
  maxDepth?: number;
  pageSize?: number;
}

export function useComments({ postId, maxDepth = 3, pageSize = 20 }: UseCommentsOptions) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const offlineManager = OfflineManager.getInstance();

  // Load comments with threading
  const loadComments = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      
      // Get comments with author info
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select(`
          id, content, depth, parent_id, reply_count, like_count, created_at,
          profiles:author_id (
            id, username, full_name, avatar_url, is_verified
          )
        `)
        .eq('post_id', postId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })
        .range(isRefresh ? 0 : offset, (isRefresh ? 0 : offset) + pageSize - 1);

      if (commentsError) throw commentsError;

      // Get user's likes for these comments
      let userLikes: any[] = [];
      if (user && commentsData?.length) {
        const commentIds = commentsData.map(c => c.id);
        const { data: likesData } = await supabase
          .from('comment_likes')
          .select('comment_id')
          .eq('user_id', user.id)
          .in('comment_id', commentIds);
        
        userLikes = likesData || [];
      }

      const userLikedComments = new Set(userLikes.map(l => l.comment_id));

      // Transform and organize comments
      const transformedComments: Comment[] = (commentsData || []).map((comment: any) => ({
        id: comment.id,
        content: comment.content,
        author: {
          id: comment.profiles?.id || '',
          username: comment.profiles?.username || comment.profiles?.full_name || 'Utilisateur',
          avatar_url: comment.profiles?.avatar_url || 'https://placehold.co/40x40/png',
          is_verified: comment.profiles?.is_verified || false,
        },
        depth: comment.depth,
        parent_id: comment.parent_id,
        reply_count: comment.reply_count,
        like_count: comment.like_count,
        user_has_liked: userLikedComments.has(comment.id),
        created_at: timeSince(new Date(comment.created_at)),
        replies: [],
      }));

      // Organize into threaded structure
      const organizedComments = organizeComments(transformedComments, maxDepth);

      if (isRefresh) {
        setComments(organizedComments);
        setOffset(organizedComments.length);
      } else {
        setComments(prev => [...prev, ...organizedComments]);
        setOffset(prev => prev + organizedComments.length);
      }

      setHasMore(commentsData?.length === pageSize);

    } catch (error: any) {
      setError(error.message);
      AnalyticsManager.trackError(error, 'useComments.loadComments');
    } finally {
      setLoading(false);
    }
  }, [postId, maxDepth, pageSize, offset]);

  // Add comment
  const addComment = useCallback(async (content: string, parentId?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setSubmitting(true);

    try {
      // Calculate depth
      let depth = 0;
      if (parentId) {
        const parentComment = findCommentById(comments, parentId);
        depth = Math.min((parentComment?.depth || 0) + 1, maxDepth);
      }

      const commentData = {
        post_id: postId,
        author_id: user.id,
        parent_id: parentId || null,
        content: content.trim(),
        depth,
      };

      // Check if online
      if (!offlineManager.isOnline()) {
        await offlineManager.queueAction(
          OfflineActions.addComment(commentData)
        );
        return;
      }

      const { data: newComment, error } = await supabase
        .from('comments')
        .insert(commentData)
        .select(`
          id, content, depth, parent_id, reply_count, like_count, created_at,
          profiles:author_id (
            id, username, full_name, avatar_url, is_verified
          )
        `)
        .single();

      if (error) throw error;

      // Transform new comment
      const transformedComment: Comment = {
        id: newComment.id,
        content: newComment.content,
        author: {
          id: newComment.profiles?.id || user.id,
          username: newComment.profiles?.username || user.email?.split('@')[0] || 'Vous',
          avatar_url: newComment.profiles?.avatar_url || 'https://placehold.co/40x40/png',
          is_verified: newComment.profiles?.is_verified || false,
        },
        depth: newComment.depth,
        parent_id: newComment.parent_id,
        reply_count: 0,
        like_count: 0,
        user_has_liked: false,
        created_at: 'maintenant',
        replies: [],
      };

      // Add to comments list
      if (parentId) {
        // Add as reply to parent
        setComments(prev => addReplyToComment(prev, parentId, transformedComment));
      } else {
        // Add as top-level comment
        setComments(prev => [...prev, transformedComment]);
      }

      AnalyticsManager.trackEvent('comment_added', {
        postId,
        parentId,
        depth,
        userId: user.id,
      });

    } catch (error: any) {
      setError(error.message);
      AnalyticsManager.trackError(error, 'useComments.addComment');
    } finally {
      setSubmitting(false);
    }
  }, [postId, comments, maxDepth, offlineManager]);

  // Like comment
  const likeComment = useCallback(async (commentId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Optimistic update
    setComments(prev => updateCommentLike(prev, commentId, true));

    try {
      const { error } = await supabase
        .from('comment_likes')
        .insert({
          comment_id: commentId,
          user_id: user.id,
        });

      if (error) throw error;

      AnalyticsManager.trackEvent('comment_liked', {
        commentId,
        postId,
        userId: user.id,
      });

    } catch (error: any) {
      // Revert optimistic update
      setComments(prev => updateCommentLike(prev, commentId, false));
      AnalyticsManager.trackError(error, 'useComments.likeComment');
    }
  }, [postId]);

  // Unlike comment
  const unlikeComment = useCallback(async (commentId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Optimistic update
    setComments(prev => updateCommentLike(prev, commentId, false));

    try {
      const { error } = await supabase
        .from('comment_likes')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', user.id);

      if (error) throw error;

    } catch (error: any) {
      // Revert optimistic update
      setComments(prev => updateCommentLike(prev, commentId, true));
      AnalyticsManager.trackError(error, 'useComments.unlikeComment');
    }
  }, []);

  // Load more comments
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      loadComments(false);
    }
  }, [loading, hasMore, loadComments]);

  // Refresh comments
  const refresh = useCallback(() => {
    setOffset(0);
    loadComments(true);
  }, [loadComments]);

  // Subscribe to realtime updates
  useEffect(() => {
    const channelId = realtimeManager.subscribe(`comments-${postId}`, {
      table: 'comments',
      event: 'INSERT',
      filter: `post_id=eq.${postId}`,
      callback: (payload) => {
        // Handle new comment from realtime
        const newComment = payload.new as any;
        
        // Don't add if it's from current user (already added optimistically)
        const { data: { user } } = supabase.auth.getUser();
        if (user && newComment.author_id === user.id) return;

        // Add the new comment to the list
        // This would need the full comment data with author info
        refresh(); // For now, just refresh to get complete data
      },
    });

    return () => realtimeManager.unsubscribe(channelId);
  }, [postId, refresh]);

  // Initial load
  useEffect(() => {
    loadComments(true);
  }, [postId]);

  return {
    comments,
    loading,
    submitting,
    error,
    hasMore,
    addComment,
    likeComment,
    unlikeComment,
    loadMore,
    refresh,
  };
}

// Utility functions
function organizeComments(comments: Comment[], maxDepth: number): Comment[] {
  const commentMap = new Map<string, Comment>();
  const rootComments: Comment[] = [];

  // First pass: create map and identify root comments
  comments.forEach(comment => {
    commentMap.set(comment.id, { ...comment, replies: [] });
    if (!comment.parent_id) {
      rootComments.push(commentMap.get(comment.id)!);
    }
  });

  // Second pass: organize replies
  comments.forEach(comment => {
    if (comment.parent_id && comment.depth <= maxDepth) {
      const parent = commentMap.get(comment.parent_id);
      const child = commentMap.get(comment.id);
      if (parent && child) {
        parent.replies!.push(child);
      }
    }
  });

  return rootComments;
}

function findCommentById(comments: Comment[], id: string): Comment | null {
  for (const comment of comments) {
    if (comment.id === id) return comment;
    if (comment.replies) {
      const found = findCommentById(comment.replies, id);
      if (found) return found;
    }
  }
  return null;
}

function addReplyToComment(comments: Comment[], parentId: string, reply: Comment): Comment[] {
  return comments.map(comment => {
    if (comment.id === parentId) {
      return {
        ...comment,
        replies: [...(comment.replies || []), reply],
        reply_count: comment.reply_count + 1,
      };
    }
    if (comment.replies) {
      return {
        ...comment,
        replies: addReplyToComment(comment.replies, parentId, reply),
      };
    }
    return comment;
  });
}

function updateCommentLike(comments: Comment[], commentId: string, liked: boolean): Comment[] {
  return comments.map(comment => {
    if (comment.id === commentId) {
      return {
        ...comment,
        user_has_liked: liked,
        like_count: liked ? comment.like_count + 1 : Math.max(0, comment.like_count - 1),
      };
    }
    if (comment.replies) {
      return {
        ...comment,
        replies: updateCommentLike(comment.replies, commentId, liked),
      };
    }
    return comment;
  });
}

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