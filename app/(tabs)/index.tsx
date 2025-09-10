import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Pressable, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus } from 'lucide-react-native';
import { FlashList } from '@shopify/flash-list';
import { PostCard } from '@/components/ui/PostCard';
import { useFeed } from '@/hooks/useFeed';
import { AnalyticsManager } from '@/lib/analytics';
import { router } from 'expo-router';
import { useEffect } from 'react';

export default function GlowFeed() {
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
    <LinearGradient
      colors={['#8B5CF6', '#3B82F6']}
      style={styles.header}
    >
      <Text style={styles.title}>GlowUp</Text>
      <Text style={styles.subtitle}>Together</Text>
    </LinearGradient>
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
    <View style={styles.container}>
      <FlashList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        onEndReached={hasMore ? loadMore : undefined}
        onEndReachedThreshold={0.5}
        onRefresh={refresh}
        refreshing={refreshing}
        estimatedItemSize={300}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />

      <TouchableOpacity 
        style={styles.floatingButton}
        onPress={() => router.push('/(tabs)/create' as any)}
      >
        <LinearGradient
          colors={['#8B5CF6', '#3B82F6']}
          style={styles.floatingButtonGradient}
        >
          <Plus size={24} color="white" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  listContent: {
    paddingHorizontal: 16,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 30,
    marginHorizontal: -16,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
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
  floatingButton: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  floatingButtonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
