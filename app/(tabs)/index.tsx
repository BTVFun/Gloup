import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { PostCard } from '@/components/ui/PostCard';
import { PostCardSkeleton } from '@/components/ui/SkeletonLoader';
import { useFeed } from '@/hooks/useFeed';
import { useTabBarScrollContext } from '@/contexts/TabBarScrollContext';
import { AnalyticsManager } from '@/lib/analytics';
import { useEffect } from 'react';
import { useTheme } from '@/lib/theme-context';

export default function GlowFeed() {
  const { theme } = useTheme();
  const { onScroll } = useTabBarScrollContext();
  const {
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
  } = useFeed();

  useEffect(() => {
    AnalyticsManager.trackScreenView('feed');
  }, []);

  const renderPost = ({ item }: { item: any }) => (
    <PostCard
      post={item}
      onReaction={handleReaction}
      onComment={handleComment}
      onShare={handleShare}
      onUserPress={handleUserPress}
    />
  );

  const renderHeader = () => (
    <View style={{ height: 120 }}>
      {/* Space for custom header + some margin */}
    </View>
  );

  const renderFooter = () => {
    if (!loading || posts.length === 0) return null;
    return (
      <View style={[styles.footer, { backgroundColor: theme.surface.background }]}>
        <PostCardSkeleton />
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={[styles.empty, { backgroundColor: theme.surface.background }]}>
        <Text style={[styles.emptyTitle, { 
          color: theme.text.secondary,
          fontFamily: theme.typography.fontFamily,
          fontWeight: theme.typography.weights.semibold,
        }]}>Aucun post à afficher</Text>
        <Text style={[styles.emptyText, { 
          color: theme.text.muted,
          fontFamily: theme.typography.fontFamily,
        }]}>
          Soyez le premier à partager quelque chose !
        </Text>
      </View>
    );
  };

  const renderSkeleton = () => {
    if (!loading || posts.length > 0) return null;
    return (
      <View style={[styles.skeletonContainer, { backgroundColor: theme.surface.background }]}>
        <PostCardSkeleton />
        <PostCardSkeleton />
        <PostCardSkeleton />
      </View>
    );
  };
  return (
    <View style={[styles.container, { backgroundColor: theme.surface.background }]}>
      {loading && posts.length === 0 ? renderSkeleton() : (
      <FlashList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        onEndReached={hasMore ? loadMore : undefined}
        onEndReachedThreshold={0.5}
        onScroll={onScroll}
        onRefresh={refresh}
        refreshing={refreshing}
        estimatedItemSize={300}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listContent, { paddingTop: 60, paddingBottom: 100 }]}
      />
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  empty: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  skeletonContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 60,
  },
});
