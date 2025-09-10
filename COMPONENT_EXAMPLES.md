# Gloup ✨ Component Implementation Examples

## 🎯 Core Components

### 1. Enhanced PostCard Component

```typescript
// components/feed/PostCard.tsx
import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, MessageCircle, Share, Crown, Shirt, Dumbbell, Brain, Shield, Sparkles } from 'lucide-react-native';
import Animated, { useSharedValue, withSpring, useAnimatedStyle } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

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
    glowPoints: number;
    reactions: Record<string, number>;
    userHasReacted: string[];
    timestamp: string;
    replyCount: number;
    shareCount: number;
  };
  onReaction: (postId: string, type: string) => void;
  onComment: (postId: string) => void;
  onShare: (postId: string) => void;
  onUserPress: (userId: string) => void;
}

const reactionIcons = {
  couronne: { icon: Crown, color: '#FFD700', points: 20 },
  vetements: { icon: Shirt, color: '#8B5CF6', points: 10 },
  sport: { icon: Dumbbell, color: '#EF4444', points: 10 },
  mental: { icon: Brain, color: '#10B981', points: 10 },
  confiance: { icon: Shield, color: '#F59E0B', points: 10 },
  soins: { icon: Sparkles, color: '#EC4899', points: 10 },
};

export function PostCard({ post, onReaction, onComment, onShare, onUserPress }: PostCardProps) {
  const [imageError, setImageError] = useState(false);
  const scaleValue = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
  }));

  const handleReaction = (type: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    scaleValue.value = withSpring(0.95, {}, () => {
      scaleValue.value = withSpring(1);
    });
    
    onReaction(post.id, type);
  };

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <View style={styles.card}>
        {/* Header */}
        <TouchableOpacity 
          style={styles.header}
          onPress={() => onUserPress(post.author.id)}
          activeOpacity={0.7}
        >
          <Image 
            source={{ uri: post.author.avatar }} 
            style={styles.avatar}
            onError={() => setImageError(true)}
          />
          <View style={styles.userInfo}>
            <View style={styles.nameContainer}>
              <Text style={styles.userName}>{post.author.name}</Text>
              {post.author.isVerified && (
                <View style={styles.verifiedBadge}>
                  <Crown size={12} color="#FFD700" />
                </View>
              )}
            </View>
            <View style={styles.glowContainer}>
              <Sparkles size={12} color="#FFD700" />
              <Text style={styles.glowPoints}>{post.author.glowPoints} Glow Points</Text>
            </View>
          </View>
          <Text style={styles.timestamp}>{post.timestamp}</Text>
        </TouchableOpacity>

        {/* Content */}
        <Text style={styles.content}>{post.content}</Text>

        {/* Media */}
        {post.media_urls && post.media_urls.length > 0 && (
          <MediaCarousel media={post.media_urls} />
        )}

        {/* Reactions */}
        <View style={styles.reactionsContainer}>
          <Text style={styles.totalPoints}>+{post.glowPoints} Glow Points</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {Object.entries(reactionIcons).map(([key, { icon: Icon, color }]) => (
              <ReactionButton
                key={key}
                type={key}
                icon={Icon}
                color={color}
                count={post.reactions[key] || 0}
                active={post.userHasReacted.includes(key)}
                onPress={() => handleReaction(key)}
              />
            ))}
          </ScrollView>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => onComment(post.id)}
          >
            <MessageCircle size={18} color="#6B7280" />
            <Text style={styles.actionText}>{post.replyCount}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => onShare(post.id)}
          >
            <Share size={18} color="#6B7280" />
            <Text style={styles.actionText}>{post.shareCount}</Text>
          </TouchableOpacity>
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
  count: number;
  active: boolean;
  onPress: () => void;
}

function ReactionButton({ type, icon: Icon, color, count, active, onPress }: ReactionButtonProps) {
  const scale = useSharedValue(1);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSpring(1.2, {}, () => {
      scale.value = withSpring(1);
    });
    onPress();
  };

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        style={[
          styles.reactionButton,
          { borderColor: active ? color : '#E5E7EB' },
          active && { backgroundColor: color + '20' }
        ]}
        onPress={handlePress}
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
    alignItems: 'center',
    marginBottom: 12,
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
  timestamp: {
    fontSize: 12,
    color: '#9CA3AF',
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
  totalPoints: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
    marginBottom: 8,
  },
  reactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    backgroundColor: '#F9FAFB',
  },
  reactionCount: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 6,
    fontWeight: '500',
  },
});
```

