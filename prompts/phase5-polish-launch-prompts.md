# Phase 5: Polish & Launch - Optimized Prompts

## 1. Onboarding Flow System

### The Prompt
```
You are a senior UX engineer who has designed onboarding flows for TikTok, Spotify, and Notion. Create a personalized, progressive onboarding system for GLOUP that maximizes activation and retention.

CORE REQUIREMENTS:
1. Personalized onboarding paths based on user goals
2. Progressive disclosure of features
3. Interactive tutorials with real actions
4. Social proof and value demonstration
5. Quick wins and immediate value delivery
6. Accessibility and internationalization
7. Analytics funnel tracking

ONBOARDING STAGES:
1. Welcome & Goal Setting (30 seconds)
2. Profile Creation (45 seconds)
3. Interest Selection (30 seconds)
4. First Connection (1 minute)
5. Core Feature Tutorial (2 minutes)
6. First Achievement (30 seconds)

DATABASE SCHEMA:
```sql
-- Onboarding flows configuration
CREATE TABLE onboarding_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  user_segment VARCHAR(50),
  steps JSONB NOT NULL,
  success_criteria JSONB,
  is_default BOOLEAN DEFAULT false,
  ab_test_variant VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User onboarding progress
CREATE TABLE user_onboarding (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  flow_id UUID REFERENCES onboarding_flows(id),
  current_step INTEGER DEFAULT 0,
  completed_steps JSONB DEFAULT '[]',
  skipped_steps JSONB DEFAULT '[]',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  onboarding_score NUMERIC(5,2),
  drop_off_point VARCHAR(100),
  time_spent_seconds INTEGER DEFAULT 0,
  interaction_count INTEGER DEFAULT 0
);

-- Onboarding metrics
CREATE TABLE onboarding_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  step_name VARCHAR(100) NOT NULL,
  action VARCHAR(100) NOT NULL,
  duration_seconds INTEGER,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  device_info JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- A/B test results
CREATE TABLE onboarding_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_name VARCHAR(100) NOT NULL,
  variant_a_config JSONB NOT NULL,
  variant_b_config JSONB NOT NULL,
  start_date TIMESTAMPTZ DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  variant_a_conversions INTEGER DEFAULT 0,
  variant_b_conversions INTEGER DEFAULT 0,
  variant_a_participants INTEGER DEFAULT 0,
  variant_b_participants INTEGER DEFAULT 0,
  winning_variant VARCHAR(1),
  confidence_level NUMERIC(5,2)
);

-- Activation metrics
CREATE OR REPLACE VIEW user_activation_funnel AS
SELECT 
  DATE(u.created_at) as signup_date,
  COUNT(DISTINCT u.id) as total_signups,
  COUNT(DISTINCT CASE WHEN uo.current_step >= 3 THEN u.id END) as profile_completed,
  COUNT(DISTINCT CASE WHEN uo.current_step >= 5 THEN u.id END) as interests_selected,
  COUNT(DISTINCT CASE WHEN uo.completed_at IS NOT NULL THEN u.id END) as onboarding_completed,
  COUNT(DISTINCT CASE WHEN ua.first_post_at IS NOT NULL THEN u.id END) as activated_users,
  AVG(uo.time_spent_seconds) as avg_onboarding_time,
  AVG(uo.onboarding_score) as avg_completion_score
FROM users u
LEFT JOIN user_onboarding uo ON u.id = uo.user_id
LEFT JOIN user_activity ua ON u.id = ua.user_id
GROUP BY DATE(u.created_at);
```

REACT NATIVE IMPLEMENTATION:
```typescript
// screens/OnboardingFlow.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  AccessibilityInfo,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  runOnJS,
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import analytics from '@segment/analytics-react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface OnboardingStep {
  id: string;
  type: 'welcome' | 'input' | 'selection' | 'tutorial' | 'success';
  title: string;
  subtitle?: string;
  animation?: any;
  inputs?: InputConfig[];
  options?: SelectionOption[];
  action?: () => Promise<void>;
  skipable?: boolean;
  validation?: (data: any) => boolean | string;
}

interface OnboardingMetrics {
  stepStartTime: number;
  totalInteractions: number;
  errorCount: number;
  helpRequests: number;
}

