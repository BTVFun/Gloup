// Enhanced Search Bar Component
import React, { useState, useCallback } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, FlatList } from 'react-native';
import { Search, X, Clock, TrendingUp } from 'lucide-react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/lib/theme-context';
import { useSearch, useTrendingTopics } from '@/hooks/useSearch';

interface SearchBarProps {
  onResultSelect: (result: any) => void;
  placeholder?: string;
  types?: ('user' | 'post' | 'group')[];
  style?: any;
}

export function SearchBar({ 
  onResultSelect, 
  placeholder = "Rechercher...", 
  types,
  style 
}: SearchBarProps) {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const {
    query,
    results,
    loading,
    suggestions,
    recentSearches,
    setQuery,
    selectResult,
    clearResults,
  } = useSearch({ types });

  const { topics: trendingTopics } = useTrendingTopics();

  const searchWidth = useSharedValue(0);
  const suggestionsOpacity = useSharedValue(0);

  const animatedSearchStyle = useAnimatedStyle(() => ({
    width: searchWidth.value === 0 ? '100%' : searchWidth.value,
  }));

  const animatedSuggestionsStyle = useAnimatedStyle(() => ({
    opacity: suggestionsOpacity.value,
  }));

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    setShowSuggestions(true);
    suggestionsOpacity.value = withTiming(1, { duration: 200 });
  }, [suggestionsOpacity]);

  const handleBlur = useCallback(() => {
    // Delay to allow for suggestion selection
    setTimeout(() => {
      setIsFocused(false);
      setShowSuggestions(false);
      suggestionsOpacity.value = withTiming(0, { duration: 200 });
    }, 150);
  }, [suggestionsOpacity]);

  const handleQueryChange = useCallback((text: string) => {
    setQuery(text);
    if (text.trim()) {
      setShowSuggestions(true);
      suggestionsOpacity.value = withTiming(1, { duration: 200 });
    }
  }, [setQuery, suggestionsOpacity]);

  const handleClear = useCallback(() => {
    setQuery('');
    clearResults();
    setShowSuggestions(false);
  }, [setQuery, clearResults]);

  const handleSuggestionSelect = useCallback((suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
  }, [setQuery]);

  const handleResultSelect = useCallback((result: any) => {
    selectResult(result);
    onResultSelect(result);
    setShowSuggestions(false);
  }, [selectResult, onResultSelect]);

  const renderSearchResult = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={[styles.resultItem, { backgroundColor: theme.surface.container }]}
      onPress={() => handleResultSelect(item)}
    >
      {item.avatar && (
        <Image 
          source={{ uri: item.avatar }} 
          style={styles.resultAvatar}
        />
      )}
      <View style={styles.resultContent}>
        <Text style={[styles.resultTitle, { 
          color: theme.text.primary,
          fontFamily: theme.typography.fontFamily,
          fontWeight: theme.typography.weights.medium,
        }]} numberOfLines={1}>
          {item.title}
        </Text>
        {item.subtitle && (
          <Text style={[styles.resultSubtitle, { 
            color: theme.text.muted,
            fontFamily: theme.typography.fontFamily,
          }]} numberOfLines={1}>
            {item.subtitle}
          </Text>
        )}
      </View>
      <View style={[styles.resultType, { backgroundColor: theme.color.brand[100] }]}>
        <Text style={[styles.resultTypeText, { 
          color: theme.color.brand[600],
          fontFamily: theme.typography.fontFamily,
          fontWeight: theme.typography.weights.medium,
        }]}>
          {item.type}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderSuggestion = ({ item }: { item: string }) => (
    <TouchableOpacity 
      style={[styles.suggestionItem, { backgroundColor: theme.surface.container }]}
      onPress={() => handleSuggestionSelect(item)}
    >
      <Clock size={16} color={theme.text.muted} />
      <Text style={[styles.suggestionText, { 
        color: theme.text.secondary,
        fontFamily: theme.typography.fontFamily,
      }]}>
        {item}
      </Text>
    </TouchableOpacity>
  );

  const renderTrendingTopic = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={[styles.suggestionItem, { backgroundColor: theme.surface.container }]}
      onPress={() => handleSuggestionSelect(item.hashtag)}
    >
      <TrendingUp size={16} color={theme.color.warning[500]} />
      <Text style={[styles.suggestionText, { 
        color: theme.text.secondary,
        fontFamily: theme.typography.fontFamily,
      }]}>
        #{item.hashtag}
      </Text>
      <Text style={[styles.trendingCount, { 
        color: theme.text.muted,
        fontFamily: theme.typography.fontFamily,
      }]}>
        {item.post_count}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, style]}>
      <Animated.View style={[styles.searchContainer, animatedSearchStyle, {
        backgroundColor: theme.surface.container,
        borderColor: isFocused ? theme.color.brand[500] : theme.surface.border,
        borderRadius: theme.radius.lg,
      }]}>
        <Search size={20} color={theme.text.muted} />
        <TextInput
          style={[styles.searchInput, { 
            color: theme.text.primary,
            fontFamily: theme.typography.fontFamily,
          }]}
          placeholder={placeholder}
          placeholderTextColor={theme.text.muted}
          value={query}
          onChangeText={handleQueryChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
            <X size={16} color={theme.text.muted} />
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Search Results and Suggestions */}
      {showSuggestions && (
        <Animated.View style={[
          styles.suggestionsContainer,
          animatedSuggestionsStyle,
          { 
            backgroundColor: theme.surface.container,
            borderColor: theme.surface.border,
            borderRadius: theme.radius.lg,
            ...theme.elevation[2],
          }
        ]}>
          {query.trim() ? (
            // Show search results
            <FlatList
              data={results}
              keyExtractor={(item) => `${item.type}-${item.id}`}
              renderItem={renderSearchResult}
              showsVerticalScrollIndicator={false}
              style={styles.resultsList}
              ListEmptyComponent={
                loading ? (
                  <View style={styles.loadingContainer}>
                    <Text style={[styles.loadingText, { 
                      color: theme.text.muted,
                      fontFamily: theme.typography.fontFamily,
                    }]}>
                      Recherche en cours...
                    </Text>
                  </View>
                ) : (
                  <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, { 
                      color: theme.text.muted,
                      fontFamily: theme.typography.fontFamily,
                    }]}>
                      Aucun résultat trouvé
                    </Text>
                  </View>
                )
              }
            />
          ) : (
            // Show suggestions and trending
            <View>
              {recentSearches.length > 0 && (
                <View style={styles.suggestionSection}>
                  <Text style={[styles.sectionTitle, { 
                    color: theme.text.secondary,
                    fontFamily: theme.typography.fontFamily,
                    fontWeight: theme.typography.weights.semibold,
                  }]}>
                    Recherches récentes
                  </Text>
                  <FlatList
                    data={recentSearches.slice(0, 5)}
                    keyExtractor={(item, index) => `recent-${index}`}
                    renderItem={renderSuggestion}
                    showsVerticalScrollIndicator={false}
                  />
                </View>
              )}

              {trendingTopics.length > 0 && (
                <View style={styles.suggestionSection}>
                  <Text style={[styles.sectionTitle, { 
                    color: theme.text.secondary,
                    fontFamily: theme.typography.fontFamily,
                    fontWeight: theme.typography.weights.semibold,
                  }]}>
                    Tendances
                  </Text>
                  <FlatList
                    data={trendingTopics.slice(0, 5)}
                    keyExtractor={(item) => item.hashtag}
                    renderItem={renderTrendingTopic}
                    showsVerticalScrollIndicator={false}
                  />
                </View>
              )}
            </View>
          )}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
  },
  clearButton: {
    padding: 4,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    maxHeight: 300,
    borderWidth: 1,
    zIndex: 1001,
  },
  resultsList: {
    maxHeight: 250,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  resultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  resultContent: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    marginBottom: 2,
  },
  resultSubtitle: {
    fontSize: 14,
  },
  resultType: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  resultTypeText: {
    fontSize: 12,
    textTransform: 'capitalize',
  },
  suggestionSection: {
    padding: 12,
  },
  sectionTitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  suggestionText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  trendingCount: {
    fontSize: 12,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
});