### 2. Media Carousel Component

```typescript
// components/media/MediaCarousel.tsx
import React, { useState } from 'react';
import { View, ScrollView, Image, TouchableOpacity, Modal, StyleSheet, Dimensions } from 'react-native';
import { X } from 'lucide-react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

const { width: screenWidth } = Dimensions.get('window');

interface MediaCarouselProps {
  media: string[];
  metadata?: Record<string, any>[];
}

export function MediaCarousel({ media, metadata = [] }: MediaCarouselProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const openFullscreen = (index: number) => {
    scale.value = withSpring(0.95, {}, () => {
      scale.value = withSpring(1);
    });
    setSelectedIndex(index);
  };

  const closeFullscreen = () => {
    setSelectedIndex(null);
  };

  if (media.length === 0) return null;

  if (media.length === 1) {
    return (
      <>
        <Animated.View style={animatedStyle}>
          <TouchableOpacity onPress={() => openFullscreen(0)}>
            <Image 
              source={{ uri: media[0] }} 
              style={styles.singleImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
        </Animated.View>
        <FullscreenModal 
          media={media} 
          selectedIndex={selectedIndex} 
          onClose={closeFullscreen} 
        />
      </>
    );
  }

  if (media.length === 2) {
    return (
      <>
        <View style={styles.twoImageContainer}>
          {media.map((uri, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.twoImageItem}
              onPress={() => openFullscreen(index)}
            >
              <Image source={{ uri }} style={styles.twoImage} resizeMode="cover" />
            </TouchableOpacity>
          ))}
        </View>
        <FullscreenModal 
          media={media} 
          selectedIndex={selectedIndex} 
          onClose={closeFullscreen} 
        />
      </>
    );
  }

  if (media.length === 3) {
    return (
      <>
        <View style={styles.threeImageContainer}>
          <TouchableOpacity 
            style={styles.threeImageMain}
            onPress={() => openFullscreen(0)}
          >
            <Image source={{ uri: media[0] }} style={styles.threeMainImage} resizeMode="cover" />
          </TouchableOpacity>
          <View style={styles.threeImageSide}>
            {media.slice(1).map((uri, index) => (
              <TouchableOpacity 
                key={index + 1} 
                style={styles.threeSideItem}
                onPress={() => openFullscreen(index + 1)}
              >
                <Image source={{ uri }} style={styles.threeSideImage} resizeMode="cover" />
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <FullscreenModal 
          media={media} 
          selectedIndex={selectedIndex} 
          onClose={closeFullscreen} 
        />
      </>
    );
  }

  // 4 or more images
  return (
    <>
      <View style={styles.fourImageContainer}>
        {media.slice(0, 3).map((uri, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.fourImageItem}
            onPress={() => openFullscreen(index)}
          >
            <Image source={{ uri }} style={styles.fourImage} resizeMode="cover" />
          </TouchableOpacity>
        ))}
        <TouchableOpacity 
          style={[styles.fourImageItem, styles.moreImagesOverlay]}
          onPress={() => openFullscreen(3)}
        >
          <Image source={{ uri: media[3] }} style={styles.fourImage} resizeMode="cover" />
          {media.length > 4 && (
            <View style={styles.moreImagesText}>
              <Text style={styles.moreImagesCount}>+{media.length - 4}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      <FullscreenModal 
        media={media} 
        selectedIndex={selectedIndex} 
        onClose={closeFullscreen} 
      />
    </>
  );
}

// Fullscreen Modal Component
interface FullscreenModalProps {
  media: string[];
  selectedIndex: number | null;
  onClose: () => void;
}

function FullscreenModal({ media, selectedIndex, onClose }: FullscreenModalProps) {
  if (selectedIndex === null) return null;

  return (
    <Modal visible={true} transparent animationType="fade">
      <View style={styles.modalContainer}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <X size={24} color="white" />
        </TouchableOpacity>
        
        <ScrollView 
          horizontal 
          pagingEnabled 
          showsHorizontalScrollIndicator={false}
          contentOffset={{ x: selectedIndex * screenWidth, y: 0 }}
        >
          {media.map((uri, index) => (
            <View key={index} style={styles.fullscreenImageContainer}>
              <Image 
                source={{ uri }} 
                style={styles.fullscreenImage} 
                resizeMode="contain"
              />
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  singleImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 12,
  },
  twoImageContainer: {
    flexDirection: 'row',
    height: 200,
    marginBottom: 12,
    gap: 4,
  },
  twoImageItem: {
    flex: 1,
  },
  twoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  threeImageContainer: {
    flexDirection: 'row',
    height: 200,
    marginBottom: 12,
    gap: 4,
  },
  threeImageMain: {
    flex: 2,
  },
  threeMainImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  threeImageSide: {
    flex: 1,
    gap: 4,
  },
  threeSideItem: {
    flex: 1,
  },
  threeSideImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  fourImageContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    height: 200,
    marginBottom: 12,
    gap: 4,
  },
  fourImageItem: {
    width: '48%',
    height: '48%',
  },
  fourImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  moreImagesOverlay: {
    position: 'relative',
  },
  moreImagesText: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  moreImagesCount: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImageContainer: {
    width: screenWidth,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: screenWidth,
    height: '80%',
  },
});
```

