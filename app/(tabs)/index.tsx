import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, MessageCircle, Share, Crown, Shirt, Dumbbell, Brain, Shield, Sparkles } from 'lucide-react-native';
import { useState } from 'react';

interface Post {
  id: string;
  user: {
    name: string;
    avatar: string;
    glowPoints: number;
  };
  content: string;
  image: string;
  glowPoints: number;
  reactions: {
    couronne: number;
    vetements: number;
    sport: number;
    mental: number;
    confiance: number;
    soins: number;
  };
  timestamp: string;
}

const mockPosts: Post[] = [
  {
    id: '1',
    user: {
      name: 'Marie L.',
      avatar: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=150',
      glowPoints: 2840,
    },
    content: 'Premier cours de yoga ce matin ! Je me sens tellement bien et centrée 🧘‍♀️ Merci à tous pour vos encouragements hier !',
    image: 'https://images.pexels.com/photos/317157/pexels-photo-317157.jpeg?auto=compress&cs=tinysrgb&w=400',
    glowPoints: 156,
    reactions: {
      couronne: 3,
      vetements: 0,
      sport: 12,
      mental: 8,
      confiance: 5,
      soins: 4,
    },
    timestamp: '2h',
  },
  {
    id: '2',
    user: {
      name: 'Alex R.',
      avatar: 'https://images.pexels.com/photos/1674752/pexels-photo-1674752.jpeg?auto=compress&cs=tinysrgb&w=150',
      glowPoints: 1920,
    },
    content: 'Nouvelle coupe de cheveux ! Je me sens enfin aligné avec qui je suis vraiment ✨',
    image: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=400',
    glowPoints: 89,
    reactions: {
      couronne: 1,
      vetements: 7,
      sport: 0,
      mental: 3,
      confiance: 6,
      soins: 2,
    },
    timestamp: '4h',
  },
];

const reactionIcons = {
  couronne: { icon: Crown, color: '#FFD700', points: 20 },
  vetements: { icon: Shirt, color: '#8B5CF6', points: 10 },
  sport: { icon: Dumbbell, color: '#EF4444', points: 10 },
  mental: { icon: Brain, color: '#10B981', points: 10 },
  confiance: { icon: Shield, color: '#F59E0B', points: 10 },
  soins: { icon: Sparkles, color: '#EC4899', points: 10 },
};

export default function GlowFeed() {
  const [posts, setPosts] = useState(mockPosts);

  const handleReaction = (postId: string, reactionType: keyof typeof reactionIcons) => {
    setPosts(prevPosts =>
      prevPosts.map(post =>
        post.id === postId
          ? {
              ...post,
              reactions: {
                ...post.reactions,
                [reactionType]: post.reactions[reactionType] + 1,
              },
              glowPoints: post.glowPoints + reactionIcons[reactionType].points,
            }
          : post
      )
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient
        colors={['#8B5CF6', '#3B82F6']}
        style={styles.header}
      >
        <Text style={styles.title}>GlowUp</Text>
        <Text style={styles.subtitle}>Together</Text>
      </LinearGradient>

      <View style={styles.postsContainer}>
        {posts.map((post) => (
          <View key={post.id} style={styles.postCard}>
            <View style={styles.postHeader}>
              <Image source={{ uri: post.user.avatar }} style={styles.avatar} />
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{post.user.name}</Text>
                <View style={styles.glowPointsContainer}>
                  <Text style={styles.glowPoints}>{post.user.glowPoints} Glow Points</Text>
                  <Sparkles size={14} color="#FFD700" />
                </View>
              </View>
              <Text style={styles.timestamp}>{post.timestamp}</Text>
            </View>

            <Text style={styles.postContent}>{post.content}</Text>
            
            <Image source={{ uri: post.image }} style={styles.postImage} />

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
});