export const OnboardingFlow: React.FC<{
  onComplete: (userData: any) => void;
}> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [userData, setUserData] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const progress = useSharedValue(0);
  const metrics = useRef<OnboardingMetrics>({
    stepStartTime: Date.now(),
    totalInteractions: 0,
    errorCount: 0,
    helpRequests: 0,
  });

  // Personalized onboarding flow based on user type
  const [onboardingSteps, setOnboardingSteps] = useState<OnboardingStep[]>([]);

  useEffect(() => {
    loadPersonalizedFlow();
    trackOnboardingStart();
    setupAccessibility();
  }, []);

  const loadPersonalizedFlow = async () => {
    // Determine user segment based on referral, device, or other factors
    const userSegment = await determineUserSegment();
    
    const steps = getOnboardingSteps(userSegment);
    setOnboardingSteps(steps);

    // A/B test variant assignment
    const variant = Math.random() > 0.5 ? 'A' : 'B';
    analytics.track('Onboarding Variant Assigned', {
      variant,
      segment: userSegment,
    });
  };

  const getOnboardingSteps = (segment: string): OnboardingStep[] => {
    const baseSteps: OnboardingStep[] = [
      {
        id: 'welcome',
        type: 'welcome',
        title: 'Welcome to GLOUP',
        subtitle: 'Your journey to personal growth starts here',
        animation: require('@/assets/animations/welcome.json'),
      },
      {
        id: 'goals',
        type: 'selection',
        title: 'What brings you here?',
        subtitle: 'Select your primary goal',
        options: [
          { id: 'growth', label: 'Personal Growth', icon: '🌱', color: '#10B981' },
          { id: 'connect', label: 'Connect with Others', icon: '🤝', color: '#6366F1' },
          { id: 'learn', label: 'Learn New Skills', icon: '📚', color: '#F59E0B' },
          { id: 'wellness', label: 'Mental Wellness', icon: '🧘', color: '#8B5CF6' },
        ],
        validation: (data) => data.goal ? true : 'Please select a goal',
      },
      {
        id: 'profile',
        type: 'input',
        title: 'Let\'s get to know you',
        subtitle: 'Create your profile',
        inputs: [
          {
            key: 'username',
            placeholder: 'Choose a username',
            type: 'text',
            validation: (value) => {
              if (!value || value.length < 3) return 'Username must be at least 3 characters';
              if (!/^[a-zA-Z0-9_]+$/.test(value)) return 'Username can only contain letters, numbers, and underscores';
              return true;
            },
            autoFocus: true,
          },
          {
            key: 'displayName',
            placeholder: 'Your display name',
            type: 'text',
            validation: (value) => value && value.length >= 2 ? true : 'Please enter your name',
          },
        ],
      },
      {
        id: 'interests',
        type: 'selection',
        title: 'What interests you?',
        subtitle: 'Select at least 3 topics',
        options: generateInterestOptions(),
        validation: (data) => {
          const selected = data.interests?.length || 0;
          return selected >= 3 ? true : `Select at least ${3 - selected} more`;
        },
        skipable: true,
      },
      {
        id: 'tutorial',
        type: 'tutorial',
        title: 'Quick Tour',
        subtitle: 'Learn the basics in 60 seconds',
        animation: require('@/assets/animations/tutorial.json'),
        skipable: true,
      },
      {
        id: 'firstConnection',
        type: 'selection',
        title: 'Find your first connection',
        subtitle: 'Connect with someone who shares your interests',
        options: [], // Dynamically loaded based on interests
        action: async () => {
          await loadSuggestedConnections(userData.interests);
        },
        skipable: true,
      },
      {
        id: 'success',
        type: 'success',
        title: 'You\'re all set!',
        subtitle: 'Welcome to the GLOUP community',
        animation: require('@/assets/animations/confetti.json'),
        action: async () => {
          await completeOnboarding();
        },
      },
    ];

    // Customize flow based on segment
    if (segment === 'creator') {
      baseSteps.splice(4, 0, {
        id: 'creatorTools',
        type: 'tutorial',
        title: 'Creator Tools',
        subtitle: 'Unlock powerful features for content creation',
        animation: require('@/assets/animations/creator.json'),
      });
    }

    return baseSteps;
  };

  const nextStep = async () => {
    const step = onboardingSteps[currentStep];
    
    // Validate current step
    if (step.validation) {
      const validationResult = step.validation(userData);
      if (validationResult !== true) {
        setError(validationResult as string);
        metrics.current.errorCount++;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
    }

    // Track step completion
    trackStepCompletion(step.id);

    // Execute step action if any
    if (step.action) {
      setIsLoading(true);
      try {
        await step.action();
      } catch (error) {
        console.error('Step action failed:', error);
      } finally {
        setIsLoading(false);
      }
    }

    // Haptic feedback
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Move to next step
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
      progress.value = withSpring((currentStep + 1) / onboardingSteps.length);
      metrics.current.stepStartTime = Date.now();
      setError(null);
    } else {
      completeOnboarding();
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      progress.value = withSpring((currentStep - 1) / onboardingSteps.length);
      setError(null);
    }
  };

  const skipStep = () => {
    const step = onboardingSteps[currentStep];
    if (step.skipable) {
      trackStepSkipped(step.id);
      nextStep();
    }
  };

  const completeOnboarding = async () => {
    // Save onboarding completion
    await AsyncStorage.setItem('onboarding_completed', 'true');
    await AsyncStorage.setItem('user_data', JSON.stringify(userData));

    // Track completion
    analytics.track('Onboarding Completed', {
      total_time: Date.now() - metrics.current.stepStartTime,
      interactions: metrics.current.totalInteractions,
      errors: metrics.current.errorCount,
      skipped_steps: onboardingSteps.filter(s => s.skipable && !userData[s.id]).map(s => s.id),
      user_data: userData,
    });

    // Update backend
    await supabase.from('user_onboarding').update({
      completed_at: new Date(),
      onboarding_score: calculateOnboardingScore(),
    }).eq('user_id', userData.userId);

    // Trigger completion
    onComplete(userData);
  };

  const trackStepCompletion = (stepId: string) => {
    const duration = Date.now() - metrics.current.stepStartTime;
    
    analytics.track('Onboarding Step Completed', {
      step_id: stepId,
      step_index: currentStep,
      duration_seconds: duration / 1000,
      interactions: metrics.current.totalInteractions,
      errors: metrics.current.errorCount,
    });

    // Reset metrics for next step
    metrics.current.stepStartTime = Date.now();
    metrics.current.totalInteractions = 0;
    metrics.current.errorCount = 0;
  };

  const renderStep = () => {
    const step = onboardingSteps[currentStep];
    if (!step) return null;

    switch (step.type) {
      case 'welcome':
        return <WelcomeStep step={step} onNext={nextStep} />;
      case 'input':
        return (
          <InputStep
            step={step}
            userData={userData}
            onUpdate={(data) => setUserData({ ...userData, ...data })}
            onNext={nextStep}
            error={error}
          />
        );
      case 'selection':
        return (
          <SelectionStep
            step={step}
            userData={userData}
            onUpdate={(data) => setUserData({ ...userData, ...data })}
            onNext={nextStep}
            error={error}
          />
        );
      case 'tutorial':
        return <TutorialStep step={step} onNext={nextStep} onSkip={skipStep} />;
      case 'success':
        return <SuccessStep step={step} userData={userData} onComplete={nextStep} />;
      default:
        return null;
    }
  };

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <Animated.View style={[styles.progressFill, progressStyle]} />
          </View>
          {currentStep > 0 && (
            <TouchableOpacity onPress={previousStep} style={styles.backButton}>
              <Text style={styles.backText}>←</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Step Content */}
        <Animated.View
          entering={SlideInRight}
          exiting={SlideOutLeft}
          style={styles.stepContainer}
        >
          {renderStep()}
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// Individual Step Components
const WelcomeStep: React.FC<{
  step: OnboardingStep;
  onNext: () => void;
}> = ({ step, onNext }) => {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 15 });
    opacity.value = withTiming(1, { duration: 800 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={styles.welcomeContainer}>
      <Animated.View style={[styles.animationContainer, animatedStyle]}>
        <LottieView
          source={step.animation}
          autoPlay
          loop={false}
          style={styles.animation}
          onAnimationFinish={onNext}
        />
      </Animated.View>
      <Animated.View entering={FadeIn.delay(500)}>
        <Text style={styles.title}>{step.title}</Text>
        <Text style={styles.subtitle}>{step.subtitle}</Text>
      </Animated.View>
      <Animated.View entering={FadeIn.delay(1000)}>
        <TouchableOpacity onPress={onNext} style={styles.primaryButton}>
          <LinearGradient
            colors={['#6366F1', '#8B5CF6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientButton}
          >
            <Text style={styles.buttonText}>Get Started</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const InputStep: React.FC<{
  step: OnboardingStep;
  userData: any;
  onUpdate: (data: any) => void;
  onNext: () => void;
  error: string | null;
}> = ({ step, userData, onUpdate, onNext, error }) => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const inputRefs = useRef<Record<string, any>>({});

  const handleInputChange = (key: string, value: string) => {
    setValues({ ...values, [key]: value });
    
    // Real-time validation
    const input = step.inputs?.find(i => i.key === key);
    if (input?.validation) {
      const result = input.validation(value);
      if (result !== true) {
        setLocalErrors({ ...localErrors, [key]: result as string });
      } else {
        const newErrors = { ...localErrors };
        delete newErrors[key];
        setLocalErrors(newErrors);
      }
    }
  };

  const handleSubmit = () => {
    // Validate all inputs
    let hasErrors = false;
    const newErrors: Record<string, string> = {};

    step.inputs?.forEach(input => {
      const value = values[input.key];
      if (input.validation) {
        const result = input.validation(value);
        if (result !== true) {
          newErrors[input.key] = result as string;
          hasErrors = true;
        }
      }
    });

    if (hasErrors) {
      setLocalErrors(newErrors);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      onUpdate(values);
      onNext();
    }
  };

  return (
    <View style={styles.inputContainer}>
      <Text style={styles.title}>{step.title}</Text>
      {step.subtitle && <Text style={styles.subtitle}>{step.subtitle}</Text>}
      
      {step.inputs?.map((input, index) => (
        <Animated.View
          key={input.key}
          entering={FadeIn.delay(index * 100)}
          style={styles.inputWrapper}
        >
          <TextInput
            ref={ref => inputRefs.current[input.key] = ref}
            style={[
              styles.input,
              localErrors[input.key] && styles.inputError,
            ]}
            placeholder={input.placeholder}
            placeholderTextColor="#9CA3AF"
            value={values[input.key] || ''}
            onChangeText={(value) => handleInputChange(input.key, value)}
            autoFocus={input.autoFocus}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType={index === step.inputs!.length - 1 ? 'done' : 'next'}
            onSubmitEditing={() => {
              if (index < step.inputs!.length - 1) {
                inputRefs.current[step.inputs![index + 1].key]?.focus();
              } else {
                handleSubmit();
              }
            }}
          />
          {localErrors[input.key] && (
            <Text style={styles.errorText}>{localErrors[input.key]}</Text>
          )}
        </Animated.View>
      ))}

      {error && <Text style={styles.errorText}>{error}</Text>}

      <TouchableOpacity onPress={handleSubmit} style={styles.primaryButton}>
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardAvoid: {
    flex: 1,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366F1',
  },
  backButton: {
    marginLeft: 16,
    padding: 8,
  },
  backText: {
    fontSize: 24,
    color: '#6B7280',
  },
  stepContainer: {
    flex: 1,
    padding: 20,
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  animationContainer: {
    width: 200,
    height: 200,
    marginBottom: 40,
  },
  animation: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  primaryButton: {
    marginTop: 20,
  },
  gradientButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  inputContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  inputWrapper: {
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    marginTop: 4,
    marginLeft: 4,
  },
});
```

OUTPUT: Complete onboarding system with personalization and analytics.
```

### Implementation Notes
- Personalized flows based on user segments
- Progressive disclosure with skip options
- Real-time validation and error handling
- Comprehensive analytics tracking
- A/B testing framework built-in
- Accessibility support

---

## 2. Performance Optimization System

### The Prompt
```
You are a performance engineer who has optimized apps at Meta, Google, and Netflix. Implement comprehensive performance optimization for GLOUP to achieve 60fps scrolling, <1s startup time, and minimal battery drain.

CORE REQUIREMENTS:
1. Bundle size optimization (<5MB initial download)
2. Memory management and leak prevention
3. Image and video optimization with lazy loading
4. Database query optimization
5. Network request batching and caching
6. Background task optimization
7. Battery usage monitoring

PERFORMANCE TARGETS:
- App startup: <1000ms
- Screen transitions: <300ms
- List scrolling: 60fps
- Image loading: <500ms
- API response: <200ms p95
- Memory usage: <150MB average
- Battery drain: <2% per hour active use

OPTIMIZATION IMPLEMENTATION:
```typescript
// performance/PerformanceMonitor.ts
import { NativeModules, Platform, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { InteractionManager } from 'react-native';
import * as FileSystem from 'expo-file-system';
import NetInfo from '@react-native-community/netinfo';
import analytics from '@segment/analytics-react-native';

interface PerformanceMetrics {
  fps: number;
  jsMemory: number;
  nativeMemory: number;
  cpuUsage: number;
  batteryLevel: number;
  networkLatency: number;
  cacheHitRate: number;
  errorRate: number;
}

interface ScreenMetrics {
  screenName: string;
  renderTime: number;
  interactionTime: number;
  apiCalls: number;
  memoryDelta: number;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics;
  private screenMetrics: Map<string, ScreenMetrics> = new Map();
  private frameDropThreshold = 55; // fps
  private memoryWarningThreshold = 200; // MB
  private isMonitoring = false;
  private performanceObserver: any;

  private constructor() {
    this.metrics = this.initializeMetrics();
    this.startMonitoring();
    this.setupCrashReporting();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  private initializeMetrics(): PerformanceMetrics {
    return {
      fps: 60,
      jsMemory: 0,
      nativeMemory: 0,
      cpuUsage: 0,
      batteryLevel: 100,
      networkLatency: 0,
      cacheHitRate: 0,
      errorRate: 0,
    };
  }

  private startMonitoring() {
    if (this.isMonitoring) return;
    this.isMonitoring = true;

    // FPS Monitoring
    this.monitorFPS();

    // Memory Monitoring
    this.monitorMemory();

    // Network Monitoring
    this.monitorNetwork();

    // Battery Monitoring
    this.monitorBattery();

    // App State Monitoring
    AppState.addEventListener('change', this.handleAppStateChange);
  }

  private monitorFPS() {
    let frameCount = 0;
    let lastTime = performance.now();

    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime >= lastTime + 1000) {
        this.metrics.fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        
        // Alert on frame drops
        if (this.metrics.fps < this.frameDropThreshold) {
          this.handlePerformanceIssue('frame_drop', {
            fps: this.metrics.fps,
            screen: this.getCurrentScreen(),
          });
        }
        
        frameCount = 0;
        lastTime = currentTime;
      }
      
      if (this.isMonitoring) {
        requestAnimationFrame(measureFPS);
      }
    };

    requestAnimationFrame(measureFPS);
  }

  private monitorMemory() {
    setInterval(() => {
      if (!this.isMonitoring) return;

      // Get JS memory usage
      if (performance.memory) {
        this.metrics.jsMemory = Math.round(performance.memory.usedJSHeapSize / 1048576);
      }

      // Get native memory usage (platform specific)
      if (Platform.OS === 'ios') {
        NativeModules.MemoryMonitor?.getMemoryUsage((memory: number) => {
          this.metrics.nativeMemory = Math.round(memory / 1048576);
        });
      } else if (Platform.OS === 'android') {
        NativeModules.MemoryMonitor?.getMemoryInfo((info: any) => {
          this.metrics.nativeMemory = Math.round(info.totalMem / 1048576);
        });
      }

      // Check for memory leaks
      const totalMemory = this.metrics.jsMemory + this.metrics.nativeMemory;
      if (totalMemory > this.memoryWarningThreshold) {
        this.handlePerformanceIssue('high_memory', {
          jsMemory: this.metrics.jsMemory,
          nativeMemory: this.metrics.nativeMemory,
          total: totalMemory,
        });
      }
    }, 5000);
  }

  private monitorNetwork() {
    // Network latency monitoring
    const measureLatency = async () => {
      const start = performance.now();
      try {
        await fetch(`${API_BASE_URL}/health`, {
          method: 'HEAD',
          cache: 'no-cache',
        });
        this.metrics.networkLatency = performance.now() - start;
      } catch (error) {
        this.metrics.networkLatency = -1;
      }
    };

    setInterval(measureLatency, 30000);

    // Network state monitoring
    NetInfo.addEventListener(state => {
      if (!state.isConnected) {
        this.handleNetworkIssue('disconnected');
      } else if (state.type === 'cellular' && state.details?.cellularGeneration === '2g') {
        this.handleNetworkIssue('slow_network', { type: '2g' });
      }
    });
  }

  private monitorBattery() {
    if (Platform.OS === 'ios') {
      NativeModules.BatteryMonitor?.startMonitoring((level: number, state: string) => {
        this.metrics.batteryLevel = level * 100;
        
        if (level < 0.2 && state !== 'charging') {
          this.optimizeForLowBattery();
        }
      });
    } else if (Platform.OS === 'android') {
      NativeModules.BatteryManager?.getBatteryLevel((level: number) => {
        this.metrics.batteryLevel = level;
      });
    }
  }

  // Screen performance tracking
  trackScreenPerformance(screenName: string) {
    const startTime = performance.now();
    const startMemory = this.metrics.jsMemory;

    return {
      end: () => {
        const renderTime = performance.now() - startTime;
        const memoryDelta = this.metrics.jsMemory - startMemory;

        const metrics: ScreenMetrics = {
          screenName,
          renderTime,
          interactionTime: 0,
          apiCalls: 0,
          memoryDelta,
        };

        this.screenMetrics.set(screenName, metrics);

        // Track slow screens
        if (renderTime > 300) {
          this.handlePerformanceIssue('slow_screen', {
            screen: screenName,
            renderTime,
          });
        }

        // Send to analytics
        analytics.track('Screen Performance', {
          screen: screenName,
          render_time: renderTime,
          memory_delta: memoryDelta,
          fps: this.metrics.fps,
        });
      },
    };
  }

  // API performance tracking
  trackAPICall(endpoint: string, method: string) {
    const startTime = performance.now();

    return {
      success: () => {
        const duration = performance.now() - startTime;
        this.trackAPIMetric(endpoint, method, duration, true);
      },
      failure: (error: any) => {
        const duration = performance.now() - startTime;
        this.trackAPIMetric(endpoint, method, duration, false);
        this.metrics.errorRate++;
      },
    };
  }

  private trackAPIMetric(
    endpoint: string, 
    method: string, 
    duration: number, 
    success: boolean
  ) {
    // Store in local metrics
    const key = `api_${method}_${endpoint}`;
    AsyncStorage.setItem(key, JSON.stringify({
      duration,
      success,
      timestamp: Date.now(),
    }));

    // Alert on slow APIs
    if (duration > 2000) {
      this.handlePerformanceIssue('slow_api', {
        endpoint,
        method,
        duration,
      });
    }

    // Update cache hit rate
    this.updateCacheMetrics();
  }

  // Performance optimization strategies
  private optimizeForLowBattery() {
    // Reduce animation frame rate
    NativeModules.AnimationConfig?.setFrameRate(30);

    // Disable background refresh
    NativeModules.BackgroundFetch?.stop();

    // Reduce image quality
    ImageCache.setQuality('low');

    // Batch network requests
    NetworkQueue.enableBatching(true);

    analytics.track('Low Battery Optimization Activated');
  }

  private handlePerformanceIssue(type: string, details: any) {
    console.warn(`Performance issue detected: ${type}`, details);

    // Send to monitoring service
    analytics.track('Performance Issue', {
      type,
      ...details,
      device: {
        platform: Platform.OS,
        version: Platform.Version,
      },
    });

    // Auto-remediation
    switch (type) {
      case 'frame_drop':
        this.optimizeRendering();
        break;
      case 'high_memory':
        this.performMemoryCleanup();
        break;
      case 'slow_api':
        this.optimizeNetworkRequests();
        break;
    }
  }

  private optimizeRendering() {
    // Defer non-critical updates
    InteractionManager.runAfterInteractions(() => {
      // Reduce complexity of animations
      NativeModules.AnimationConfig?.setComplexityLevel('simple');
    });

    // Clear image cache if needed
    if (this.metrics.jsMemory > 100) {
      ImageCache.clear();
    }
  }

  private performMemoryCleanup() {
    // Clear caches
    AsyncStorage.getAllKeys().then(keys => {
      const cacheKeys = keys.filter(k => k.startsWith('cache_'));
      AsyncStorage.multiRemove(cacheKeys);
    });

    // Clear expired files
    FileSystem.readDirectoryAsync(FileSystem.cacheDirectory!).then(files => {
      files.forEach(file => {
        FileSystem.getInfoAsync(`${FileSystem.cacheDirectory}${file}`).then(info => {
          if (info.exists && Date.now() - info.modificationTime > 86400000) {
            FileSystem.deleteAsync(`${FileSystem.cacheDirectory}${file}`);
          }
        });
      });
    });

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }

  // Bundle optimization
  async analyzeBundleSize() {
    const bundleStats = {
      totalSize: 0,
      jsSize: 0,
      assetsSize: 0,
      unusedExports: [],
      largeDependencies: [],
    };

    // Analyze JS bundle
    if (__DEV__) {
      const modules = require.cache;
      Object.keys(modules).forEach(modulePath => {
        const module = modules[modulePath];
        // Calculate approximate size
        const size = JSON.stringify(module.exports).length;
        bundleStats.totalSize += size;

        if (size > 50000) {
          bundleStats.largeDependencies.push({
            path: modulePath,
            size: Math.round(size / 1024) + 'KB',
          });
        }
      });
    }

    return bundleStats;
  }

  // Export performance report
  async generatePerformanceReport(): Promise<any> {
    const screens = Array.from(this.screenMetrics.entries()).map(([name, metrics]) => ({
      name,
      ...metrics,
    }));

    const report = {
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      screens: screens.sort((a, b) => b.renderTime - a.renderTime).slice(0, 10),
      recommendations: this.generateRecommendations(),
    };

    return report;
  }

  private generateRecommendations(): string[] {
    const recommendations = [];

    if (this.metrics.fps < 55) {
      recommendations.push('Optimize animations and reduce re-renders');
    }

    if (this.metrics.jsMemory > 100) {
      recommendations.push('Implement better memory management and cleanup');
    }

    if (this.metrics.networkLatency > 500) {
      recommendations.push('Implement request caching and CDN');
    }

    if (this.metrics.errorRate > 0.01) {
      recommendations.push('Improve error handling and recovery');
    }

    return recommendations;
  }
}

// Image optimization service
export class ImageOptimizationService {
  private static cache = new Map<string, any>();
  private static queue: Array<() => Promise<void>> = [];
  private static isProcessing = false;

  static async optimizeImage(
    uri: string, 
    options: {
      width?: number;
      height?: number;
      quality?: number;
      format?: 'jpeg' | 'png' | 'webp';
      cache?: boolean;
    } = {}
  ): Promise<string> {
    const cacheKey = `${uri}_${JSON.stringify(options)}`;
    
    // Check cache
    if (options.cache && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Add to processing queue
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const optimized = await this.processImage(uri, options);
          
          if (options.cache) {
            this.cache.set(cacheKey, optimized);
            
            // Implement LRU cache
            if (this.cache.size > 100) {
              const firstKey = this.cache.keys().next().value;
              this.cache.delete(firstKey);
            }
          }
          
          resolve(optimized);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  private static async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    
    this.isProcessing = true;
    
    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) {
        await task();
      }
    }
    
    this.isProcessing = false;
  }

  private static async processImage(uri: string, options: any): Promise<string> {
    // Implementation would use native modules for actual image processing
    // This is a placeholder for the optimization logic
    
    // Simulate processing
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(`${uri}?optimized=true&w=${options.width}&q=${options.quality || 80}`);
      }, 100);
    });
  }
}

