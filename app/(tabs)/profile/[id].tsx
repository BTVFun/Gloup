// User Profile Detail Screen
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Crown, MoveHorizontal as MoreHorizontal, MessageCircle, UserX, VolumeX } from 'lucide-react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { FollowButton } from '@/components/ui/FollowButton';
import { PostCard } from '@/components/ui/PostCard';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useTheme } from '@/lib/theme-context';
import { AnalyticsManager } from '@/lib/analytics';

export default function UserProfileScreen() {
  const { theme } = useTheme();
  const { id: userId } = useLocalSearchParams<{ id: string }>();
  const { profile, loading, blockUser, unblockUser, muteUser } = useUserProfile(userId!);

  useEffect(() => {
    if (userId) {
      AnalyticsManager.trackScreenView('user_profile', { userId });
    }
  }, [userId]);

  const handleMessage = () => {
    if (userId) {
      router.push({ pathname: '/(tabs)/chat/[id]', params: { id: userId } } as any);
    }
  };

  const handleBlock = () => {
    Alert.alert(
      'Bloquer cet utilisateur',
      'Vous ne verrez plus ses posts et il ne pourra plus vous contacter.',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Bloquer', 
          style: 'destructive',
          onPress: blockUser
        }
      ]
    );
  };

  const handleUnblock = () => {
    Alert.alert(
      'Débloquer cet utilisateur',
      'Vous pourrez à nouveau voir ses posts et recevoir ses messages.',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Débloquer', 
          onPress: unblockUser
        }
      ]
    );
  };

  const handleMute = () => {
    Alert.alert(
      'Masquer cet utilisateur',
      'Vous ne verrez plus ses posts dans votre fil, mais il pourra toujours vous contacter.',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Masquer', 
          onPress: muteUser
        }
      ]
    );
  };

  const showOptions = () => {
    const options = [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Envoyer un message', onPress: handleMessage },
    ];

    if (profile?.is_blocked) {
      options.push({ text: 'Débloquer', onPress: handleUnblock });
    } else {
      options.push(
        { text: 'Masquer', onPress: handleMute },
        { text: 'Bloquer', onPress: handleBlock, style: 'destructive' }
      );
    }

    Alert.alert('Options', '', options as any);
  };

  if (loading || !profile) {
    return (
      <View style={[styles.container, { backgroundColor: theme.surface.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { 
            color: theme.text.muted,
            fontFamily: theme.typography.fontFamily,
          }]}>
            Chargement du profil...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.surface.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={['#8B5CF6', '#3B82F6']}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color="white" />
            </TouchableOpacity>
            <TouchableOpacity onPress={showOptions} style={styles.optionsButton}>
              <MoreHorizontal size={24} color="white" />
            </TouchableOpacity>
          </View>

          <View style={styles.profileSection}>
            <Image
              source={{ uri: profile.avatar_url || 'https://placehold.co/120x120/png' }}
              style={styles.profileImage}
            />
            
            <View style={styles.nameContainer}>
              <Text style={styles.profileName}>{profile.full_name || profile.username}</Text>
              {profile.is_verified && (
                <Crown size={20} color="#FFD700" style={{ marginLeft: 8 }} />
              )}
            </View>
            
            <Text style={styles.username}>@{profile.username}</Text>
            
            {profile.bio && (
              <Text style={styles.profileBio}>{profile.bio}</Text>
            )}

            <View style={styles.glowPointsContainer}>
              <Crown size={16} color="#FFD700" />
              <Text style={styles.glowPointsText}>{profile.glow_points} Glow Points</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: theme.text.primary }]}>
                {profile.posts_count || 0}
              </Text>
              <Text style={[styles.statLabel, { color: theme.text.muted }]}>Posts</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: theme.text.primary }]}>
                {profile.follower_count}
              </Text>
              <Text style={[styles.statLabel, { color: theme.text.muted }]}>Abonnés</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: theme.text.primary }]}>
                {profile.following_count}
              </Text>
              <Text style={[styles.statLabel, { color: theme.text.muted }]}>Abonnements</Text>
            </View>
          </View>

          <View style={styles.actionsContainer}>
            <FollowButton userId={userId!} size="large" style={styles.followButton} />
            <TouchableOpacity 
              style={[styles.messageButton, { 
                backgroundColor: theme.surface.container,
                borderColor: theme.surface.border,
                borderRadius: theme.radius.lg,
              }]}
              onPress={handleMessage}
            >
              <MessageCircle size={20} color={theme.color.brand[600]} />
            </TouchableOpacity>
          </View>

          {profile.recent_posts && profile.recent_posts.length > 0 && (
            <View style={styles.postsSection}>
              <Text style={[styles.sectionTitle, { 
                color: theme.text.primary,
                fontFamily: theme.typography.fontFamily,
                fontWeight: theme.typography.weights.semibold,
              }]}>
                Posts récents
              </Text>
              
              <View style={styles.postsGrid}>
                {profile.recent_posts.map((post: any) => (
                  <TouchableOpacity key={post.id} style={styles.postThumbnail}>
                    {post.media_url && (
                      <Image source={{ uri: post.media_url }} style={styles.postImage} />
                    )}
                    <View style={styles.postOverlay}>
                      <Text style={styles.postGlowPoints}>+{post.glow_points}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsButton: {
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
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: 'white',
    marginBottom: 16,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  username: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 12,
  },
  profileBio: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
    marginBottom: 16,
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
    fontSize: 14,
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
    marginBottom: 20,
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
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  followButton: {
    flex: 1,
  },
  messageButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  postsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    marginBottom: 16,
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  postThumbnail: {
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
});