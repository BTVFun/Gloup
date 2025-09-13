# Phase 4: Gamification & Engagement - Optimized Prompts

## 1. Badge and Achievement System

### The Prompt
```
You are an expert gamification engineer with 10+ years experience in social apps and behavioral psychology. Design and implement a comprehensive badge and achievement system for GLOUP, a benevolent social network focused on personal growth.

REQUIREMENTS:
1. Create a multi-tier achievement system with progressive unlocking
2. Design visually appealing badge categories aligned with growth mindset
3. Implement real-time achievement tracking with notifications
4. Create rarity levels (Common, Rare, Epic, Legendary)
5. Add streak tracking and milestone rewards
6. Include social proof elements (showcase, sharing)

TECHNICAL SPECIFICATIONS:
- React Native with TypeScript
- PostgreSQL/Supabase for persistence
- Real-time updates via WebSocket
- Analytics tracking for engagement metrics
- Offline-first with sync capabilities

BADGE CATEGORIES TO IMPLEMENT:
1. Growth Badges (learning milestones, skill development)
2. Community Badges (helping others, collaboration)
3. Consistency Badges (streaks, daily engagement)
4. Impact Badges (positive influence metrics)
5. Special Event Badges (seasonal, challenges)

DATABASE SCHEMA:
```sql
-- Badges definition table
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  rarity VARCHAR(20) NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  icon_url TEXT,
  unlock_criteria JSONB NOT NULL,
  points_value INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User achievements
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES badges(id),
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  progress JSONB DEFAULT '{}',
  is_showcased BOOLEAN DEFAULT false,
  share_count INTEGER DEFAULT 0,
  UNIQUE(user_id, badge_id)
);

-- Achievement progress tracking
CREATE TABLE achievement_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES badges(id),
  metric_key VARCHAR(100) NOT NULL,
  current_value NUMERIC DEFAULT 0,
  target_value NUMERIC NOT NULL,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id, metric_key)
);

-- Indexes for performance
CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX idx_achievement_progress_user ON achievement_progress(user_id);
CREATE INDEX idx_badges_category ON badges(category);
```

REACT NATIVE IMPLEMENTATION:
```typescript
// hooks/useAchievements.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';

interface Badge {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  iconUrl: string;
  pointsValue: number;
  unlockCriteria: Record<string, any>;
}

interface Achievement {
  badge: Badge;
  unlockedAt?: Date;
  progress: Record<string, number>;
  isShowcased: boolean;
}

