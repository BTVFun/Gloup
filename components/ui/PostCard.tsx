// Enhanced PostCard Component for Gloup ✨
import React, { useState, useCallback } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform, Alert } from 'react-native';
import { Heart, MessageCircle, Share, Crown, Shirt, Dumbbell, Brain, Shield, Sparkles, MoveHorizontal as MoreHorizontal, MessageSquare, Share2 } from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  withSpring, 
  useAnimatedStyle,
  withSequence 
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { MediaCarousel } from './MediaCarousel';
import { AnalyticsManager } from '@/lib/analytics';
import { useTheme } from '@/lib/theme-context';

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
  const scaleValue = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
  }));

  const handleReaction = useCallback((type: string) => {
    // Haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    // Animation
    scaleValue.value = withSpring(0.95, {}, () => {
      scaleValue.value = withSpring(1);
    });
    
    // Analytics
    AnalyticsManager.trackUserAction('reaction', 'post', {
      postId: post.id,
      reactionType: type,
      authorId: post.author.id,
    });
    
    onReaction(post.id, type);
  }, [post.id, post.author.id, onReaction, scaleValue]);

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
    <Animated.View style={[styles.container, animatedStyle]}>
      <View style={styles.card}>
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
                <Text style={styles.userName} numberOfLines={1}>
                  {post.author.name}
                </Text>
                {post.author.isVerified && (
                  <View style={styles.verifiedBadge}>
                    <Crown size={12} color="#FFD700" />
                  </View>
                )}
              </View>
              <View style={styles.glowContainer}>
                <Sparkles size={12} color="#FFD700" />
                <Text style={styles.glowPoints}>
                  {post.author.glowPoints} Glow Points
                </Text>
              </View>
            </View>
          </TouchableOpacity>
          
          <View style={styles.headerRight}>
            <Text style={styles.timestamp}>{post.timestamp}</Text>
            {onOptionsPress && (
              <TouchableOpacity 
                style={styles.optionsButton}
                onPress={handleOptionsPress}
              >
                <MoreHorizontal size={20} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Content */}
        {post.content && (
          <Text style={styles.content}>{post.content}</Text>
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
            <View style={[styles.pointsGradient, { backgroundColor: '#2B2E78' }]}>
              <Text style={styles.totalPoints}>+{post.glowPoints} Glow Points</Text>
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
                    style={styles.moreReactionsButton}
                    onPress={() => setShowAllReactions(!showAllReactions)}
                  >
                    <Text style={styles.moreReactionsText}>
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
            style={[styles.actionButton, { backgroundColor: theme.surface.elevated }]}
            onPress={handleComment}
            accessibilityLabel="Commenter ce post"
          >
            <MessageSquare size={18} color={theme.text.muted} />
            {post.replyCount > 0 && (
              <Text style={[styles.actionCount, { color: theme.text.muted }]}>
                {post.replyCount}
              </Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: theme.surface.elevated }]}
            onPress={handleShare}
            accessibilityLabel="Partager ce post"
          >
            <Share2 size={18} color={theme.text.muted} />
            {post.shareCount > 0 && (
              <Text style={[styles.actionCount, { color: theme.text.muted }]}>
                {post.shareCount}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.viewCount}>
            <Text style={[styles.viewCountText, { color: theme.text.muted }]}>
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
  const scale = useSharedValue(1);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = useCallback(() => {
    scale.value = withSpring(1.2, {}, () => {
      scale.value = withSpring(1);
    });
    onPress();
  }, [onPress, scale]);

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        style={[
          styles.reactionButton,
          { borderColor: active ? color : '#E5E7EB' },
          active && { backgroundColor: color + '20' }
        ]}
        onPress={handlePress}
        accessibilityLabel={`${label}: ${count}`}
        accessibilityRole="button"
      >
        <Icon size={16} color={active ? color : '#6B7280'} />
        <Text style={[
          styles.reactionCount,
          { color: active ? color : '#6B7280' }
        ]}>
          {count}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12, // Reduced spacing for better density
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12, // Using md radius from design system
    padding: 16, // Maintaining lg spacing
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, // Lighter shadow as per design
    shadowRadius: 6,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16, // Using lg spacing
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
    marginRight: 16, // Using lg spacing
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
    fontWeight: '600',
    color: '#1F2937',
    maxWidth: 150,
  },
  verifiedBadge: {
    marginLeft: 8, // Using sm spacing
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4, // Using xs spacing
  },
  glowPoints: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8, // Using sm spacing
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  timestamp: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 8, // Using sm spacing
  },
  optionsButton: {
    padding: 8, // Using sm spacing for better touch target
  },
  content: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 16, // Using lg spacing
  },
  reactionsContainer: {
    marginBottom: 16, // Using lg spacing
  },
  pointsGradient: {
    paddingHorizontal: 16, // Using lg spacing
    paddingVertical: 8, // Using sm spacing
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 12, // Using md spacing
  },
  totalPoints: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  reactionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12, // Using md spacing
  },
  reactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16, // Using lg spacing
    paddingVertical: 8, // Using sm spacing
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: '#F9FAFB',
  },
  reactionCount: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8, // Using sm spacing
  },
  moreReactionsButton: {
    paddingHorizontal: 16, // Using lg spacing
    paddingVertical: 8, // Using sm spacing
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  moreReactionsText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 0,
    paddingTop: 16, // Using lg spacing
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12, // Using md spacing
    borderRadius: 16,
    minWidth: 44, // Accessibility minimum touch target
  },
  actionCount: {
    fontSize: 14,
    marginLeft: 8, // Using sm spacing
    fontWeight: '600',
  },
  viewCount: {
    paddingHorizontal: 12, // Using md spacing
  },
  viewCountText: {
    fontSize: 12,
  },
});
