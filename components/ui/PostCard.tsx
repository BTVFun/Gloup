// Enhanced PostCard Component for Gloup ✨
import React, { useState, useCallback } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform, Alert } from 'react-native';
import { Heart, MessageCircle, Share, Crown, Shirt, Dumbbell, Brain, Shield, Sparkles, MoveHorizontal as MoreHorizontal, MessageSquare, Share2 } from 'lucide-react-native';
import Animated, { useSharedValue, withSpring, useAnimatedStyle } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { MediaCarousel } from './MediaCarousel';
import { AnalyticsManager } from '@/lib/analytics';
import { useTheme } from '@/lib/theme-context';
import { useButtonAnimation, useCardAnimation } from '@/hooks/useAnimation';

interface PostCardProps {
  post: {
    id: string;
    author: {
      id: string;
      name: string;
      avatar: string;
      glowPoints: number;
      isVerified?: boolean;
    };
    content: string;
    media_urls?: string[];
    media_metadata?: any;
    glowPoints: number;
    reactions: Record<string, number>;
    userHasReacted: string[];
    timestamp: string;
    replyCount: number;
    shareCount: number;
    viewCount: number;
  };
  onReaction: (postId: string, type: string) => void;
  onComment: (postId: string) => void;
  onShare: (postId: string) => void;
  onUserPress: (userId: string) => void;
  onOptionsPress?: (postId: string) => void;
}

const reactionIcons = {
  couronne: { icon: Crown, color: '#FFD700', points: 20, label: 'Couronne' },
  vetements: { icon: Shirt, color: '#2B2E78', points: 10, label: 'Style' },
  sport: { icon: Dumbbell, color: '#EF4444', points: 10, label: 'Sport' },
  mental: { icon: Brain, color: '#10B981', points: 10, label: 'Mental' },
  confiance: { icon: Shield, color: '#F59E0B', points: 10, label: 'Confiance' },
  soins: { icon: Sparkles, color: '#EC4899', points: 10, label: 'Soins' },
};

