// Search System Hook with Full-Text Search and Suggestions
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase-client';
import { dbOptimizer } from '@/lib/database-optimizer';
import { AnalyticsManager } from '@/lib/analytics';
import { CacheManager, CacheKeys } from '@/lib/cache';

interface SearchResult {
  id: string;
  type: 'user' | 'post' | 'group';
  title: string;
  subtitle?: string;
  avatar?: string;
  metadata?: any;
}

interface UseSearchOptions {
  types?: ('user' | 'post' | 'group')[];
  limit?: number;
  debounceMs?: number;
}

export function useSearch(options: UseSearchOptions = {}) {
  const { types = ['user', 'post', 'group'], limit = 20, debounceMs = 300 } = options;
  
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const cache = CacheManager.getInstance();

  // Debounced search query
  const debouncedQuery = useMemo(() => {
    const timeoutId = setTimeout(() => query, debounceMs);
    return () => clearTimeout(timeoutId);
  }, [query, debounceMs]);

  // Load recent searches
  const loadRecentSearches = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_search_history')
        .select('query')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const searches = [...new Set(data?.map(s => s.query) || [])];
      setRecentSearches(searches);
    } catch (error: any) {
      console.error('Error loading recent searches:', error);
    }
  }, []);

  // Save search to history
  const saveSearchToHistory = useCallback(async (searchQuery: string, resultType: string, resultId?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('user_search_history')
        .insert({
          user_id: user.id,
          query: searchQuery,
          result_type: resultType,
          result_id: resultId,
        });

      // Update recent searches
      setRecentSearches(prev => {
        const updated = [searchQuery, ...prev.filter(q => q !== searchQuery)];
        return updated.slice(0, 10);
      });

    } catch (error: any) {
      console.error('Error saving search history:', error);
    }
  }, []);

  // Perform search
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Check cache first
      const cacheKey = `search-${searchQuery}-${types.join('-')}`;
      const cachedResults = await cache.get<SearchResult[]>(cacheKey);
      
      if (cachedResults) {
        setResults(cachedResults);
        setLoading(false);
        return;
      }

      const searchResults: SearchResult[] = [];

      // Search users
      if (types.includes('user')) {
        const { data: users, error: usersError } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url, glow_points, is_verified')
          .or(`username.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`)
          .limit(Math.floor(limit / types.length));

        if (usersError) throw usersError;

        users?.forEach(user => {
          searchResults.push({
            id: user.id,
            type: 'user',
            title: user.full_name || user.username || 'Utilisateur',
            subtitle: `@${user.username} • ${user.glow_points} Glow Points`,
            avatar: user.avatar_url,
            metadata: { is_verified: user.is_verified },
          });
        });
      }

      // Search posts
      if (types.includes('post')) {
        const { data: posts, error: postsError } = await supabase
          .from('posts')
          .select(`
            id, content, glow_points, created_at,
            profiles:author_id (username, full_name, avatar_url)
          `)
          .ilike('content', `%${searchQuery}%`)
          .eq('privacy', 'public')
          .order('glow_points', { ascending: false })
          .limit(Math.floor(limit / types.length));

        if (postsError) throw postsError;

        posts?.forEach(post => {
          searchResults.push({
            id: post.id,
            type: 'post',
            title: post.content?.substring(0, 100) + (post.content?.length > 100 ? '...' : '') || 'Post sans texte',
            subtitle: `Par ${post.profiles?.full_name || post.profiles?.username} • ${post.glow_points} points`,
            avatar: post.profiles?.avatar_url,
            metadata: { created_at: post.created_at },
          });
        });
      }

      // Search groups
      if (types.includes('group')) {
        const { data: groups, error: groupsError } = await supabase
          .from('groups')
          .select('id, name, category, image_url')
          .or(`name.ilike.%${searchQuery}%,category.ilike.%${searchQuery}%`)
          .limit(Math.floor(limit / types.length));

        if (groupsError) throw groupsError;

        groups?.forEach(group => {
          searchResults.push({
            id: group.id,
            type: 'group',
            title: group.name,
            subtitle: group.category || 'Groupe',
            avatar: group.image_url,
          });
        });
      }

      // Cache results
      await cache.set(cacheKey, searchResults, 300000); // 5 minutes

      setResults(searchResults);

      AnalyticsManager.trackEvent('search_performed', {
        query: searchQuery,
        types,
        resultCount: searchResults.length,
      });

    } catch (error: any) {
      setError(error.message);
      AnalyticsManager.trackError(error, 'useSearch.performSearch');
    } finally {
      setLoading(false);
    }
  }, [types, limit, cache]);

  // Get search suggestions
  const getSuggestions = useCallback(async (partialQuery: string) => {
    if (partialQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      // Get trending hashtags that match
      const { data: trending, error } = await supabase
        .from('trending_topics')
        .select('hashtag')
        .ilike('hashtag', `%${partialQuery}%`)
        .order('engagement_score', { ascending: false })
        .limit(5);

      if (error) throw error;

      const hashtagSuggestions = trending?.map(t => t.hashtag) || [];
      
      // Combine with recent searches
      const recentMatches = recentSearches.filter(search => 
        search.toLowerCase().includes(partialQuery.toLowerCase())
      ).slice(0, 3);

      setSuggestions([...hashtagSuggestions, ...recentMatches]);

    } catch (error: any) {
      console.error('Error getting suggestions:', error);
    }
  }, [recentSearches]);

  // Handle search input change
  const handleSearchChange = useCallback((newQuery: string) => {
    setQuery(newQuery);
    
    if (newQuery.trim()) {
      getSuggestions(newQuery);
      // Debounced search will trigger via useEffect
    } else {
      setResults([]);
      setSuggestions([]);
    }
  }, [getSuggestions]);

  // Handle search result selection
  const selectResult = useCallback((result: SearchResult) => {
    saveSearchToHistory(query, result.type, result.id);
    
    AnalyticsManager.trackEvent('search_result_selected', {
      query,
      resultType: result.type,
      resultId: result.id,
    });
  }, [query, saveSearchToHistory]);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.trim()) {
        performSearch(query);
      }
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [query, performSearch, debounceMs]);

  // Load recent searches on mount
  useEffect(() => {
    loadRecentSearches();
  }, [loadRecentSearches]);

  return {
    query,
    results,
    loading,
    error,
    suggestions,
    recentSearches,
    setQuery: handleSearchChange,
    selectResult,
    clearResults: () => setResults([]),
    clearHistory: () => setRecentSearches([]),
  };
}

// Hook for trending topics
export function useTrendingTopics() {
  const [topics, setTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTrending = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('trending_topics')
        .select('hashtag, post_count, engagement_score')
        .order('engagement_score', { ascending: false })
        .limit(10);

      if (error) throw error;
      setTopics(data || []);
    } catch (error: any) {
      console.error('Error loading trending topics:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrending();
  }, [loadTrending]);

  return { topics, loading, refresh: loadTrending };
}