// Database query optimization
export class DatabaseOptimizer {
  private static queryCache = new Map<string, { data: any; timestamp: number }>();
  private static cacheTimeout = 60000; // 1 minute

  static async optimizedQuery<T>(
    query: string,
    params: any[] = [],
    options: {
      cache?: boolean;
      cacheTime?: number;
      indexes?: string[];
    } = {}
  ): Promise<T> {
    const cacheKey = `${query}_${JSON.stringify(params)}`;
    
    // Check cache
    if (options.cache) {
      const cached = this.queryCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < (options.cacheTime || this.cacheTimeout)) {
        return cached.data;
      }
    }

    // Add EXPLAIN ANALYZE in dev mode
    if (__DEV__) {
      const explainResult = await supabase.rpc('explain_query', { query_text: query });
      console.log('Query plan:', explainResult);
    }

    // Execute query with timeout
    const result = await Promise.race([
      supabase.rpc('execute_query', { query_text: query, params }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), 5000)
      ),
    ]);

    // Cache result
    if (options.cache) {
      this.queryCache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
      });
    }

    return result as T;
  }

  static async createIndexes(table: string, columns: string[]) {
    for (const column of columns) {
      const indexName = `idx_${table}_${column}`;
      await supabase.rpc('create_index_if_not_exists', {
        index_name: indexName,
        table_name: table,
        column_name: column,
      });
    }
  }

  static async analyzeTablePerformance(table: string) {
    const stats = await supabase.rpc('analyze_table_performance', {
      table_name: table,
    });

    return {
      rowCount: stats.row_count,
      indexScanRatio: stats.index_scan_ratio,
      cacheHitRatio: stats.cache_hit_ratio,
      avgQueryTime: stats.avg_query_time,
      recommendations: this.generateTableRecommendations(stats),
    };
  }

  private static generateTableRecommendations(stats: any): string[] {
    const recommendations = [];

    if (stats.index_scan_ratio < 0.8) {
      recommendations.push('Consider adding indexes on frequently queried columns');
    }

    if (stats.cache_hit_ratio < 0.9) {
      recommendations.push('Increase shared_buffers or implement application-level caching');
    }

    if (stats.avg_query_time > 100) {
      recommendations.push('Optimize complex queries or consider denormalization');
    }

    return recommendations;
  }
}
```

OUTPUT: Complete performance optimization system with monitoring and auto-remediation.
```

