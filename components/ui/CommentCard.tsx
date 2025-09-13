// Comment Card Component with Threading Support
import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Alert } from 'react-native';
import { Heart, MessageCircle, MoveHorizontal as MoreHorizontal, Crown } from 'lucide-react-native';
import Animated from 'react-native-reanimated';
import { useTheme } from '@/lib/theme-context';
import { useButtonAnimation } from '@/hooks/useAnimation';
import { AnalyticsManager } from '@/lib/analytics';

interface CommentCardProps {
  comment: {
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
    replies?: any[];
  };
  onLike: (commentId: string) => void;
  onReply: (commentId: string, parentId?: string) => void;
  onUserPress: (userId: string) => void;
  onReport?: (commentId: string) => void;
  maxDepth?: number;
}

export function CommentCard({
  comment,
  onLike,
  onReply,
  onUserPress,
  onReport,
  maxDepth = 3,
}: CommentCardProps) {
  const { theme } = useTheme();
  const [showReplies, setShowReplies] = useState(false);
  const likeAnimation = useButtonAnimation();

  const handleLike = useCallback(() => {
    likeAnimation.celebrate();
    onLike(comment.id);
    
    AnalyticsManager.trackUserAction('like', 'comment', {
      commentId: comment.id,
      authorId: comment.author.id,
    });
  }, [comment.id, comment.author.id, onLike, likeAnimation]);

  const handleReply = useCallback(() => {
    onReply(comment.id, comment.parent_id);
    
    AnalyticsManager.trackUserAction('reply', 'comment', {
      commentId: comment.id,
      authorId: comment.author.id,
      depth: comment.depth,
    });
  }, [comment.id, comment.parent_id, comment.author.id, comment.depth, onReply]);

  const handleUserPress = useCallback(() => {
    onUserPress(comment.author.id);
  }, [comment.author.id, onUserPress]);

  const handleReport = useCallback(() => {
    if (onReport) {
      Alert.alert(
        'Signaler ce commentaire',
        'Voulez-vous signaler ce commentaire comme inapproprié ?',
        [
          { text: 'Annuler', style: 'cancel' },
          { 
            text: 'Signaler', 
            style: 'destructive',
            onPress: () => onReport(comment.id)
          }
        ]
      );
    }
  }, [comment.id, onReport]);

  const indentWidth = Math.min(comment.depth * 20, maxDepth * 20);

  return (
    <View style={[styles.container, { marginLeft: indentWidth }]}>
      <View style={[styles.commentCard, { 
        backgroundColor: theme.surface.container,
        borderLeftWidth: comment.depth > 0 ? 2 : 0,
        borderLeftColor: theme.color.brand[200],
      }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.authorSection}
            onPress={handleUserPress}
            activeOpacity={0.7}
          >
            <Image 
              source={{ uri: comment.author.avatar_url || 'https://placehold.co/32x32/png' }}
              style={styles.avatar}
            />
            <View style={styles.authorInfo}>
              <View style={styles.nameContainer}>
                <Text style={[styles.authorName, { 
                  color: theme.text.primary,
                  fontFamily: theme.typography.fontFamily,
                  fontWeight: theme.typography.weights.semibold,
                }]}>
                  {comment.author.username}
                </Text>
                {comment.author.is_verified && (
                  <Crown size={12} color="#FFD700" style={{ marginLeft: 4 }} />
                )}
              </View>
              <Text style={[styles.timestamp, { 
                color: theme.text.muted,
                fontFamily: theme.typography.fontFamily,
              }]}>
                {comment.created_at}
              </Text>
            </View>
          </TouchableOpacity>

          {onReport && (
            <TouchableOpacity 
              style={styles.moreButton}
              onPress={handleReport}
            >
              <MoreHorizontal size={16} color={theme.text.muted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Content */}
        <Text style={[styles.content, { 
          color: theme.text.primary,
          fontFamily: theme.typography.fontFamily,
          fontSize: theme.typography.body.md,
          lineHeight: theme.typography.body.md * theme.typography.lineHeights.normal,
        }]}>
          {comment.content}
        </Text>

        {/* Actions */}
        <View style={styles.actions}>
          <Animated.View style={likeAnimation.animatedStyle}>
            <TouchableOpacity 
              style={[styles.actionButton, comment.user_has_liked && { 
                backgroundColor: theme.color.danger[50] 
              }]}
              onPress={handleLike}
            >
              <Heart 
                size={16} 
                color={comment.user_has_liked ? theme.color.danger[500] : theme.text.muted}
                fill={comment.user_has_liked ? theme.color.danger[500] : 'transparent'}
              />
              {comment.like_count > 0 && (
                <Text style={[styles.actionCount, { 
                  color: comment.user_has_liked ? theme.color.danger[500] : theme.text.muted,
                  fontFamily: theme.typography.fontFamily,
                }]}>
                  {comment.like_count}
                </Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          {comment.depth < maxDepth && (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleReply}
            >
              <MessageCircle size={16} color={theme.text.muted} />
              <Text style={[styles.actionText, { 
                color: theme.text.muted,
                fontFamily: theme.typography.fontFamily,
              }]}>
                Répondre
              </Text>
            </TouchableOpacity>
          )}

          {comment.reply_count > 0 && (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => setShowReplies(!showReplies)}
            >
              <Text style={[styles.actionText, { 
                color: theme.color.brand[600],
                fontFamily: theme.typography.fontFamily,
                fontWeight: theme.typography.weights.medium,
              }]}>
                {showReplies ? 'Masquer' : 'Voir'} {comment.reply_count} réponse{comment.reply_count > 1 ? 's' : ''}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Replies */}
        {showReplies && comment.replies && comment.replies.length > 0 && (
          <View style={styles.repliesContainer}>
            {comment.replies.map((reply: any) => (
              <CommentCard
                key={reply.id}
                comment={reply}
                onLike={onLike}
                onReply={onReply}
                onUserPress={onUserPress}
                onReport={onReport}
                maxDepth={maxDepth}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  commentCard: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  authorInfo: {
    flex: 1,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 12,
    marginTop: 2,
  },
  moreButton: {
    padding: 4,
  },
  content: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  actionCount: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  actionText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  repliesContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
});