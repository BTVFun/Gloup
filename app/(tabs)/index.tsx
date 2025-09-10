import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Pressable, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, MessageCircle, Share, Crown, Shirt, Dumbbell, Brain, Shield, Sparkles, Plus } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';

type ReactionKind = 'couronne' | 'vetements' | 'sport' | 'mental' | 'confiance' | 'soins';

type FeedPost = {
  id: string;
  author: {
    name: string;
    avatar: string;
    glowPoints: number;
  };
  content: string;
  image?: string;
  glowPoints: number;
  reactions: Record<ReactionKind, number>;
  timestamp: string;
};

const reactionIcons = {
  couronne: { icon: Crown, color: '#FFD700', points: 20 },
  vetements: { icon: Shirt, color: '#8B5CF6', points: 10 },
  sport: { icon: Dumbbell, color: '#EF4444', points: 10 },
  mental: { icon: Brain, color: '#10B981', points: 10 },
  confiance: { icon: Shield, color: '#F59E0B', points: 10 },
  soins: { icon: Sparkles, color: '#EC4899', points: 10 },
};

export default function GlowFeed() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchFeed() {
    setLoading(true);
    const { data: rows, error } = await supabase
      .from('posts')
      .select(`
        id, content, media_url, glow_points, created_at,
        profiles:author_id ( username, avatar_url, glow_points )
      `)
      .order('created_at', { ascending: false });
    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    const postIds = rows.map((r: any) => r.id);
    const { data: allReacts } = await supabase
      .from('reactions')
      .select('post_id, kind')
      .in('post_id', postIds);

    const reactMap = new Map<string, Record<ReactionKind, number>>();
    for (const id of postIds) {
      reactMap.set(id, {
        couronne: 0, vetements: 0, sport: 0, mental: 0, confiance: 0, soins: 0,
      });
    }
    (allReacts ?? []).forEach((r: any) => {
      const entry = reactMap.get(r.post_id)!;
      entry[r.kind as ReactionKind] += 1;
    });

    const mapped: FeedPost[] = rows.map((r: any) => ({
      id: r.id,
      author: {
        name: r.profiles?.username ?? 'Utilisateur',
        avatar: r.profiles?.avatar_url ?? 'https://placehold.co/100x100/png',
        glowPoints: r.profiles?.glow_points ?? 0,
      },
      content: r.content ?? '',
      image: r.media_url ?? undefined,
      glowPoints: r.glow_points ?? 0,
      reactions: reactMap.get(r.id)!,
      timestamp: timeSince(new Date(r.created_at)),
    }));

    setPosts(mapped);
    setLoading(false);
  }

  useEffect(() => {
    fetchFeed();
    const channel = supabase
      .channel('reactions-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, () => fetchFeed())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleReaction = async (postId: string, reactionType: keyof typeof reactionIcons) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Alert.alert('Connexion requise', 'Veuillez vous connecter pour réagir.');
    const { error } = await supabase
      .from('reactions')
      .insert({ post_id: postId, user_id: user.id, kind: reactionType as ReactionKind });
    if (error && (error as any).code !== '23505') {
      // 23505: duplicate unique (déjà réagi)
      Alert.alert('Erreur', error.message);
    } else {
      // Optimiste local
      setPosts(prev => prev.map(p => p.id === postId ? {
        ...p,
        reactions: { ...p.reactions, [reactionType]: p.reactions[reactionType] + 1 },
        glowPoints: p.glowPoints + reactionIcons[reactionType].points,
      } : p));
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
      <LinearGradient
        colors={['#8B5CF6', '#3B82F6']}
        style={styles.header}
      >
        <Text style={styles.title}>GlowUp</Text>
        <Text style={styles.subtitle}>Together</Text>
      </LinearGradient>

      <View style={styles.postsContainer}>
        {loading ? (
          <Text style={{ textAlign: 'center', color: '#6B7280' }}>Chargement…</Text>
        ) : posts.map((post) => (
          <View key={post.id} style={styles.postCard}>
            <View style={styles.postHeader}>
              <Image source={{ uri: post.author.avatar }} style={styles.avatar} />
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{post.author.name}</Text>
                <View style={styles.glowPointsContainer}>
                  <Text style={styles.glowPoints}>{post.author.glowPoints} Glow Points</Text>
                  <Sparkles size={14} color="#FFD700" />
                </View>
              </View>
              <Text style={styles.timestamp}>{post.timestamp}</Text>
            </View>

            <Text style={styles.postContent}>{post.content}</Text>
            
            {!!post.image && (<Image source={{ uri: post.image }} style={styles.postImage} />)}

            <View style={styles.reactionsContainer}>
              <Text style={styles.totalPoints}>+{post.glowPoints} Glow Points</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reactionButtons}>
                {Object.entries(reactionIcons).map(([key, { icon: Icon, color }]) => (
                  <Pressable
                    key={key}
                    style={[styles.reactionButton, { borderColor: color }]}
                    onPress={() => handleReaction(post.id, key as keyof typeof reactionIcons)}
                  >
                    <Icon size={20} color={color} />
                    <Text style={[styles.reactionCount, { color }]}>
                      {post.reactions[key as keyof typeof post.reactions]}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.actionButton}>
                <Heart size={20} color="#6B7280" />
                <Text style={styles.actionText}>Encourager</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <MessageCircle size={20} color="#6B7280" />
                <Text style={styles.actionText}>Commenter</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Share size={20} color="#6B7280" />
                <Text style={styles.actionText}>Partager</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
      </ScrollView>
      
      {/* Bouton flottant pour créer un post */}
      <TouchableOpacity 
        style={styles.floatingButton}
        onPress={() => router.push('/(tabs)/create')}
      >
        <LinearGradient
          colors={['#8B5CF6', '#3B82F6']}
          style={styles.floatingButtonGradient}
        >
          <Plus size={28} color="white" strokeWidth={2.5} />
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
  postsContainer: {
    padding: 16,
  },
  postCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  glowPointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  glowPoints: {
    fontSize: 12,
    color: '#6B7280',
    marginRight: 4,
  },
  timestamp: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  postContent: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 12,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
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
  reactionButtons: {
    flexDirection: 'row',
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
  actionButtons: {
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
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  floatingButtonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

function timeSince(date: Date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  const intervals: [number, string][] = [[3600*24, 'j'], [3600, 'h'], [60, 'min']];
  for (const [s, label] of intervals) {
    const v = Math.floor(seconds / s);
    if (v >= 1) return `${v}${label}`;
  }
  return `${seconds}s`;
}
