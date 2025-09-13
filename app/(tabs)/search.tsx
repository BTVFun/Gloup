// Search Screen with Full Social Search
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Search as SearchIcon, TrendingUp, Users, FileText, Hash } from 'lucide-react-native';
import { SearchBar } from '@/components/ui/SearchBar';
import { useSearch, useTrendingTopics } from '@/hooks/useSearch';
import { useTabBarScrollContext } from '@/contexts/TabBarScrollContext';
import { useTheme } from '@/lib/theme-context';
import { router } from 'expo-router';

export default function SearchScreen() {
  const { theme } = useTheme();
  const { onScroll } = useTabBarScrollContext();
  const [activeFilter, setActiveFilter] = useState<'all' | 'user' | 'post' | 'group'>('all');
  const { topics: trendingTopics } = useTrendingTopics();

  const searchTypes = activeFilter === 'all' 
    ? ['user', 'post', 'group'] as const
    : [activeFilter] as const;

  const handleResultSelect = (result: any) => {
    switch (result.type) {
      case 'user':
        router.push({ pathname: '/(tabs)/profile/[id]', params: { id: result.id } } as any);
        break;
      case 'post':
        // Navigate to post detail
        break;
      case 'group':
        router.push({ pathname: '/(tabs)/group/[id]', params: { id: result.id } } as any);
        break;
    }
  };

  const filters = [
    { id: 'all', label: 'Tout', icon: SearchIcon },
    { id: 'user', label: 'Utilisateurs', icon: Users },
    { id: 'post', label: 'Posts', icon: FileText },
    { id: 'group', label: 'Groupes', icon: Users },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.surface.background }]}>
      <LinearGradient
        colors={['#8B5CF6', '#3B82F6']}
        style={styles.header}
      >
        <Text style={styles.title}>Recherche</Text>
        <Text style={styles.subtitle}>Découvrez du contenu et des personnes</Text>
      </LinearGradient>

      <View style={styles.content}>
        <SearchBar
          onResultSelect={handleResultSelect}
          types={searchTypes}
          placeholder="Rechercher des utilisateurs, posts, groupes..."
          style={styles.searchBar}
        />

        <View style={styles.filtersContainer}>
          {filters.map((filter) => {
            const IconComponent = filter.icon;
            const isActive = activeFilter === filter.id;
            
            return (
              <TouchableOpacity
                key={filter.id}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isActive ? theme.color.brand[600] : theme.surface.container,
                    borderColor: isActive ? theme.color.brand[600] : theme.surface.border,
                    borderRadius: theme.radius.xl,
                  }
                ]}
                onPress={() => setActiveFilter(filter.id as any)}
              >
                <IconComponent 
                  size={16} 
                  color={isActive ? theme.text.inverted : theme.text.muted} 
                />
                <Text style={[
                  styles.filterText,
                  {
                    color: isActive ? theme.text.inverted : theme.text.muted,
                    fontFamily: theme.typography.fontFamily,
                    fontWeight: theme.typography.weights.medium,
                  }
                ]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView 
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {/* Trending Topics */}
          {trendingTopics.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <TrendingUp size={20} color={theme.color.warning[500]} />
                <Text style={[styles.sectionTitle, { 
                  color: theme.text.primary,
                  fontFamily: theme.typography.fontFamily,
                  fontWeight: theme.typography.weights.semibold,
                }]}>
                  Tendances
                </Text>
              </View>
              
              <View style={styles.trendingContainer}>
                {trendingTopics.slice(0, 6).map((topic, index) => (
                  <TouchableOpacity
                    key={topic.hashtag}
                    style={[styles.trendingChip, {
                      backgroundColor: theme.surface.container,
                      borderColor: theme.surface.border,
                      borderRadius: theme.radius.lg,
                    }]}
                  >
                    <Hash size={14} color={theme.color.brand[600]} />
                    <Text style={[styles.trendingText, { 
                      color: theme.text.primary,
                      fontFamily: theme.typography.fontFamily,
                      fontWeight: theme.typography.weights.medium,
                    }]}>
                      {topic.hashtag}
                    </Text>
                    <Text style={[styles.trendingCount, { 
                      color: theme.text.muted,
                      fontFamily: theme.typography.fontFamily,
                    }]}>
                      {topic.post_count}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Search Tips */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { 
              color: theme.text.primary,
              fontFamily: theme.typography.fontFamily,
              fontWeight: theme.typography.weights.semibold,
            }]}>
              Conseils de recherche
            </Text>
            
            <View style={[styles.tipsContainer, { 
              backgroundColor: theme.surface.container,
              borderRadius: theme.radius.lg,
            }]}>
              <View style={styles.tipItem}>
                <Text style={[styles.tipTitle, { 
                  color: theme.text.primary,
                  fontFamily: theme.typography.fontFamily,
                  fontWeight: theme.typography.weights.medium,
                }]}>
                  @ pour les utilisateurs
                </Text>
                <Text style={[styles.tipDescription, { 
                  color: theme.text.muted,
                  fontFamily: theme.typography.fontFamily,
                }]}>
                  Tapez @nom pour rechercher des utilisateurs
                </Text>
              </View>
              
              <View style={styles.tipItem}>
                <Text style={[styles.tipTitle, { 
                  color: theme.text.primary,
                  fontFamily: theme.typography.fontFamily,
                  fontWeight: theme.typography.weights.medium,
                }]}>
                  # pour les sujets
                </Text>
                <Text style={[styles.tipDescription, { 
                  color: theme.text.muted,
                  fontFamily: theme.typography.fontFamily,
                }]}>
                  Utilisez #hashtag pour trouver des sujets
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
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
  content: {
    flex: 1,
    padding: 16,
  },
  searchBar: {
    marginBottom: 16,
  },
  filtersContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 14,
    marginLeft: 6,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    marginLeft: 8,
  },
  trendingContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  trendingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  trendingText: {
    fontSize: 14,
    marginLeft: 4,
  },
  trendingCount: {
    fontSize: 12,
    marginLeft: 8,
  },
  tipsContainer: {
    padding: 16,
  },
  tipItem: {
    marginBottom: 12,
  },
  tipTitle: {
    fontSize: 14,
    marginBottom: 4,
  },
  tipDescription: {
    fontSize: 12,
    lineHeight: 18,
  },
});