### Implementation Notes
- Real-time FPS and memory monitoring
- Automatic performance issue detection
- Battery optimization strategies
- Bundle size analysis
- Database query optimization
- Image lazy loading and caching

---

## 3. Testing and QA System

### The Prompt
```
You are a QA architect who has built testing infrastructure at Spotify, Airbnb, and Discord. Create a comprehensive testing and quality assurance system for GLOUP covering unit, integration, E2E, and performance testing.

CORE REQUIREMENTS:
1. 90%+ code coverage target
2. Automated E2E testing with visual regression
3. Performance benchmarking
4. Accessibility testing
5. Security vulnerability scanning
6. Continuous testing in CI/CD
7. Real device testing cloud integration

TEST CATEGORIES:
- Unit Tests: Components, hooks, utilities
- Integration Tests: API, database, services
- E2E Tests: User flows, critical paths
- Performance Tests: Load, stress, memory
- Accessibility Tests: Screen readers, contrast
- Security Tests: Authentication, data protection

TESTING IMPLEMENTATION:
```typescript
// testing/TestingFramework.ts
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { renderHook } from '@testing-library/react-hooks';
import fetchMock from 'jest-fetch-mock';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TextEncoder, TextDecoder } from 'util';
import maestro from '@mobile.dev/maestro';
import lighthouse from 'lighthouse';
import axe from '@axe-core/react';