export const useAchievements = (userId: string) => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [recentUnlocks, setRecentUnlocks] = useState<Badge[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  // Track achievement progress
  const trackProgress = useCallback(async (
    action: string, 
    value: number = 1
  ) => {
    try {
      // Update local progress immediately
      const progressKey = `achievement_progress_${action}`;
      const current = await AsyncStorage.getItem(progressKey);
      const newValue = (parseInt(current || '0') + value).toString();
      await AsyncStorage.setItem(progressKey, newValue);

      // Batch update to server
      await supabase.rpc('update_achievement_progress', {
        p_user_id: userId,
        p_action: action,
        p_value: value
      });

      // Check for new unlocks
      const { data: newUnlocks } = await supabase.rpc('check_achievement_unlocks', {
        p_user_id: userId
      });

      if (newUnlocks?.length > 0) {
        handleNewUnlocks(newUnlocks);
      }
    } catch (error) {
      console.error('Error tracking achievement progress:', error);
    }
  }, [userId]);

  // Handle new achievement unlocks
  const handleNewUnlocks = useCallback(async (unlocks: Badge[]) => {
    for (const badge of unlocks) {
      // Haptic feedback
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      );

      // Show notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🏆 Achievement Unlocked!',
          body: `You've earned the "${badge.name}" badge!`,
          data: { badgeId: badge.id },
          sound: 'achievement.wav',
        },
        trigger: null,
      });

      // Update UI
      setRecentUnlocks(prev => [...prev, badge]);
      
      // Analytics
      trackAnalytics('achievement_unlocked', {
        badge_id: badge.id,
        badge_name: badge.name,
        category: badge.category,
        rarity: badge.rarity,
        points: badge.pointsValue
      });
    }

    // Clear recent unlocks after animation
    setTimeout(() => {
      setRecentUnlocks([]);
    }, 5000);
  }, []);

  // Load user achievements
  useEffect(() => {
    const loadAchievements = async () => {
      try {
        const { data, error } = await supabase
          .from('user_achievements_view')
          .select('*')
          .eq('user_id', userId);

        if (error) throw error;

        setAchievements(data || []);
        setTotalPoints(
          data?.reduce((sum, a) => sum + a.badge.pointsValue, 0) || 0
        );
      } catch (error) {
        console.error('Error loading achievements:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAchievements();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel(`achievements:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'user_achievements',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        loadAchievements();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId]);

  return {
    achievements,
    recentUnlocks,
    totalPoints,
    loading,
    trackProgress,
  };
};

// components/BadgeShowcase.tsx
import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import LottieView from 'lottie-react-native';

const RARITY_COLORS = {
  common: ['#718096', '#4A5568'],
  rare: ['#4299E1', '#2B6CB0'],
  epic: ['#9F7AEA', '#805AD5'],
  legendary: ['#F6AD55', '#ED8936'],
};

export const BadgeShowcase: React.FC<{
  achievements: Achievement[];
  onBadgePress?: (badge: Badge) => void;
}> = ({ achievements, onBadgePress }) => {
  const showcasedBadges = achievements
    .filter(a => a.isShowcased)
    .slice(0, 5);

  const animatedValues = useRef(
    showcasedBadges.map(() => new Animated.Value(0))
  ).current;

  useEffect(() => {
    // Staggered entrance animation
    const animations = animatedValues.map((anim, index) => 
      Animated.timing(anim, {
        toValue: 1,
        duration: 500,
        delay: index * 100,
        useNativeDriver: true,
      })
    );

    Animated.parallel(animations).start();
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {showcasedBadges.map((achievement, index) => (
          <Animated.View
            key={achievement.badge.id}
            style={[
              styles.badgeContainer,
              {
                opacity: animatedValues[index],
                transform: [{
                  translateY: animatedValues[index].interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                }],
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => onBadgePress?.(achievement.badge)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={RARITY_COLORS[achievement.badge.rarity]}
                style={styles.badgeGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.badgeContent}>
                  <LottieView
                    source={{ uri: achievement.badge.iconUrl }}
                    style={styles.badgeIcon}
                    autoPlay
                    loop={false}
                  />
                  {achievement.badge.rarity === 'legendary' && (
                    <LottieView
                      source={require('@/assets/animations/sparkle.json')}
                      style={styles.sparkleOverlay}
                      autoPlay
                      loop
                    />
                  )}
                </View>
                <Text style={styles.badgeName}>
                  {achievement.badge.name}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  badgeContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  badgeGradient: {
    width: 80,
    height: 100,
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeContent: {
    position: 'relative',
    width: 60,
    height: 60,
  },
  badgeIcon: {
    width: '100%',
    height: '100%',
  },
  sparkleOverlay: {
    position: 'absolute',
    width: '150%',
    height: '150%',
    top: '-25%',
    left: '-25%',
  },
  badgeName: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
});
```

MONITORING & ANALYTICS:
```typescript
// Track engagement metrics
const trackAchievementMetrics = {
  unlock_rate: 'percentage of users with badges',
  engagement_lift: 'activity increase post-unlock',
  showcase_rate: 'percentage showcasing badges',
  share_rate: 'social sharing frequency',
  retention_impact: 'correlation with retention',
};

// A/B test different unlock criteria
const experimentVariants = {
  control: 'standard thresholds',
  variant_a: 'lower thresholds',
  variant_b: 'dynamic difficulty',
};
```

OUTPUT: Complete badge system with animations, notifications, and analytics tracking.
```

### Implementation Notes
- Uses gamification psychology principles (variable rewards, social proof)
- Implements offline-first architecture with sync
- Includes haptic feedback and sound for engagement
- Tracks comprehensive analytics for optimization
- Supports A/B testing for unlock criteria

---

## 2. Community Challenges System

### The Prompt
```
You are an expert in building viral social features with experience in TikTok, Instagram, and fitness apps. Create a comprehensive community challenges system for GLOUP that drives engagement through collaborative and competitive elements.

CORE REQUIREMENTS:
1. Time-limited challenges (daily, weekly, monthly)
2. Solo and team participation modes
3. Real-time leaderboards with live updates
4. Challenge creation by verified users
5. Multimedia submissions (photo, video, text)
6. Voting and validation mechanisms
7. Reward distribution system

CHALLENGE TYPES:
- Growth Challenges: Learn new skills, read books, meditation streaks
- Fitness Challenges: Steps, workouts, healthy habits
- Creativity Challenges: Art, writing, music creation
- Kindness Challenges: Random acts, volunteering, helping others
- Sustainability Challenges: Eco-friendly actions, waste reduction

DATABASE SCHEMA:
```sql
-- Challenge definitions
CREATE TABLE challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES users(id),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL,
  difficulty VARCHAR(20) CHECK (difficulty IN ('easy', 'medium', 'hard', 'extreme')),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  max_participants INTEGER,
  team_size INTEGER DEFAULT 1,
  rules JSONB DEFAULT '{}',
  rewards JSONB DEFAULT '{}',
  media_requirements JSONB DEFAULT '{}',
  is_featured BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'upcoming',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Challenge participation
CREATE TABLE challenge_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES challenge_teams(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_submission TIMESTAMPTZ,
  total_points INTEGER DEFAULT 0,
  rank INTEGER,
  status VARCHAR(20) DEFAULT 'active',
  completion_rate NUMERIC(5,2) DEFAULT 0,
  UNIQUE(challenge_id, user_id)
);

-- Challenge submissions
CREATE TABLE challenge_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES challenge_participants(id) ON DELETE CASCADE,
  content_type VARCHAR(20) CHECK (content_type IN ('text', 'image', 'video', 'link')),
  content_url TEXT,
  caption TEXT,
  metadata JSONB DEFAULT '{}',
  validation_status VARCHAR(20) DEFAULT 'pending',
  validator_id UUID REFERENCES users(id),
  points_earned INTEGER DEFAULT 0,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leaderboard materialized view for performance
CREATE MATERIALIZED VIEW challenge_leaderboard AS
SELECT 
  cp.challenge_id,
  cp.user_id,
  u.username,
  u.avatar_url,
  cp.total_points,
  cp.rank,
  cp.completion_rate,
  COUNT(cs.id) as submission_count,
  cp.team_id,
  ct.name as team_name
FROM challenge_participants cp
JOIN users u ON cp.user_id = u.id
LEFT JOIN challenge_submissions cs ON cp.id = cs.participant_id
LEFT JOIN challenge_teams ct ON cp.team_id = ct.id
WHERE cp.status = 'active'
GROUP BY cp.challenge_id, cp.user_id, u.username, u.avatar_url, 
         cp.total_points, cp.rank, cp.completion_rate, cp.team_id, ct.name;

-- Refresh leaderboard every 5 minutes
CREATE OR REPLACE FUNCTION refresh_leaderboard()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY challenge_leaderboard;
END;
$$ LANGUAGE plpgsql;
```

REACT NATIVE IMPLEMENTATION:
```typescript
// screens/ChallengesScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Animated,
} from 'react-native';
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Video } from 'expo-av';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { ChallengeCard } from '@/components/ChallengeCard';
import { Leaderboard } from '@/components/Leaderboard';
import { SubmissionValidator } from '@/components/SubmissionValidator';

interface Challenge {
  id: string;
  title: string;
  description: string;
  type: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
  startDate: Date;
  endDate: Date;
  participantCount: number;
  maxParticipants: number;
  rewards: any;
  isJoined: boolean;
  progress: number;
}

export const ChallengesScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'discover' | 'joined' | 'create'>('discover');
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  // Real-time leaderboard updates
  const { data: leaderboardData } = useRealtimeSubscription(
    'challenge_leaderboard',
    selectedChallenge?.id ? { challenge_id: selectedChallenge.id } : null
  );

  // Challenge submission with AI validation
  const submitChallenge = async (
    challengeId: string,
    mediaUri: string,
    type: 'image' | 'video'
  ) => {
    setIsSubmitting(true);
    
    try {
      // Upload media
      const formData = new FormData();
      formData.append('file', {
        uri: mediaUri,
        type: type === 'image' ? 'image/jpeg' : 'video/mp4',
        name: `submission_${Date.now()}.${type === 'image' ? 'jpg' : 'mp4'}`,
      } as any);

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const { url } = await uploadResponse.json();

      // Validate submission with AI
      const validationResponse = await fetch('/api/validate-submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeId,
          contentUrl: url,
          contentType: type,
        }),
      });

      const validation = await validationResponse.json();

      if (validation.isValid) {
        // Submit to challenge
        const { data, error } = await supabase
          .from('challenge_submissions')
          .insert({
            challenge_id: challengeId,
            content_type: type,
            content_url: url,
            validation_status: 'approved',
            points_earned: validation.points,
          });

        if (!error) {
          // Show success animation
          showSuccessAnimation(validation.points);
          
          // Update local state
          updateChallengeProgress(challengeId, validation.points);
          
          // Track analytics
          trackEvent('challenge_submission', {
            challenge_id: challengeId,
            content_type: type,
            points: validation.points,
          });
        }
      } else {
        showError(validation.reason);
      }
    } catch (error) {
      console.error('Submission error:', error);
      showError('Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Capture media for submission
  const captureMedia = async (type: 'photo' | 'video') => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      showError('Camera permission required');
      return;
    }

    if (type === 'photo') {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
      });

      if (!result.canceled) {
        await submitChallenge(
          selectedChallenge!.id,
          result.assets[0].uri,
          'image'
        );
      }
    } else {
      // Navigate to video recording screen
      navigation.navigate('RecordVideo', {
        challengeId: selectedChallenge!.id,
        onComplete: (uri: string) => submitChallenge(
          selectedChallenge!.id,
          uri,
          'video'
        ),
      });
    }
  };

  return (
    <View style={styles.container}>
      {/* Animated Header */}
      <Animated.View
        style={[
          styles.header,
          {
            transform: [{
              translateY: scrollY.interpolate({
                inputRange: [0, 100],
                outputRange: [0, -50],
                extrapolate: 'clamp',
              }),
            }],
          },
        ]}
      >
        <Text style={styles.title}>Challenges</Text>
        <View style={styles.tabs}>
          {(['discover', 'joined', 'create'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[
                styles.tab,
                activeTab === tab && styles.activeTab,
              ]}
            >
              <Text style={[
                styles.tabText,
                activeTab === tab && styles.activeTabText,
              ]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      {/* Challenge List */}
      <Animated.FlatList
        data={challenges}
        renderItem={({ item }) => (
          <ChallengeCard
            challenge={item}
            onPress={() => setSelectedChallenge(item)}
            onJoin={() => joinChallenge(item.id)}
            onSubmit={() => captureMedia('photo')}
          />
        )}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={loadChallenges}
            colors={['#6366F1']}
          />
        }
      />

      {/* Live Leaderboard Modal */}
      {selectedChallenge && (
        <Leaderboard
          challengeId={selectedChallenge.id}
          data={leaderboardData}
          currentUserId={userId}
          onClose={() => setSelectedChallenge(null)}
        />
      )}
    </View>
  );
};
```

ENGAGEMENT FEATURES:
```typescript
// Push notifications for challenge events
const challengeNotifications = {
  challenge_starting: 'Your challenge starts in 1 hour!',
  friend_joined: 'Your friend joined the challenge',
  rank_change: 'You moved up to #3!',
  submission_validated: 'Your submission earned 50 points!',
  challenge_ending: 'Last day to complete the challenge!',
};

// Viral mechanics
const viralFeatures = {
  invite_friends: 'Earn bonus points for team members',
  share_progress: 'Share achievements to social media',
  streak_bonuses: 'Daily submission streaks multiply points',
  power_hours: 'Double points during specific times',
  referral_rewards: 'Unlock exclusive challenges by inviting',
};
```

OUTPUT: Complete challenge system with real-time updates, AI validation, and viral mechanics.
```

### Implementation Notes
- Real-time leaderboard updates via WebSocket
- AI-powered submission validation
- Multimedia support with optimized uploads
- Viral mechanics for organic growth
- Performance optimization with materialized views

---

## 3. Stories/Status Feature

### The Prompt
```
You are a senior mobile engineer who has built Stories features for Instagram, WhatsApp, and Snapchat. Implement a full Stories/Status feature for GLOUP with a focus on personal growth moments and achievements.

CORE REQUIREMENTS:
1. 24-hour ephemeral content with optional persistence
2. Rich media support (photos, videos, text, voice notes)
3. Interactive elements (polls, questions, reactions)
4. Privacy controls (public, friends, custom lists)
5. Story highlights for permanent showcase
6. Analytics and insights for creators
7. Seamless creation and consumption flow

TECHNICAL SPECIFICATIONS:
- React Native with Reanimated 2 for 60fps animations
- Video processing with FFmpeg
- CDN integration for media delivery
- Preloading and caching strategies
- Accessibility support (captions, descriptions)

DATABASE SCHEMA:
```sql
-- Stories/Status posts
CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) CHECK (type IN ('image', 'video', 'text', 'voice')),
  media_url TEXT,
  thumbnail_url TEXT,
  duration INTEGER DEFAULT 5000, -- milliseconds
  text_content TEXT,
  text_style JSONB DEFAULT '{}',
  stickers JSONB DEFAULT '[]',
  mentions UUID[] DEFAULT '{}',
  location JSONB,
  privacy VARCHAR(20) DEFAULT 'friends',
  custom_audience UUID[] DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  is_highlight BOOLEAN DEFAULT false,
  highlight_id UUID REFERENCES story_highlights(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Story views tracking
CREATE TABLE story_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  view_duration INTEGER, -- milliseconds
  reaction VARCHAR(50),
  replied BOOLEAN DEFAULT false,
  UNIQUE(story_id, viewer_id)
);

-- Story interactions
CREATE TABLE story_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) CHECK (type IN ('poll', 'question', 'quiz', 'slider')),
  response TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Story highlights
CREATE TABLE story_highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL,
  cover_url TEXT,
  story_ids UUID[] DEFAULT '{}',
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Optimized view for story ring display
CREATE OR REPLACE VIEW story_rings AS
SELECT DISTINCT ON (s.user_id)
  s.user_id,
  u.username,
  u.avatar_url,
  s.created_at as latest_story_at,
  COUNT(*) OVER (PARTITION BY s.user_id) as story_count,
  CASE 
    WHEN sv.viewer_id IS NOT NULL THEN true 
    ELSE false 
  END as viewed
FROM stories s
JOIN users u ON s.user_id = u.id
LEFT JOIN story_views sv ON s.id = sv.story_id AND sv.viewer_id = current_user_id()
WHERE s.expires_at > NOW()
ORDER BY s.user_id, s.created_at DESC;
```

REACT NATIVE IMPLEMENTATION:
```typescript
// components/StoryCamera.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
} from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import { Audio } from 'expo-av';
import * as MediaLibrary from 'expo-media-library';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';

export const StoryCamera: React.FC<{
  onCapture: (media: any) => void;
  onClose: () => void;
}> = ({ onCapture, onClose }) => {
  const [cameraType, setCameraType] = useState(CameraType.back);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const cameraRef = useRef<Camera>(null);
  const recordingTimer = useRef<NodeJS.Timeout>();
  
  // Gesture animations
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  
  // Drawing path for text stories
  const path = useRef(Skia.Path.Make()).current;
  const [paths, setPaths] = useState<any[]>([]);

  // Pinch to zoom gesture
  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = e.scale;
    })
    .onEnd(() => {
      scale.value = withSpring(1);
    });

  // Long press to record video
  const longPressGesture = Gesture.LongPress()
    .minDuration(200)
    .onStart(() => {
      runOnJS(startRecording)();
    })
    .onEnd(() => {
      runOnJS(stopRecording)();
    });

  const startRecording = async () => {
    if (!cameraRef.current) return;
    
    try {
      setIsRecording(true);
      const video = await cameraRef.current.recordAsync({
        maxDuration: 15,
        quality: Camera.Constants.VideoQuality['720p'],
      });
      
      // Process and upload video
      const processed = await processVideo(video.uri);
      onCapture({
        type: 'video',
        uri: processed.uri,
        duration: processed.duration,
        thumbnail: processed.thumbnail,
      });
    } catch (error) {
      console.error('Recording error:', error);
    }
  };

  const stopRecording = () => {
    if (cameraRef.current && isRecording) {
      cameraRef.current.stopRecording();
      setIsRecording(false);
      clearInterval(recordingTimer.current);
    }
  };

  const takePicture = async () => {
    if (!cameraRef.current) return;
    
    const photo = await cameraRef.current.takePictureAsync({
      quality: 0.8,
      base64: false,
      skipProcessing: false,
    });
    
    // Add filters and effects
    const processed = await processImage(photo.uri);
    onCapture({
      type: 'image',
      uri: processed.uri,
    });
  };

  const animatedCameraStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  return (
    <View style={styles.container}>
      <GestureDetector gesture={Gesture.Simultaneous(pinchGesture, longPressGesture)}>
        <Reanimated.View style={[styles.camera, animatedCameraStyle]}>
          <Camera
            ref={cameraRef}
            style={StyleSheet.absoluteFillObject}
            type={cameraType}
            ratio="16:9"
          />
          
          {/* AR Effects Overlay */}
          <AREffectsOverlay />
          
          {/* Recording indicator */}
          {isRecording && (
            <View style={styles.recordingIndicator}>
              <Animated.View style={[styles.recordingDot, { opacity: pulseAnim }]} />
              <Text style={styles.recordingTime}>
                {formatDuration(recordingDuration)}
              </Text>
            </View>
          )}
        </Reanimated.View>
      </GestureDetector>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={takePicture}
          onLongPress={startRecording}
          onPressOut={stopRecording}
          style={[
            styles.captureButton,
            isRecording && styles.recordingButton,
          ]}
        >
          <View style={styles.captureInner} />
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={() => setCameraType(
            cameraType === CameraType.back
              ? CameraType.front
              : CameraType.back
          )}
          style={styles.flipButton}
        >
          <Text style={styles.flipText}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* Effects tray */}
      <ScrollView
        horizontal
        style={styles.effectsTray}
        showsHorizontalScrollIndicator={false}
      >
        {STORY_EFFECTS.map(effect => (
          <TouchableOpacity
            key={effect.id}
            style={styles.effectButton}
            onPress={() => applyEffect(effect)}
          >
            <Image source={{ uri: effect.thumbnail }} style={styles.effectThumb} />
            <Text style={styles.effectName}>{effect.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

// components/StoryViewer.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableWithoutFeedback,
  Animated,
  PanResponder,
} from 'react-native';
import { Video } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Story {
  id: string;
  type: 'image' | 'video' | 'text';
  mediaUrl?: string;
  textContent?: string;
  duration: number;
  user: {
    id: string;
    username: string;
    avatarUrl: string;
  };
}

export const StoryViewer: React.FC<{
  stories: Story[][];
  initialUserIndex?: number;
  onClose: () => void;
  onStoryView: (storyId: string) => void;
}> = ({ stories, initialUserIndex = 0, onClose, onStoryView }) => {
  const [userIndex, setUserIndex] = useState(initialUserIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const progressAnim = useSharedValue(0);
  const translateX = useSharedValue(0);
  const insets = useSafeAreaInsets();

  const currentUserStories = stories[userIndex];
  const currentStory = currentUserStories?.[storyIndex];

  // Progress bar animation
  useEffect(() => {
    if (!isPaused && currentStory) {
      progressAnim.value = 0;
      progressAnim.value = withTiming(1, {
        duration: currentStory.duration,
      }, (finished) => {
        if (finished) {
          runOnJS(nextStory)();
        }
      });
      
      // Track view
      onStoryView(currentStory.id);
    }
  }, [currentStory, isPaused]);

  const nextStory = () => {
    if (storyIndex < currentUserStories.length - 1) {
      setStoryIndex(storyIndex + 1);
    } else {
      nextUser();
    }
  };

  const previousStory = () => {
    if (storyIndex > 0) {
      setStoryIndex(storyIndex - 1);
    } else {
      previousUser();
    }
  };

  const nextUser = () => {
    if (userIndex < stories.length - 1) {
      setUserIndex(userIndex + 1);
      setStoryIndex(0);
      translateX.value = withTiming(0, { duration: 300 });
    } else {
      onClose();
    }
  };

  const previousUser = () => {
    if (userIndex > 0) {
      setUserIndex(userIndex - 1);
      setStoryIndex(0);
      translateX.value = withTiming(0, { duration: 300 });
    }
  };

  // Swipe gesture handling
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return Math.abs(gestureState.dy) > 5;
    },
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 100) {
        onClose();
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <Reanimated.View style={[styles.storyContainer, animatedStyle]}>
        {/* Story Content */}
        {currentStory?.type === 'image' && (
          <Image
            source={{ uri: currentStory.mediaUrl }}
            style={styles.media}
            resizeMode="cover"
          />
        )}
        
        {currentStory?.type === 'video' && (
          <Video
            source={{ uri: currentStory.mediaUrl }}
            style={styles.media}
            shouldPlay={!isPaused}
            isLooping={false}
            resizeMode="cover"
          />
        )}
        
        {currentStory?.type === 'text' && (
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.textBackground}
          >
            <Text style={styles.storyText}>{currentStory.textContent}</Text>
          </LinearGradient>
        )}

        {/* Tap areas */}
        <View style={styles.tapAreas}>
          <TouchableWithoutFeedback onPress={previousStory}>
            <View style={styles.leftTap} />
          </TouchableWithoutFeedback>
          <TouchableWithoutFeedback onPress={nextStory}>
            <View style={styles.rightTap} />
          </TouchableWithoutFeedback>
        </View>

        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top }]}>
          {/* Progress bars */}
          <View style={styles.progressContainer}>
            {currentUserStories.map((_, index) => (
              <View key={index} style={styles.progressBarContainer}>
                <View style={styles.progressBarBackground} />
                <Reanimated.View
                  style={[
                    styles.progressBar,
                    useAnimatedStyle(() => ({
                      width: index === storyIndex
                        ? `${interpolate(progressAnim.value, [0, 1], [0, 100])}%`
                        : index < storyIndex ? '100%' : '0%',
                    })),
                  ]}
                />
              </View>
            ))}
          </View>

          {/* User info */}
          <View style={styles.userInfo}>
            <Image
              source={{ uri: currentStory?.user.avatarUrl }}
              style={styles.avatar}
            />
            <Text style={styles.username}>{currentStory?.user.username}</Text>
            <Text style={styles.timestamp}>2h ago</Text>
          </View>
        </View>

        {/* Reply input */}
        <View style={[styles.replyContainer, { paddingBottom: insets.bottom }]}>
          <TextInput
            placeholder="Send a message..."
            style={styles.replyInput}
            placeholderTextColor="rgba(255,255,255,0.7)"
          />
          <TouchableOpacity style={styles.reactionButton}>
            <Text style={styles.reaction}>❤️</Text>
          </TouchableOpacity>
        </View>
      </Reanimated.View>
    </View>
  );
};
```

OUTPUT: Complete Stories feature with camera, viewer, and interactions.
```

### Implementation Notes
- 60fps animations with Reanimated 2
- Gesture-based navigation and controls
- Media processing and optimization
- Real-time view tracking
- Privacy controls and custom audiences

---

## 4. Smart Notifications & Engagement System

### The Prompt
```
You are an expert in user engagement and retention, having designed notification systems for Duolingo, Headspace, and LinkedIn. Create a smart notification system that drives meaningful engagement without being intrusive.

CORE REQUIREMENTS:
1. ML-powered send time optimization
2. Personalized content based on user behavior
3. Multi-channel delivery (push, in-app, email)
4. Frequency capping and fatigue prevention
5. A/B testing framework
6. Rich media notifications
7. Deep linking to specific app sections
8. Analytics and performance tracking

NOTIFICATION CATEGORIES:
- Growth Moments: Milestone achievements, progress updates
- Social: Friend activities, mentions, reactions
- Challenges: New challenges, deadline reminders
- Community: Trending content, group activities
- System: Important updates, security alerts

DATABASE SCHEMA:
```sql
-- Notification templates
CREATE TABLE notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE NOT NULL,
  title_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  category VARCHAR(50) NOT NULL,
  priority INTEGER DEFAULT 3,
  rich_media_type VARCHAR(20),
  deep_link_template TEXT,
  channels TEXT[] DEFAULT '{push}',
  cooldown_minutes INTEGER DEFAULT 60,
  max_daily_sends INTEGER DEFAULT 3,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User notification preferences
CREATE TABLE user_notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  push_enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT true,
  in_app_enabled BOOLEAN DEFAULT true,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  timezone VARCHAR(50) DEFAULT 'UTC',
  categories_enabled JSONB DEFAULT '{}',
  optimal_send_times JSONB DEFAULT '{}',
  frequency_cap INTEGER DEFAULT 10,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Notification queue
CREATE TABLE notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES notification_templates(id),
  channel VARCHAR(20) NOT NULL,
  priority INTEGER DEFAULT 3,
  scheduled_for TIMESTAMPTZ NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Engagement tracking
CREATE TABLE notification_engagement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES notification_queue(id),
  user_id UUID REFERENCES users(id),
  action VARCHAR(50) NOT NULL,
  action_timestamp TIMESTAMPTZ DEFAULT NOW(),
  session_id UUID,
  resulted_in_conversion BOOLEAN DEFAULT false,
  time_to_action_seconds INTEGER
);

