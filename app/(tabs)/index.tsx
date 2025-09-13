import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { PostCard } from '@/components/ui/PostCard';
import { CustomHeader } from '@/components/ui/CustomHeader';
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
      <View style={styles.footer}>
        <Text style={styles.footerText}>Chargement...</Text>
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Aucun post à afficher</Text>
        <Text style={styles.emptyText}>
          Soyez le premier à partager quelque chose !
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.surface.background }]}>
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
  footerText: {
    fontSize: 14,
    color: '#6B7280',
  },
  empty: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