// Setup global test environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock setup
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Test utilities
export class TestUtils {
  static async loginUser(email = 'test@example.com', password = 'password123') {
    await AsyncStorage.setItem('auth_token', 'mock_token');
    await AsyncStorage.setItem('user', JSON.stringify({
      id: 'test_user_id',
      email,
      name: 'Test User',
    }));
  }

  static async clearAll() {
    await AsyncStorage.clear();
    fetchMock.resetMocks();
    jest.clearAllMocks();
  }

  static mockAPI(endpoint: string, response: any, status = 200) {
    fetchMock.mockResponseOnce(JSON.stringify(response), { status });
  }

  static async waitForLoadingToFinish() {
    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).toBeNull();
    });
  }
}

// Component testing
describe('Component Tests', () => {
  describe('FeedScreen', () => {
    beforeEach(() => {
      TestUtils.clearAll();
    });

    it('should render feed with posts', async () => {
      const mockPosts = [
        { id: '1', content: 'Post 1', author: 'User 1' },
        { id: '2', content: 'Post 2', author: 'User 2' },
      ];

      TestUtils.mockAPI('/api/feed', { posts: mockPosts });

      const { getByText, getAllByTestId } = render(<FeedScreen />);

      await TestUtils.waitForLoadingToFinish();

      expect(getAllByTestId('post-item')).toHaveLength(2);
      expect(getByText('Post 1')).toBeTruthy();
      expect(getByText('Post 2')).toBeTruthy();
    });

    it('should handle pull to refresh', async () => {
      const { getByTestId } = render(<FeedScreen />);
      const scrollView = getByTestId('feed-scroll-view');

      TestUtils.mockAPI('/api/feed', { posts: [] });

      await act(async () => {
        fireEvent(scrollView, 'refresh');
      });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/feed'),
        expect.any(Object)
      );
    });

    it('should handle infinite scroll', async () => {
      const { getByTestId } = render(<FeedScreen />);
      const scrollView = getByTestId('feed-scroll-view');

      await act(async () => {
        fireEvent.scroll(scrollView, {
          nativeEvent: {
            contentOffset: { y: 1000 },
            contentSize: { height: 1200 },
            layoutMeasurement: { height: 800 },
          },
        });
      });

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          expect.stringContaining('page=2'),
          expect.any(Object)
        );
      });
    });
  });

  describe('Custom Hooks', () => {
    it('useAuth should handle login flow', async () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.isAuthenticated).toBe(false);

      TestUtils.mockAPI('/api/login', { token: 'test_token', user: {} });

      await act(async () => {
        await result.current.login('test@example.com', 'password');
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toBeDefined();
    });

    it('useDebounce should delay value updates', async () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'initial', delay: 500 } }
      );

      expect(result.current).toBe('initial');

      rerender({ value: 'updated', delay: 500 });

      expect(result.current).toBe('initial');

      await waitFor(() => expect(result.current).toBe('updated'), {
        timeout: 600,
      });
    });
  });
});

// Integration testing
describe('Integration Tests', () => {
  describe('API Integration', () => {
    it('should handle API errors gracefully', async () => {
      TestUtils.mockAPI('/api/posts', null, 500);

      const { getByText } = render(<PostsScreen />);

      await waitFor(() => {
        expect(getByText('Something went wrong')).toBeTruthy();
      });
    });

    it('should retry failed requests', async () => {
      let callCount = 0;
      fetchMock.mockResponse(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({ status: 500 });
        }
        return Promise.resolve(JSON.stringify({ posts: [] }));
      });

      render(<PostsScreen />);

      await waitFor(() => {
        expect(callCount).toBe(2);
      });
    });
  });

  describe('Database Integration', () => {
    it('should sync local and remote data', async () => {
      const localData = { id: '1', content: 'Local', synced: false };
      await AsyncStorage.setItem('posts_draft', JSON.stringify([localData]));

      TestUtils.mockAPI('/api/sync', { success: true });

      const { result } = renderHook(() => useDataSync());

      await act(async () => {
        await result.current.sync();
      });

      const drafts = await AsyncStorage.getItem('posts_draft');
      expect(JSON.parse(drafts!)).toEqual([]);
    });
  });
});

// E2E Testing with Maestro
export class E2ETests {
  static async runCriticalUserFlows() {
    const flows = [
      this.testOnboarding,
      this.testCreatePost,
      this.testSocialInteractions,
      this.testMessaging,
      this.testProfile,
    ];

    const results = [];
    for (const flow of flows) {
      const result = await flow();
      results.push(result);
    }

    return results;
  }

  static async testOnboarding() {
    return maestro.runFlow(`
      appId: com.gloup.app
      ---
      - launchApp
      - assertVisible: "Welcome to GLOUP"
      - tapOn: "Get Started"
      - inputText: "testuser"
      - tapOn: "Continue"
      - assertVisible: "What interests you?"
      - tapOn: "Personal Growth"
      - tapOn: "Wellness"
      - tapOn: "Learning"
      - tapOn: "Continue"
      - assertVisible: "You're all set!"
      - tapOn: "Start Exploring"
      - assertVisible: "Feed"
    `);
  }

  static async testCreatePost() {
    return maestro.runFlow(`
      appId: com.gloup.app
      ---
      - launchApp
      - tapOn: "Create"
      - inputText: "This is a test post"
      - tapOn: "Add Photo"
      - tapOn: "Choose from Library"
      - tapOn:
          index: 0
      - tapOn: "Post"
      - assertVisible: "This is a test post"
    `);
  }

  static async testPerformance() {
    return maestro.runFlow(`
      appId: com.gloup.app
      ---
      - launchApp
      - startRecording: "feed_scroll_performance"
      - repeat:
          times: 10
          commands:
            - scroll:
                direction: DOWN
                duration: 2000
      - stopRecording
      - assertMetric:
          name: "fps"
          minValue: 55
      - assertMetric:
          name: "memory"
          maxValue: 200
    `);
  }
}

// Visual Regression Testing
export class VisualRegressionTests {
  private static baselineDir = './visual-baselines';
  private static diffDir = './visual-diffs';

  static async captureScreenshot(name: string) {
    const screenshot = await maestro.takeScreenshot();
    return this.compareWithBaseline(name, screenshot);
  }