-- ML features for optimization
CREATE TABLE user_engagement_features (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  avg_open_rate NUMERIC(5,2),
  best_hour_of_day INTEGER,
  best_day_of_week INTEGER,
  preferred_content_types TEXT[],
  session_frequency NUMERIC(10,2),
  churn_risk_score NUMERIC(5,2),
  lifetime_value NUMERIC(10,2),
  last_active TIMESTAMPTZ,
  features_vector VECTOR(128),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

REACT NATIVE IMPLEMENTATION:
```typescript
// services/SmartNotificationService.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import analytics from '@segment/analytics-react-native';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';

interface NotificationPayload {
  title: string;
  body: string;
  data?: any;
  categoryId?: string;
  imageUrl?: string;
  soundName?: string;
  badge?: number;
}

export class SmartNotificationService {
  private static instance: SmartNotificationService;
  private model: tf.LayersModel | null = null;
  private userFeatures: Map<string, number[]> = new Map();
  private sendTimeOptimizer: SendTimeOptimizer;
  private abTestManager: ABTestManager;

  private constructor() {
    this.initializeNotifications();
    this.loadMLModel();
    this.sendTimeOptimizer = new SendTimeOptimizer();
    this.abTestManager = new ABTestManager();
  }

  static getInstance(): SmartNotificationService {
    if (!SmartNotificationService.instance) {
      SmartNotificationService.instance = new SmartNotificationService();
    }
    return SmartNotificationService.instance;
  }

  private async initializeNotifications() {
    // Configure notification handler
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      }),
    });

    // Request permissions
    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Push notification permissions denied');
        return;
      }

      // Get push token
      const token = await this.registerForPushNotifications();
      await this.savePushToken(token);
    }

    // Handle notification responses
    Notifications.addNotificationResponseReceivedListener(this.handleNotificationResponse);
    
    // Handle foreground notifications
    Notifications.addNotificationReceivedListener(this.handleForegroundNotification);
  }

  private async registerForPushNotifications() {
    let token;
    
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    token = (await Notifications.getExpoPushTokenAsync()).data;
    return token;
  }

  // ML-powered send time optimization
  private async loadMLModel() {
    try {
      await tf.ready();
      this.model = await tf.loadLayersModel('/models/engagement_predictor/model.json');
    } catch (error) {
      console.error('Failed to load ML model:', error);
    }
  }

  async getOptimalSendTime(userId: string, notificationType: string): Promise<Date> {
    // Get user features
    const features = await this.getUserFeatures(userId);
    
    if (this.model && features) {
      // Predict engagement probability for different time slots
      const predictions = await this.predictEngagement(features, notificationType);
      const optimalHour = this.findOptimalTimeSlot(predictions);
      
      return this.calculateNextSendTime(optimalHour);
    }
    
    // Fallback to heuristic-based optimization
    return this.sendTimeOptimizer.getOptimalTime(userId);
  }

  private async predictEngagement(
    features: number[], 
    notificationType: string
  ): Promise<number[]> {
    const typeFeatures = this.encodeNotificationType(notificationType);
    const hourPredictions: number[] = [];
    
    for (let hour = 0; hour < 24; hour++) {
      const input = tf.tensor2d([
        [...features, ...typeFeatures, hour]
      ]);
      
      const prediction = this.model!.predict(input) as tf.Tensor;
      const probability = await prediction.data();
      hourPredictions.push(probability[0]);
      
      input.dispose();
      prediction.dispose();
    }
    
    return hourPredictions;
  }

  // Smart notification scheduling
  async scheduleSmartNotification(
    userId: string,
    template: string,
    params: Record<string, any>,
    options: {
      priority?: 'low' | 'medium' | 'high' | 'critical';
      experiment?: string;
      category?: string;
    } = {}
  ): Promise<string> {
    // Check user preferences and fatigue
    const canSend = await this.checkSendEligibility(userId, options.category);
    if (!canSend) {
      console.log('Notification suppressed due to fatigue prevention');
      return '';
    }

    // Get optimal send time
    const sendTime = await this.getOptimalSendTime(userId, template);
    
    // Prepare notification content
    const content = await this.prepareContent(template, params, userId);
    
    // A/B test variant selection
    if (options.experiment) {
      const variant = await this.abTestManager.getVariant(
        userId,
        options.experiment
      );
      content.title = variant.title || content.title;
      content.body = variant.body || content.body;
    }

    // Schedule notification
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: content.title,
        body: content.body,
        data: content.data,
        sound: true,
        priority: options.priority || 'medium',
        categoryIdentifier: options.category,
      },
      trigger: sendTime,
    });

    // Track scheduling
    await this.trackNotificationScheduled(userId, notificationId, template, sendTime);
    
    return notificationId;
  }

  // Fatigue prevention
  private async checkSendEligibility(
    userId: string, 
    category?: string
  ): Promise<boolean> {
    const key = `notification_count_${userId}_${new Date().toDateString()}`;
    const dailyCount = parseInt(await AsyncStorage.getItem(key) || '0');
    
    // Get user's frequency cap
    const userPrefs = await this.getUserPreferences(userId);
    const maxDaily = userPrefs?.frequencyCap || 10;
    
    if (dailyCount >= maxDaily) {
      return false;
    }

    // Check category-specific cooldown
    if (category) {
      const lastSent = await this.getLastSentTime(userId, category);
      const cooldown = this.getCategoryCooldown(category);
      
      if (lastSent && Date.now() - lastSent.getTime() < cooldown) {
        return false;
      }
    }

    // Check quiet hours
    if (userPrefs?.quietHoursStart && userPrefs?.quietHoursEnd) {
      const now = new Date();
      const currentHour = now.getHours();
      
      if (this.isInQuietHours(
        currentHour, 
        userPrefs.quietHoursStart, 
        userPrefs.quietHoursEnd
      )) {
        return false;
      }
    }

    return true;
  }

  // Rich notification content
  private async prepareContent(
    template: string,
    params: Record<string, any>,
    userId: string
  ): Promise<NotificationPayload> {
    // Get template from database
    const { data: templateData } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('key', template)
      .single();

    if (!templateData) {
      throw new Error(`Template ${template} not found`);
    }

    // Personalize content
    const userProfile = await this.getUserProfile(userId);
    const personalizedParams = {
      ...params,
      userName: userProfile.name,
      userLevel: userProfile.level,
    };

    // Process template
    const title = this.processTemplate(templateData.title_template, personalizedParams);
    const body = this.processTemplate(templateData.body_template, personalizedParams);
    
    // Add rich media if applicable
    const payload: NotificationPayload = {
      title,
      body,
      data: {
        deepLink: this.processTemplate(
          templateData.deep_link_template, 
          personalizedParams
        ),
        ...params,
      },
    };

    // Add image for rich notifications
    if (templateData.rich_media_type === 'image' && params.imageUrl) {
      payload.imageUrl = params.imageUrl;
    }

    return payload;
  }

  // Analytics tracking
  private handleNotificationResponse = async (response: Notifications.NotificationResponse) => {
    const { notification, actionIdentifier } = response;
    const data = notification.request.content.data;

    // Track engagement
    analytics.track('Notification Opened', {
      notification_id: notification.request.identifier,
      action: actionIdentifier,
      category: data.category,
      deep_link: data.deepLink,
      time_to_action: Date.now() - new Date(notification.date).getTime(),
    });

    // Update ML features
    await this.updateUserEngagementFeatures(
      data.userId,
      'opened',
      notification.request.identifier
    );

    // Handle deep linking
    if (data.deepLink) {
      this.navigateToDeepLink(data.deepLink);
    }
  };

  // A/B Testing
  async runNotificationExperiment(
    experimentId: string,
    variants: Array<{
      id: string;
      title: string;
      body: string;
      weight: number;
    }>,
    targetAudience: string[],
    metrics: string[]
  ) {
    for (const userId of targetAudience) {
      // Randomly assign variant based on weights
      const variant = this.selectWeightedVariant(variants);
      
      // Schedule notification with variant
      await this.scheduleSmartNotification(
        userId,
        'experiment_template',
        {
          experimentId,
          variantId: variant.id,
        },
        {
          experiment: experimentId,
        }
      );

      // Track assignment
      analytics.track('Experiment Assignment', {
        experiment_id: experimentId,
        variant_id: variant.id,
        user_id: userId,
      });
    }

    // Monitor metrics
    this.monitorExperimentMetrics(experimentId, metrics);
  }

  // Performance monitoring
  async getNotificationMetrics(
    startDate: Date,
    endDate: Date
  ): Promise<NotificationMetrics> {
    const { data } = await supabase.rpc('get_notification_metrics', {
      p_start_date: startDate,
      p_end_date: endDate,
    });

    return {
      totalSent: data.total_sent,
      deliveryRate: data.delivery_rate,
      openRate: data.open_rate,
      conversionRate: data.conversion_rate,
      averageTimeToAction: data.avg_time_to_action,
      topPerformingTemplates: data.top_templates,
      engagementByHour: data.engagement_by_hour,
      categoryBreakdown: data.category_breakdown,
    };
  }
}

// SendTimeOptimizer.ts
class SendTimeOptimizer {
  private userPatterns: Map<string, UserPattern> = new Map();

  async getOptimalTime(userId: string): Promise<Date> {
    // Get historical engagement data
    const pattern = await this.analyzeUserPattern(userId);
    
    if (pattern) {
      // Find next optimal slot
      const nextSlot = this.findNextOptimalSlot(pattern);
      return nextSlot;
    }
    
    // Default to popular engagement times
    return this.getDefaultOptimalTime();
  }

  private async analyzeUserPattern(userId: string): Promise<UserPattern | null> {
    const { data } = await supabase
      .from('notification_engagement')
      .select('action_timestamp')
      .eq('user_id', userId)
      .eq('action', 'opened')
      .order('action_timestamp', { ascending: false })
      .limit(100);

    if (!data || data.length < 10) {
      return null;
    }

    // Analyze engagement patterns
    const hourCounts = new Array(24).fill(0);
    const dayOfWeekCounts = new Array(7).fill(0);
    
    data.forEach(record => {
      const date = new Date(record.action_timestamp);
      hourCounts[date.getHours()]++;
      dayOfWeekCounts[date.getDay()]++;
    });

    // Find peak hours and days
    const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
    const peakDay = dayOfWeekCounts.indexOf(Math.max(...dayOfWeekCounts));

    return {
      peakHours: [peakHour - 1, peakHour, peakHour + 1].filter(h => h >= 0 && h < 24),
      peakDays: [peakDay],
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }

  private findNextOptimalSlot(pattern: UserPattern): Date {
    const now = new Date();
    const candidates: Date[] = [];

    // Generate candidate times for next 7 days
    for (let day = 0; day < 7; day++) {
      const date = new Date(now);
      date.setDate(date.getDate() + day);
      
      pattern.peakHours.forEach(hour => {
        const candidate = new Date(date);
        candidate.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
        
        if (candidate > now) {
          candidates.push(candidate);
        }
      });
    }

    // Return earliest optimal time
    return candidates.sort((a, b) => a.getTime() - b.getTime())[0] || 
           this.getDefaultOptimalTime();
  }

  private getDefaultOptimalTime(): Date {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0); // Default to 10 AM
    return tomorrow;
  }
}
```

OUTPUT: Complete smart notification system with ML optimization and A/B testing.
```

### Implementation Notes
- ML-based send time optimization using TensorFlow.js
- Fatigue prevention with frequency capping
- A/B testing framework for content optimization
- Rich media support with deep linking
- Comprehensive analytics and monitoring