### 3. Enhanced Feed with FlashList

```typescript
// components/feed/InfiniteScrollFeed.tsx
import React, { useCallback, useMemo } from 'react';
import { View, RefreshControl, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { PostCard } from './PostCard';
import { useFeed } from '@/hooks/useFeed';

interface InfiniteScrollFeedProps {
  userId?: string;
  category?: string;
  groupId?: string;
}

export function InfiniteScrollFeed({ userId, category, groupId }: InfiniteScrollFeedProps) {
  const {
    posts,
    loading,
    refreshing,
    hasMore,
    loadMore,
    refresh,
    handleReaction,
    handleComment,
    handleShare,
    handleUserPress,
  } = useFeed({ userId, category, groupId });

  const renderItem = useCallback(({ item }: { item: any }) => (
    <PostCard
      post={item}
      onReaction={handleReaction}
      onComment={handleComment}
      onShare={handleShare}
      onUserPress={handleUserPress}
    />
  ), [handleReaction, handleComment, handleShare, handleUserPress]);

  const renderFooter = useCallback(() => {
    if (!loading || posts.length === 0) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#8B5CF6" />
      </View>
    );
  }, [loading, posts.length]);

  const renderEmpty = useCallback(() => {
    if (loading) return null;
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Aucun post à afficher</Text>
        <Text style={styles.emptySubtext}>
          Soyez le premier à partager quelque chose !
        </Text>
      </View>
    );
  }, [loading]);

  const keyExtractor = useCallback((item: any) => item.id, []);

  const getItemType = useCallback((item: any) => {
    // Optimize rendering based on content type
    if (item.media_urls?.length > 0) return 'media';
    if (item.content?.length > 200) return 'long';
    return 'short';
  }, []);

  return (
    <FlashList
      data={posts}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      getItemType={getItemType}
      estimatedItemSize={250}
      onEndReached={hasMore ? loadMore : undefined}
      onEndReachedThreshold={0.5}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          colors={['#8B5CF6']}
          tintColor="#8B5CF6"
        />
      }
      ListFooterComponent={renderFooter}
      ListEmptyComponent={renderEmpty}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  empty: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
```

### 4. Real-time Messaging Component