  static async compareWithBaseline(name: string, screenshot: Buffer) {
    const baseline = await this.loadBaseline(name);
    
    if (!baseline) {
      await this.saveBaseline(name, screenshot);
      return { isNew: true };
    }

    const diff = await this.compareImages(baseline, screenshot);
    
    if (diff.percentage > 0.01) {
      await this.saveDiff(name, diff.image);
      return {
        failed: true,
        difference: diff.percentage,
        diffPath: `${this.diffDir}/${name}.png`,
      };
    }

    return { passed: true };
  }

  static async runVisualTests() {
    const screens = [
      'onboarding_welcome',
      'feed_light',
      'feed_dark',
      'profile',
      'settings',
      'create_post',
    ];

    const results = [];
    for (const screen of screens) {
      await this.navigateToScreen(screen);
      const result = await this.captureScreenshot(screen);
      results.push({ screen, ...result });
    }

    return results;
  }
}

// Performance Testing
export class PerformanceTests {
  static async measureStartupTime() {
    const startTime = Date.now();
    
    await maestro.runFlow(`
      appId: com.gloup.app
      ---
      - launchApp:
          clearState: true
      - assertVisible: "Feed"
    `);

    const startupTime = Date.now() - startTime;
    
    return {
      metric: 'startup_time',
      value: startupTime,
      target: 1000,
      passed: startupTime < 1000,
    };
  }

  static async measureMemoryUsage() {
    const measurements = [];

    for (let i = 0; i < 5; i++) {
      await maestro.runFlow(`
        appId: com.gloup.app
        ---
        - scroll:
            direction: DOWN
            duration: 5000
      `);

      const memory = await maestro.getMemoryUsage();
      measurements.push(memory);
    }

    const avgMemory = measurements.reduce((a, b) => a + b, 0) / measurements.length;

    return {
      metric: 'memory_usage',
      value: avgMemory,
      target: 150,
      passed: avgMemory < 150,
    };
  }

  static async runLoadTest() {
    const results = await Promise.all(
      Array(100).fill(null).map(async (_, i) => {
        const start = Date.now();
        const response = await fetch(`${API_URL}/api/feed?user=${i}`);
        const duration = Date.now() - start;
        
        return {
          userId: i,
          duration,
          status: response.status,
        };
      })
    );

    const p95 = this.calculatePercentile(
      results.map(r => r.duration),
      95
    );

    return {
      metric: 'api_response_p95',
      value: p95,
      target: 200,
      passed: p95 < 200,
      details: results,
    };
  }

  private static calculatePercentile(values: number[], percentile: number) {
    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }
}

// Accessibility Testing
export class AccessibilityTests {
  static async runAccessibilityAudit() {
    const screens = ['Feed', 'Profile', 'Settings', 'CreatePost'];
    const results = [];

    for (const screen of screens) {
      const violations = await this.auditScreen(screen);
      results.push({
        screen,
        violations,
        passed: violations.length === 0,
      });
    }

    return results;
  }

  static async auditScreen(screenName: string) {
    const { container } = render(this.getScreenComponent(screenName));
    
    const results = await axe(container);
    
    return results.violations.map(violation => ({
      id: violation.id,
      impact: violation.impact,
      description: violation.description,
      nodes: violation.nodes.length,
      help: violation.help,
    }));
  }

  static async testScreenReader() {
    return maestro.runFlow(`
      appId: com.gloup.app
      ---
      - enableAccessibility:
          screenReader: true
      - launchApp
      - assertAccessible: "Feed"
      - swipeRight
      - assertAnnouncement: "Post by"
      - doubleTap
      - assertAccessible: "Like button"
      - doubleTap
      - assertAnnouncement: "Post liked"
    `);
  }

  static async testColorContrast() {
    const screenshots = await this.captureAllScreens();
    const results = [];

    for (const { name, image } of screenshots) {
      const contrastIssues = await this.analyzeContrast(image);
      results.push({
        screen: name,
        issues: contrastIssues,
        passed: contrastIssues.length === 0,
      });
    }

    return results;
  }
}

// Security Testing
export class SecurityTests {
  static async runSecuritySuite() {
    const tests = [
      this.testAuthentication,
      this.testDataEncryption,
      this.testAPISecurit,
      this.testInputValidation,
      this.testSessionManagement,
    ];

    const results = [];
    for (const test of tests) {
      const result = await test();
      results.push(result);
    }

    return results;
  }

  static async testAuthentication() {
    const tests = [
      // Test invalid credentials
      async () => {
        const response = await fetch('/api/login', {
          method: 'POST',
          body: JSON.stringify({
            email: 'invalid@test.com',
            password: 'wrongpassword',
          }),
        });
        return response.status === 401;
      },
      // Test rate limiting
      async () => {
        const attempts = Array(10).fill(null).map(() =>
          fetch('/api/login', {
            method: 'POST',
            body: JSON.stringify({
              email: 'test@test.com',
              password: 'wrong',
            }),
          })
        );
        const responses = await Promise.all(attempts);
        return responses.some(r => r.status === 429);
      },
      // Test token expiration
      async () => {
        const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
        const response = await fetch('/api/user', {
          headers: { Authorization: `Bearer ${expiredToken}` },
        });
        return response.status === 401;
      },
    ];

    const results = await Promise.all(tests.map(t => t()));
    return {
      test: 'authentication',
      passed: results.every(r => r),
      details: results,
    };
  }

  static async testDataEncryption() {
    // Check if sensitive data is encrypted in storage
    const sensitiveKeys = ['auth_token', 'user_credentials', 'payment_info'];
    const results = [];

    for (const key of sensitiveKeys) {
      const value = await AsyncStorage.getItem(key);
      const isEncrypted = value ? !this.isPlainText(value) : true;
      results.push({
        key,
        encrypted: isEncrypted,
      });
    }

    return {
      test: 'data_encryption',
      passed: results.every(r => r.encrypted),
      details: results,
    };
  }

  private static isPlainText(value: string): boolean {
    // Check if value appears to be plain text
    try {
      JSON.parse(value);
      return true;
    } catch {
      return /^[a-zA-Z0-9\s]+$/.test(value);
    }
  }
}

// Test Reporter
export class TestReporter {
  static async generateReport(results: any) {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: results.length,
        passed: results.filter((r: any) => r.passed).length,
        failed: results.filter((r: any) => !r.passed).length,
        coverage: await this.getCoverage(),
      },
      details: results,
      recommendations: this.generateRecommendations(results),
    };

    await this.saveReport(report);
    await this.notifyStakeholders(report);

    return report;
  }

  static async getCoverage() {
    // Get code coverage from Jest
    const coverage = await import('../coverage/coverage-summary.json');
    return {
      lines: coverage.total.lines.pct,
      statements: coverage.total.statements.pct,
      functions: coverage.total.functions.pct,
      branches: coverage.total.branches.pct,
    };
  }

  private static generateRecommendations(results: any): string[] {
    const recommendations = [];

    const failedTests = results.filter((r: any) => !r.passed);
    if (failedTests.length > 0) {
      recommendations.push(`Fix ${failedTests.length} failing tests before deployment`);
    }

    const performanceIssues = results.filter(
      (r: any) => r.metric && r.value > r.target
    );
    if (performanceIssues.length > 0) {
      recommendations.push('Address performance bottlenecks in critical paths');
    }

    return recommendations;
  }
}
```

OUTPUT: Complete testing and QA system with multiple test types and reporting.
```

### Implementation Notes
- Comprehensive test coverage across all layers
- Automated E2E testing with Maestro
- Visual regression testing
- Performance benchmarking
- Accessibility compliance testing
- Security vulnerability scanning
- Detailed reporting and recommendations

---

## 4. Launch Preparation System