export function PostCard({ 
  post, 
  onReaction, 
  onComment, 
  onShare, 
  onUserPress,
  onOptionsPress 
}: PostCardProps) {
  const { theme } = useTheme();
  const [imageError, setImageError] = useState(false);
  const [showAllReactions, setShowAllReactions] = useState(false);
  const cardAnimation = useCardAnimation();


  const handleReaction = useCallback((type: string) => {
    // Haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    // Celebration animation
    cardAnimation.press();
    setTimeout(() => cardAnimation.release(), 150);
    
    // Analytics
    AnalyticsManager.trackUserAction('reaction', 'post', {
      postId: post.id,
      reactionType: type,
      authorId: post.author.id,
    });
    
    onReaction(post.id, type);
  }, [post.id, post.author.id, onReaction, cardAnimation]);

  const handleComment = useCallback(() => {
    AnalyticsManager.trackUserAction('comment', 'post', {
      postId: post.id,
      authorId: post.author.id,
    });
    onComment(post.id);
  }, [post.id, post.author.id, onComment]);

  const handleShare = useCallback(() => {
    AnalyticsManager.trackUserAction('share', 'post', {
      postId: post.id,
      authorId: post.author.id,
    });
    onShare(post.id);
  }, [post.id, post.author.id, onShare]);

  const handleUserPress = useCallback(() => {
    AnalyticsManager.trackUserAction('profile_view', 'user', {
      userId: post.author.id,
      fromPost: post.id,
    });
    onUserPress(post.author.id);
  }, [post.author.id, post.id, onUserPress]);

  const handleOptionsPress = useCallback(() => {
    if (onOptionsPress) {
      AnalyticsManager.trackUserAction('options', 'post', {
        postId: post.id,
      });
      onOptionsPress(post.id);
    }
  }, [post.id, onOptionsPress]);

  // Get top reactions to display
  const topReactions = Object.entries(post.reactions)
    .filter(([_, count]) => count > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, showAllReactions ? 6 : 3);

  return (
    <Animated.View style={[styles.container, cardAnimation.animatedStyle]}>
      <View style={[styles.card, { 
        backgroundColor: theme.surface.container,
        borderRadius: theme.radius.lg,
        ...theme.elevation[1],
      }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.userSection}
            onPress={handleUserPress}
            activeOpacity={0.7}
          >
            <Image 
              source={{ uri: imageError ? 'https://placehold.co/44x44/png' : post.author.avatar }} 
              style={styles.avatar}
              onError={() => setImageError(true)}
            />
            <View style={styles.userInfo}>
              <View style={styles.nameContainer}>
                <Text style={[styles.userName, { 
                  color: theme.text.primary,
                  fontFamily: theme.typography.fontFamily,
                  fontWeight: theme.typography.weights.semibold,
                }]} numberOfLines={1}>
                  {post.author.name}
                </Text>
                {post.author.isVerified && (
                  <View style={[styles.verifiedBadge, { backgroundColor: theme.color.warning[50] }]}>
                    <Crown size={12} color="#FFD700" />
                  </View>
                )}
              </View>
              <View style={styles.glowContainer}>
                <Sparkles size={12} color="#FFD700" />
                <Text style={[styles.glowPoints, { 
                  color: theme.text.muted,
                  fontFamily: theme.typography.fontFamily,
                }]}>
                  {post.author.glowPoints} Glow Points
                </Text>
              </View>
            </View>
          </TouchableOpacity>
          
          <View style={styles.headerRight}>
            <Text style={[styles.timestamp, { 
              color: theme.text.muted,
              fontFamily: theme.typography.fontFamily,
            }]}>{post.timestamp}</Text>
            {onOptionsPress && (
              <TouchableOpacity 
                style={styles.optionsButton}
                onPress={handleOptionsPress}
              >
                <MoreHorizontal size={20} color={theme.text.muted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Content */}
        {post.content && (
          <Text style={[styles.content, { 
            color: theme.text.primary,
            fontFamily: theme.typography.fontFamily,
            fontSize: theme.typography.body.md,
            lineHeight: theme.typography.body.md * theme.typography.lineHeights.relaxed,
          }]}>{post.content}</Text>
        )}

        {/* Media */}
        {post.media_urls && post.media_urls.length > 0 && (
          <MediaCarousel 
            media={post.media_urls} 
            metadata={post.media_metadata}
          />
        )}

        {/* Reactions Summary */}
        {post.glowPoints > 0 && (
          <View style={styles.reactionsContainer}>
            <View style={[styles.pointsGradient, { 
              backgroundColor: theme.color.brand[600],
              borderRadius: theme.radius.xl,
            }]}>
              <Text style={[styles.totalPoints, { 
                color: theme.text.inverted,
                fontFamily: theme.typography.fontFamily,
                fontWeight: theme.typography.weights.semibold,
              }]}>+{post.glowPoints} Glow Points</Text>
            </View>
            
            {topReactions.length > 0 && (
              <View style={styles.reactionsList}>
                {topReactions.map(([key, count]) => {
                  const reaction = reactionIcons[key as keyof typeof reactionIcons];
                  if (!reaction) return null;
                  
                  const Icon = reaction.icon;
                  const isActive = post.userHasReacted.includes(key);
                  
                  return (
                    <ReactionButton
                      key={key}
                      type={key}
                      icon={Icon}
                      color={reaction.color}
                      label={reaction.label}
                      count={count}
                      active={isActive}
                      onPress={() => handleReaction(key)}
                    />
                  );
                })}
                
                {Object.keys(post.reactions).filter(k => post.reactions[k] > 0).length > 3 && (
                  <TouchableOpacity
                    style={[styles.moreReactionsButton, { 
                      backgroundColor: theme.surface.elevated,
                      borderRadius: theme.radius.xl,
                    }]}
                    onPress={() => setShowAllReactions(!showAllReactions)}
                  >
                    <Text style={[styles.moreReactionsText, { 
                      color: theme.text.muted,
                      fontFamily: theme.typography.fontFamily,
                      fontWeight: theme.typography.weights.medium,
                    }]}>
                      {showAllReactions ? 'Moins' : 'Plus'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity 
            style={[styles.actionButton, { 
              backgroundColor: theme.surface.elevated,
              borderRadius: theme.radius.lg,
            }]}
            onPress={handleComment}
            accessibilityLabel="Commenter ce post"
          >
            <MessageSquare size={18} color={theme.text.muted} />
            {post.replyCount > 0 && (
              <Text style={[styles.actionCount, { 
                color: theme.text.muted,
                fontFamily: theme.typography.fontFamily,
                fontWeight: theme.typography.weights.semibold,
              }]}>
                {post.replyCount}
              </Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, { 
              backgroundColor: theme.surface.elevated,
              borderRadius: theme.radius.lg,
            }]}
            onPress={handleShare}
            accessibilityLabel="Partager ce post"
          >
            <Share2 size={18} color={theme.text.muted} />
            {post.shareCount > 0 && (
              <Text style={[styles.actionCount, { 
                color: theme.text.muted,
                fontFamily: theme.typography.fontFamily,
                fontWeight: theme.typography.weights.semibold,
              }]}>
                {post.shareCount}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.viewCount}>
            <Text style={[styles.viewCountText, { 
              color: theme.text.muted,
              fontFamily: theme.typography.fontFamily,
            }]}>
              {post.viewCount} vues
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

// Reaction Button Component
interface ReactionButtonProps {
  type: string;
  icon: React.ComponentType<any>;
  color: string;
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
}

function ReactionButton({ 
  type, 
  icon: Icon, 
  color, 
  label, 
  count, 
  active, 
  onPress 
}: ReactionButtonProps) {
  const { theme } = useTheme();
  const buttonAnimation = useButtonAnimation();
  

  const handlePress = useCallback(() => {
    buttonAnimation.celebrate();
    onPress();
  }, [onPress, buttonAnimation]);

  return (
    <Animated.View style={buttonAnimation.animatedStyle}>
      <TouchableOpacity
        style={[
          styles.reactionButton,
          { 
            borderColor: active ? color : theme.surface.border,
            backgroundColor: active ? color + '20' : theme.surface.container,
            borderRadius: theme.radius.xl,
          },
        ]}
        onPress={handlePress}
        accessibilityLabel={`${label}: ${count}`}
        accessibilityRole="button"
      >
        <Icon size={16} color={active ? color : theme.text.muted} />
        <Text style={[
          styles.reactionCount,
          { 
            color: active ? color : theme.text.muted,
            fontFamily: theme.typography.fontFamily,
            fontWeight: theme.typography.weights.semibold,
          }
        ]}>
          {count}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16, // Using theme spacing
  },
  card: {
    padding: 20, // Using xl spacing for generous padding
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    fontSize: 16,
    maxWidth: 150,
  },
  verifiedBadge: {
    marginLeft: 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  glowPoints: {
    fontSize: 12,
    marginLeft: 8,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  timestamp: {
    fontSize: 12,
    marginBottom: 8,
  },
  optionsButton: {
    padding: 8,
  },
  content: {
    fontSize: 15,
    marginBottom: 16,
  },
  reactionsContainer: {
    marginBottom: 16,
  },
  pointsGradient: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  totalPoints: {
    fontSize: 14,
  },
  reactionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  reactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
  },
  reactionCount: {
    fontSize: 12,
    marginLeft: 8,
  },
  moreReactionsButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  moreReactionsText: {
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 0,
    paddingTop: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    minWidth: 44,
  },
  actionCount: {
    fontSize: 14,
    marginLeft: 8,
  },
  viewCount: {
    paddingHorizontal: 12,
  },
  viewCountText: {
    fontSize: 12,
  },
});
