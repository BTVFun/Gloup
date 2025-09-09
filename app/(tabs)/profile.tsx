import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Settings, CreditCard as Edit, Crown, Heart, MessageCircle, Share, Sparkles, Trophy, Target, Calendar } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';

interface UserStats {
  glowPoints: number;
  posts: number;
  followers: number;
  following: number;
  reactions: number;
}

const defaultStats: UserStats = { glowPoints: 0, posts: 0, followers: 0, following: 0, reactions: 0 };

const achievements = [
  { id: '1', title: 'Premier Glow', icon: Sparkles, color: '#FFD700', earned: true },
  { id: '2', title: '100 Glow Points', icon: Crown, color: '#8B5CF6', earned: true },
  { id: '3', title: 'Inspirateur', icon: Heart, color: '#EF4444', earned: true },
  { id: '4', title: '1000 Points', icon: Trophy, color: '#10B981', earned: false },
];

const visionBoardImages = [
  'https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=200',
  'https://images.pexels.com/photos/317157/pexels-photo-317157.jpeg?auto=compress&cs=tinysrgb&w=200',
  'https://images.pexels.com/photos/1181433/pexels-photo-1181433.jpeg?auto=compress&cs=tinysrgb&w=200',
  'https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg?auto=compress&cs=tinysrgb&w=200',
];

const recentPosts = [
  {
    id: '1',
    image: 'https://images.pexels.com/photos/317157/pexels-photo-317157.jpeg?auto=compress&cs=tinysrgb&w=200',
    glowPoints: 89,
  },
  {
    id: '2',
    image: 'https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=200',
    glowPoints: 156,
  },
  {
    id: '3',
    image: 'https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg?auto=compress&cs=tinysrgb&w=200',
    glowPoints: 72,
  },
  {
    id: '4',
    image: 'https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg?auto=compress&cs=tinysrgb&w=200',
    glowPoints: 134,
  },
];

export default function ProfileScreen() {
  const [profile, setProfile] = useState<{full_name?: string|null; avatar_url?: string|null; bio?: string|null; glow_points?: number|null}>({});
  const [userStats, setUserStats] = useState<UserStats>(defaultStats);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: pf } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, bio, glow_points')
        .eq('id', user.id)
        .single();
      setProfile(pf ?? {});

      const { count } = await supabase
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('author_id', user.id);

      setUserStats({
        glowPoints: pf?.glow_points ?? 0,
        posts: count ?? 0,
        followers: 0,
        following: 0,
        reactions: pf?.glow_points ?? 0,
      });
    })();
  }, []);
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient
        colors={['#8B5CF6', '#3B82F6']}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.headerButton} onPress={() => router.push('/(tabs)/profile-edit' as any)}>
            <Edit size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Settings size={24} color="white" />
          </TouchableOpacity>
        </View>

        <View style={styles.profileSection}>
          <Image
            source={{ uri: profile.avatar_url ?? 'https://placehold.co/200x200/png' }}
            style={styles.profileImage}
          />
          
          <Text style={styles.profileName}>{profile.full_name ?? 'Mon profil'}</Text>
          <Text style={styles.profileBio}>
            {profile.bio ?? 'Bienvenue sur GlowUp ✨'}
          </Text>

          <View style={styles.glowPointsContainer}>
            <Crown size={20} color="#FFD700" />
            <Text style={styles.glowPointsText}>{userStats.glowPoints} Glow Points</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{userStats.posts}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{userStats.followers}</Text>
            <Text style={styles.statLabel}>Abonnés</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{userStats.following}</Text>
            <Text style={styles.statLabel}>Abonnements</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{userStats.reactions}</Text>
            <Text style={styles.statLabel}>Réactions</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Badges & Réalisations</Text>
          <View style={styles.achievementsContainer}>
            {achievements.map((achievement) => {
              const IconComponent = achievement.icon;
              return (
                <View
                  key={achievement.id}
                  style={[
                    styles.achievementItem,
                    { opacity: achievement.earned ? 1 : 0.4 }
                  ]}
                >
                  <View style={[styles.achievementIcon, { backgroundColor: achievement.color }]}>
                    <IconComponent size={20} color="white" />
                  </View>
                  <Text style={styles.achievementTitle}>{achievement.title}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Vision Board</Text>
            <TouchableOpacity>
              <Text style={styles.editButton}>Modifier</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionDescription}>
            Visualisez vos objectifs et sources d'inspiration
          </Text>
          <View style={styles.visionBoardGrid}>
            {visionBoardImages.map((image, index) => (
              <Image
                key={index}
                source={{ uri: image }}
                style={styles.visionBoardImage}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mes derniers Glows</Text>
          <View style={styles.postsGrid}>
            {recentPosts.map((post) => (
              <TouchableOpacity key={post.id} style={styles.postItem}>
                <Image source={{ uri: post.image }} style={styles.postImage} />
                <View style={styles.postOverlay}>
                  <Text style={styles.postGlowPoints}>+{post.glowPoints}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Progression du mois</Text>
          <View style={styles.progressCard}>
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.progressGradient}
            >
              <View style={styles.progressItem}>
                <Target size={24} color="white" />
                <View style={styles.progressInfo}>
                  <Text style={styles.progressTitle}>Objectifs atteints</Text>
                  <Text style={styles.progressValue}>8/10</Text>
                </View>
              </View>
              
              <View style={styles.progressItem}>
                <Calendar size={24} color="white" />
                <View style={styles.progressInfo}>
                  <Text style={styles.progressTitle}>Jours actifs</Text>
                  <Text style={styles.progressValue}>24/30</Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        </View>

        <TouchableOpacity style={styles.supportButton}>
          <Text style={styles.supportButtonText}>❤️ Soutenir GlowUp</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.supportButton, { backgroundColor: '#ef4444' }]} onPress={async () => { await supabase.auth.signOut(); }}>
          <Text style={styles.supportButtonText}>↩︎ Se déconnecter</Text>
        </TouchableOpacity>
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
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileSection: {
    alignItems: 'center',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: 'white',
    marginBottom: 12,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  profileBio: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
    marginBottom: 12,
  },
  glowPointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  glowPointsText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginLeft: 6,
  },
  content: {
    padding: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginTop: -20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  editButton: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  achievementsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  achievementItem: {
    alignItems: 'center',
    flex: 1,
  },
  achievementIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  achievementTitle: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
  },
  visionBoardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  visionBoardImage: {
    width: '48%',
    height: 120,
    borderRadius: 12,
    marginBottom: 8,
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  postItem: {
    width: '48%',
    marginBottom: 12,
    position: 'relative',
  },
  postImage: {
    width: '100%',
    height: 140,
    borderRadius: 12,
  },
  postOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  postGlowPoints: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  progressCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  progressGradient: {
    padding: 20,
  },
  progressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressInfo: {
    marginLeft: 16,
  },
  progressTitle: {
    fontSize: 16,
    color: 'white',
    marginBottom: 4,
  },
  progressValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  supportButton: {
    backgroundColor: '#EC4899',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  supportButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});