```typescript
// components/messaging/MessageBubble.tsx
import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Play, Download } from 'lucide-react-native';
import Animated, { useSharedValue, withSpring, useAnimatedStyle } from 'react-native-reanimated';

interface MessageBubbleProps {
  message: {
    id: string;
    content?: string;
    message_type: 'text' | 'image' | 'voice' | 'file';
    media_url?: string;
    media_metadata?: any;
    created_at: string;
    is_edited?: boolean;
  };
  isFromMe: boolean;
  showAvatar?: boolean;
  avatar?: string;
  onPress?: () => void;
  onLongPress?: () => void;
}

export function MessageBubble({ 
  message, 
  isFromMe, 
  showAvatar, 
  avatar, 
  onPress, 
  onLongPress 
}: MessageBubbleProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSpring(0.95, {}, () => {
      scale.value = withSpring(1);
    });
    onPress?.();
  };

  const renderContent = () => {
    switch (message.message_type) {
      case 'text':
        return (
          <Text style={[
            styles.messageText,
            isFromMe ? styles.myMessageText : styles.theirMessageText
          ]}>
            {message.content}
            {message.is_edited && (
              <Text style={styles.editedText}> (modifié)</Text>
            )}
          </Text>
        );

      case 'image':
        return (
          <TouchableOpacity onPress={handlePress}>
            <Image 
              source={{ uri: message.media_url }} 
              style={styles.messageImage}
              resizeMode="cover"
            />
            {message.content && (
              <Text style={[
                styles.messageText,
                styles.imageCaption,
                isFromMe ? styles.myMessageText : styles.theirMessageText
              ]}>
                {message.content}
              </Text>
            )}
          </TouchableOpacity>
        );

      case 'voice':
        return (
          <TouchableOpacity 
            style={styles.voiceMessage}
            onPress={handlePress}
          >
            <Play size={20} color={isFromMe ? 'white' : '#8B5CF6'} />
            <View style={styles.voiceWaveform}>
              {/* Voice waveform visualization */}
              {Array.from({ length: 20 }).map((_, i) => (
                <View 
                  key={i} 
                  style={[
                    styles.waveformBar,
                    { 
                      height: Math.random() * 20 + 5,
                      backgroundColor: isFromMe ? 'rgba(255,255,255,0.7)' : '#8B5CF6'
                    }
                  ]} 
                />
              ))}
            </View>
            <Text style={[
              styles.voiceDuration,
              isFromMe ? styles.myMessageText : styles.theirMessageText
            ]}>
              {message.media_metadata?.duration || '0:00'}
            </Text>
          </TouchableOpacity>
        );

      case 'file':
        return (
          <TouchableOpacity 
            style={styles.fileMessage}
            onPress={handlePress}
          >
            <Download size={20} color={isFromMe ? 'white' : '#8B5CF6'} />
            <View style={styles.fileInfo}>
              <Text style={[
                styles.fileName,
                isFromMe ? styles.myMessageText : styles.theirMessageText
              ]}>
                {message.media_metadata?.name || 'Fichier'}
              </Text>
              <Text style={[
                styles.fileSize,
                isFromMe ? styles.myMessageText : styles.theirMessageText
              ]}>
                {message.media_metadata?.size || '0 KB'}
              </Text>
            </View>
          </TouchableOpacity>
        );

      default:
        return null;
    }
  };

  return (
    <Animated.View style={[
      styles.container,
      isFromMe ? styles.myMessageContainer : styles.theirMessageContainer,
      animatedStyle
    ]}>
      {!isFromMe && showAvatar && (
        <Image source={{ uri: avatar }} style={styles.avatar} />
      )}
      
      <TouchableOpacity
        style={[
          styles.bubble,
          isFromMe ? styles.myBubble : styles.theirBubble
        ]}
        onPress={handlePress}
        onLongPress={onLongPress}
        activeOpacity={0.8}
      >
        {renderContent()}
        <Text style={[
          styles.timestamp,
          isFromMe ? styles.myTimestamp : styles.theirTimestamp
        ]}>
          {new Date(message.created_at).toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  myMessageContainer: {
    justifyContent: 'flex-end',
  },
  theirMessageContainer: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    alignSelf: 'flex-end',
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
  },
  myBubble: {
    backgroundColor: '#8B5CF6',
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  myMessageText: {
    color: 'white',
  },
  theirMessageText: {
    color: '#1F2937',
  },
  editedText: {
    fontSize: 12,
    fontStyle: 'italic',
    opacity: 0.7,
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
    marginBottom: 4,
  },
  imageCaption: {
    fontSize: 14,
  },
  voiceMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 150,
  },
  voiceWaveform: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
    flex: 1,
  },
  waveformBar: {
    width: 2,
    marginHorizontal: 1,
    borderRadius: 1,
  },
  voiceDuration: {
    fontSize: 12,
  },
  fileMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 120,
  },
  fileInfo: {
    marginLeft: 8,
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
  },
  fileSize: {
    fontSize: 12,
    opacity: 0.7,
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  myTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  theirTimestamp: {
    color: '#6B7280',
  },
});
```

These components provide a solid foundation for the enhanced Gloup ✨ social media application, featuring modern React Native patterns, smooth animations, and optimized performance.