### The Prompt
```
You are a product launch specialist who has successfully launched apps at Uber, Robinhood, and Clubhouse. Create a comprehensive launch preparation system for GLOUP including pre-launch testing, monitoring, rollout strategy, and post-launch optimization.

CORE REQUIREMENTS:
1. Staged rollout with feature flags
2. Real-time monitoring and alerting
3. A/B testing infrastructure
4. Crash reporting and analytics
5. User feedback collection
6. App store optimization
7. Launch day runbook

LAUNCH PHASES:
1. Alpha Testing (Internal team)
2. Beta Testing (100-1000 users)
3. Soft Launch (Single market)
4. Gradual Rollout (10%, 25%, 50%, 100%)
5. Global Launch
6. Post-Launch Optimization

IMPLEMENTATION:
```typescript
// launch/LaunchManager.ts
import { Platform } from 'react-native';
import * as Updates from 'expo-updates';
import * as Sentry from '@sentry/react-native';
import analytics from '@segment/analytics-react-native';
import { Firebase } from '@react-native-firebase/app';
import crashlytics from '@react-native-firebase/crashlytics';
import perf from '@react-native-firebase/perf';
import remoteConfig from '@react-native-firebase/remote-config';
import codePush from 'react-native-code-push';

interface LaunchConfig {
  environment: 'alpha' | 'beta' | 'staging' | 'production';
  rolloutPercentage: number;
  enabledFeatures: string[];
  abTests: ABTest[];
  monitoring: MonitoringConfig;
}

interface ABTest {
  id: string;
  name: string;
  variants: Variant[];
  allocation: number;
  metrics: string[];
}

export class LaunchManager {
  private static instance: LaunchManager;
  private config: LaunchConfig;
  private monitors: Map<string, any> = new Map();
  private isInitialized = false;

  private constructor() {
    this.config = this.getDefaultConfig();
  }

