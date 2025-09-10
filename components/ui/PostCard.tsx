// Enhanced PostCard Component for Gloup ✨
import React, { useState, useCallback } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, MessageCircle, Share, Crown, Shirt, Dumbbell, Brain, Shield, Sparkles, MoveHorizontal as MoreHorizontal } from 'lucide-react-native';
import Animated, { useSharedValue, withSpring, useAnimatedStyle } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { MediaCarousel } from './MediaCarousel';
import { AnalyticsManager } from '@/lib/analytics';

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
  vetements: { icon: Shirt, color: '#8B5CF6', points: 10, label: 'Style' },
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
            <LinearGradient
              colors={['#8B5CF6', '#3B82F6']}
              style={styles.pointsGradient}
            >
              <Text style={styles.totalPoints}>
                +{post.glowPoints} Glow Points
              </Text>
            </LinearGradient>
            
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
            style={styles.actionButton}
            onPress={handleComment}
          >
            <MessageCircle size={18} color="#6B7280" />
            <Text style={styles.actionText}>
              {post.replyCount > 0 ? post.replyCount : 'Commenter'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleShare}
          >
            <Share size={18} color="#6B7280" />
            <Text style={styles.actionText}>
              {post.shareCount > 0 ? post.shareCount : 'Partager'}
            </Text>
          </TouchableOpacity>

          <View style={styles.viewCount}>
            <Text style={styles.viewCountText}>
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
    marginBottom: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
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
    marginRight: 12,
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
    marginLeft: 4,
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
    marginTop: 2,
  },
  glowPoints: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  timestamp: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  optionsButton: {
    padding: 4,
  },
  content: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 12,
  },
  reactionsContainer: {
    marginBottom: 12,
  },
  pointsGradient: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  totalPoints: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  reactionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: '#F9FAFB',
  },
  reactionCount: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  moreReactionsButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
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
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
  },
  actionText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 6,
    fontWeight: '500',
  },
  viewCount: {
    paddingHorizontal: 8,
  },
  viewCountText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});