  static getInstance(): LaunchManager {
    if (!LaunchManager.instance) {
      LaunchManager.instance = new LaunchManager();
    }
    return LaunchManager.instance;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Initialize monitoring services
      await this.initializeMonitoring();

      // Setup feature flags
      await this.setupFeatureFlags();

      // Configure A/B tests
      await this.configureABTests();

      // Setup crash reporting
      await this.setupCrashReporting();

      // Initialize analytics
      await this.initializeAnalytics();

      // Setup remote config
      await this.setupRemoteConfig();

      // Check for updates
      await this.checkForUpdates();

      this.isInitialized = true;

      analytics.track('App Launched', {
        environment: this.config.environment,
        version: this.getAppVersion(),
        build: this.getBuildNumber(),
        platform: Platform.OS,
      });
    } catch (error) {
      console.error('Launch initialization failed:', error);
      Sentry.captureException(error);
    }
  }

  private async initializeMonitoring() {
    // Sentry for error tracking
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: this.config.environment,
      tracesSampleRate: this.config.environment === 'production' ? 0.1 : 1.0,
      integrations: [
        new Sentry.ReactNativeTracing({
          tracingOrigins: ['localhost', /^https:\/\/api\.gloup\.app\/api/],
          routingInstrumentation: new Sentry.ReactNavigationInstrumentation(
            navigation,
          ),
        }),
      ],
      beforeSend: (event, hint) => {
        // Filter sensitive data
        if (event.request) {
          delete event.request.cookies;
          delete event.request.headers?.authorization;
        }
        return event;
      },
    });

    // Firebase Crashlytics
    await crashlytics().setCrashlyticsCollectionEnabled(true);
    
    // Performance monitoring
    const trace = await perf().startTrace('app_startup');
    this.monitors.set('startup_trace', trace);

    // Custom monitoring
    this.setupCustomMonitors();
  }

  private setupCustomMonitors() {
    // API response time monitoring
    const originalFetch = global.fetch;
    global.fetch = async (...args) => {
      const startTime = Date.now();
      const trace = await perf().startTrace(`api_${args[0]}`);
      
      try {
        const response = await originalFetch(...args);
        const duration = Date.now() - startTime;
        
        trace.putMetric('response_time', duration);
        trace.putAttribute('status_code', response.status.toString());
        
        if (duration > 2000) {
          this.reportSlowAPI(args[0] as string, duration);
        }
        
        return response;
      } catch (error) {
        trace.putAttribute('error', 'true');
        throw error;
      } finally {
        await trace.stop();
      }
    };

    // Memory monitoring
    setInterval(() => {
      if (performance.memory) {
        const memoryUsage = performance.memory.usedJSHeapSize / 1048576;
        analytics.track('Memory Usage', {
          jsHeap: memoryUsage,
          timestamp: Date.now(),
        });

        if (memoryUsage > 200) {
          this.handleHighMemoryUsage(memoryUsage);
        }
      }
    }, 30000);
  }

  private async setupFeatureFlags() {
    // Initialize feature flag service
    await remoteConfig().setDefaults({
      new_onboarding_flow: false,
      ai_recommendations: false,
      video_posts: false,
      live_streaming: false,
      premium_features: false,
    });

    await remoteConfig().fetchAndActivate();

    // Setup real-time updates
    remoteConfig().onConfigUpdated(async () => {
      await remoteConfig().activate();
      this.notifyFeatureFlagUpdate();
    });
  }

  async isFeatureEnabled(feature: string): boolean {
    // Check rollout percentage
    if (this.config.rolloutPercentage < 100) {
      const userHash = this.getUserHash();
      const threshold = this.config.rolloutPercentage / 100;
      if (userHash > threshold) return false;
    }

    // Check remote config
    const value = remoteConfig().getValue(feature);
    return value.asBoolean();
  }

  private async configureABTests() {
    // Load active experiments
    const experiments = await this.loadExperiments();
    
    for (const experiment of experiments) {
      const variant = this.assignVariant(experiment);
      
      // Track assignment
      analytics.track('Experiment Assigned', {
        experiment_id: experiment.id,
        experiment_name: experiment.name,
        variant: variant.name,
        variant_id: variant.id,
      });

      // Apply variant configuration
      this.applyVariant(experiment.id, variant);
    }
  }

  private assignVariant(experiment: ABTest): Variant {
    const userId = this.getUserId();
    const hash = this.hashCode(`${experiment.id}_${userId}`);
    const bucket = (hash % 100) / 100;

    let cumulative = 0;
    for (const variant of experiment.variants) {
      cumulative += variant.allocation;
      if (bucket <= cumulative) {
        return variant;
      }
    }

    return experiment.variants[0]; // Fallback to control
  }

  async trackEvent(eventName: string, properties?: any) {
    // Add common properties
    const enrichedProperties = {
      ...properties,
      app_version: this.getAppVersion(),
      build_number: this.getBuildNumber(),
      environment: this.config.environment,
      platform: Platform.OS,
      timestamp: Date.now(),
    };

    // Send to multiple analytics providers
    analytics.track(eventName, enrichedProperties);
    
    // Firebase Analytics
    await Firebase.analytics().logEvent(
      eventName.replace(/\s+/g, '_').toLowerCase(),
      enrichedProperties
    );

    // Custom backend analytics
    this.sendToBackend(eventName, enrichedProperties);
  }

  // Staged rollout management
  async updateRolloutPercentage(percentage: number) {
    this.config.rolloutPercentage = percentage;
    
    await remoteConfig().setConfigSettings({
      minimumFetchIntervalMillis: 0,
    });
    
    await remoteConfig().fetchAndActivate();
    
    analytics.track('Rollout Updated', {
      percentage,
      affected_users: this.estimateAffectedUsers(percentage),
    });
  }

  // Health checks
  async performHealthCheck(): Promise<HealthCheckResult> {
    const checks = [
      this.checkAPIHealth(),
      this.checkDatabaseHealth(),
      this.checkCDNHealth(),
      this.checkThirdPartyServices(),
    ];

    const results = await Promise.allSettled(checks);
    
    const healthStatus = {
      healthy: results.every(r => r.status === 'fulfilled' && r.value.healthy),
      services: results.map((r, i) => ({
        name: ['API', 'Database', 'CDN', 'Third Party'][i],
        status: r.status === 'fulfilled' ? r.value : { healthy: false },
      })),
      timestamp: Date.now(),
    };

    if (!healthStatus.healthy) {
      this.handleUnhealthyState(healthStatus);
    }

    return healthStatus;
  }

  private async checkAPIHealth() {
    try {
      const response = await fetch(`${API_URL}/health`, {
        timeout: 5000,
      });
      return {
        healthy: response.status === 200,
        latency: response.headers.get('x-response-time'),
      };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }

  // Launch day runbook
  async executeLaunchRunbook() {
    const tasks = [
      { name: 'Pre-launch health check', fn: () => this.performHealthCheck() },
      { name: 'Enable monitoring', fn: () => this.enableFullMonitoring() },
      { name: 'Warm up caches', fn: () => this.warmUpCaches() },
      { name: 'Scale infrastructure', fn: () => this.scaleInfrastructure() },
      { name: 'Enable feature flags', fn: () => this.enableLaunchFeatures() },
      { name: 'Start metrics collection', fn: () => this.startMetricsCollection() },
    ];

    const results = [];
    for (const task of tasks) {
      console.log(`Executing: ${task.name}`);
      try {
        const result = await task.fn();
        results.push({ task: task.name, status: 'success', result });
      } catch (error) {
        results.push({ task: task.name, status: 'failed', error });
        
        // Critical failure handling
        if (this.isCriticalTask(task.name)) {
          await this.handleCriticalFailure(task.name, error);
        }
      }
    }

    return results;
  }

  // User feedback collection
  async collectUserFeedback(type: 'bug' | 'feature' | 'general', feedback: string) {
    const feedbackData = {
      type,
      feedback,
      user_id: this.getUserId(),
      app_version: this.getAppVersion(),
      platform: Platform.OS,
      device_info: await this.getDeviceInfo(),
      timestamp: Date.now(),
    };

    // Send to backend
    await fetch(`${API_URL}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedbackData),
    });

    // Track in analytics
    analytics.track('Feedback Submitted', feedbackData);

    // If bug report, capture additional diagnostics
    if (type === 'bug') {
      await this.captureBugReport(feedbackData);
    }
  }

  private async captureBugReport(feedbackData: any) {
    // Capture screenshots
    const screenshot = await this.captureScreenshot();
    
    // Get logs
    const logs = await this.getRecentLogs();
    
    // Get network requests
    const networkLog = await this.getNetworkLog();
    
    // Create bug report
    const bugReport = {
      ...feedbackData,
      screenshot,
      logs,
      networkLog,
      memory_usage: performance.memory?.usedJSHeapSize,
      stack_trace: new Error().stack,
    };

    // Send to Sentry
    Sentry.captureMessage('User Bug Report', {
      level: 'info',
      extra: bugReport,
    });

    // Send to Crashlytics
    crashlytics().recordError(new Error(feedbackData.feedback), 'user_report');
  }

  // App Store Optimization
  async optimizeForAppStore() {
    const optimizations = {
      // Reduce app size
      bundleSize: await this.optimizeBundleSize(),
      
      // Optimize assets
      assets: await this.optimizeAssets(),
      
      // Generate screenshots
      screenshots: await this.generateAppStoreScreenshots(),
      
      // Prepare metadata
      metadata: this.prepareAppStoreMetadata(),
      
      // Keywords optimization
      keywords: this.optimizeKeywords(),
    };

    return optimizations;
  }

  private async optimizeBundleSize() {
    // Use dynamic imports for large libraries
    const optimizations = [];

    // Split bundles
    if (Platform.OS === 'android') {
      optimizations.push('Enable Android App Bundle');
      optimizations.push('Use ProGuard for code shrinking');
    } else {
      optimizations.push('Enable App Thinning');
      optimizations.push('Use On-Demand Resources');
    }

    // Remove unused code
    optimizations.push('Tree shaking enabled');
    optimizations.push('Dead code elimination');

    return {
      currentSize: await this.getBundleSize(),
      optimizations,
      estimatedSaving: '30-40%',
    };
  }

  // Post-launch monitoring
  async monitorPostLaunch() {
    const metrics = {
      // User metrics
      dau: await this.getDailyActiveUsers(),
      retention: await this.getRetentionRate(),
      engagement: await this.getEngagementMetrics(),
      
      // Performance metrics
      crashRate: await this.getCrashRate(),
      anr: await this.getANRRate(), // Android only
      startupTime: await this.getAverageStartupTime(),
      
      // Business metrics
      conversion: await this.getConversionRate(),
      revenue: await this.getRevenueMetrics(),
      
      // Store metrics
      ratings: await this.getAppStoreRatings(),
      reviews: await this.getRecentReviews(),
    };

    // Generate insights
    const insights = this.generateInsights(metrics);
    
    // Send report
    await this.sendLaunchReport(metrics, insights);
    
    return { metrics, insights };
  }

  private generateInsights(metrics: any): string[] {
    const insights = [];

    if (metrics.crashRate > 0.01) {
      insights.push('High crash rate detected - investigate top crashes');
    }

    if (metrics.retention.day1 < 0.4) {
      insights.push('Low D1 retention - review onboarding flow');
    }

    if (metrics.startupTime > 2000) {
      insights.push('Slow startup time - optimize initialization');
    }

    if (metrics.ratings.average < 4.0) {
      insights.push('Low ratings - analyze negative reviews');
    }

    return insights;
  }

  // Emergency rollback
  async emergencyRollback(reason: string) {
    console.error(`EMERGENCY ROLLBACK: ${reason}`);

    // Notify team
    await this.notifyTeam('emergency_rollback', { reason });

    // Revert feature flags
    await this.disableAllFeatures();

    // Roll back to previous version
    if (Platform.OS === 'ios') {
      // iOS doesn't support rollback - disable features instead
      await remoteConfig().setConfigSettings({
        minimumFetchIntervalMillis: 0,
      });
      await remoteConfig().fetchAndActivate();
    } else {
      // Android - use staged rollout
      await this.updateRolloutPercentage(0);
    }

    // Track incident
    analytics.track('Emergency Rollback', {
      reason,
      timestamp: Date.now(),
      affected_version: this.getAppVersion(),
    });

    return {
      success: true,
      actions_taken: [
        'Features disabled',
        'Team notified',
        'Incident tracked',
      ],
    };
  }
}

// Launch Checklist
export const LAUNCH_CHECKLIST = {
  preLaunch: [
    'Performance benchmarks meet targets',
    'Security audit completed',
    'Accessibility compliance verified',
    'App store assets prepared',
    'Privacy policy updated',
    'Terms of service finalized',
    'Support documentation ready',
    'Customer support team trained',
  ],
  
  launchDay: [
    'Infrastructure scaled',
    'Monitoring dashboards active',
    'Alert channels configured',
    'Feature flags set correctly',
    'Rollback plan documented',
    'Communication plan ready',
    'Press kit distributed',
    'Social media scheduled',
  ],
  
  postLaunch: [
    'Monitor crash rates',
    'Track user feedback',
    'Analyze funnel metrics',
    'Review app store ratings',
    'Optimize based on data',
    'Plan feature updates',
    'Celebrate success! 🎉',
  ],
};
```

OUTPUT: Complete launch preparation system with monitoring, rollout, and optimization.
```

### Implementation Notes
- Staged rollout with feature flags
- Comprehensive monitoring and alerting
- A/B testing infrastructure
- Emergency rollback capabilities
- App store optimization
- Post-launch analytics and insights