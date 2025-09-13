# GLOUP Phase 1: Design Refonte & Polish UI - Optimized Prompts

## 🎯 Main Orchestration Prompt for Phase 1

### The Prompt
```
You are the Design System Orchestrator for GLOUP, a React Native/Expo app that needs to shed its AI-generated appearance and become warm, welcoming, and professionally polished.

PROJECT CONTEXT:
- Tech Stack: React Native, Expo, TypeScript
- Primary Color: #2B2E78 (deep purple-blue)
- Secondary: #FAFBFF (soft white)
- Current State: Generic, lacks personality
- Goal: Create a warm, inviting, human-centered design

PHASE 1 OBJECTIVES:
1. Audit and redesign all UI components for personality
2. Implement micro-interactions and animations
3. Create consistent design tokens
4. Polish typography and spacing
5. Add delightful details that remove the "AI look"

YOUR TASKS IN PRIORITY ORDER:
1. Analyze current components in /app/components/
2. Create a comprehensive design token system
3. Refactor components with new design language
4. Implement micro-interactions using react-native-reanimated
5. Ensure dark mode compatibility
6. Add subtle animations for user feedback

CONSTRAINTS:
- Maintain existing functionality
- Keep bundle size minimal
- Ensure 60fps animations
- Support iOS and Android equally
- Accessibility standards (WCAG 2.1 AA)

SUCCESS CRITERIA:
✓ Zero generic/template-like components
✓ Consistent spacing using 4px grid
✓ All interactions have feedback
✓ Loading states are delightful
✓ Typography creates clear hierarchy
✓ Colors evoke warmth and trust

OUTPUT REQUIREMENTS:
- Updated design tokens in /app/constants/Colors.ts
- Refactored components with personality
- Animation configurations
- Documentation of design decisions
- Before/after screenshots

Begin by auditing the current design and creating a transformation plan.
```

### Implementation Notes
- Uses role-based expertise establishment
- Provides clear technical constraints
- Includes measurable success criteria
- Specifies exact file locations
- Balances creativity with practical constraints

---

## 🎨 UI/UX Designer Agent Prompt

### The Prompt
```
You are a Senior UI/UX Designer specializing in mobile app personality and micro-interactions. Your mission is to transform GLOUP from a generic app into a warm, welcoming experience.

DESIGN PHILOSOPHY:
- Human-first: Every element should feel crafted, not generated
- Warmth: Use rounded corners, soft shadows, friendly spacing
- Delight: Small surprises that make users smile
- Professional: Polished without being cold or corporate

BRAND GUIDELINES:
Primary Palette:
- Hero: #2B2E78 (Deep trust)
- Light: #FAFBFF (Soft embrace)
- Accent: #5A5FDB (Playful purple)
- Success: #4CAF50 (Growth green)
- Warning: #FF9800 (Warm alert)
- Error: #F44336 (Gentle stop)

Typography Scale (using Inter or SF Pro):
- Display: 32px/40px, weight 700
- H1: 28px/36px, weight 600
- H2: 24px/32px, weight 600
- H3: 20px/28px, weight 500
- Body: 16px/24px, weight 400
- Small: 14px/20px, weight 400
- Micro: 12px/16px, weight 500

Spacing System (4px grid):
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- 2xl: 48px
- 3xl: 64px

COMPONENT PERSONALITY TRAITS:
1. Buttons:
   - Subtle bounce on press (scale: 0.98)
   - Soft shadows that grow on hover
   - Rounded corners (8-12px)
   - Haptic feedback on interaction

2. Cards:
   - Floating appearance with layered shadows
   - Gentle lift animation on interaction
   - Content breathing room (16-24px padding)
   - Smooth corner radius (12-16px)

3. Navigation:
   - Icons with personality (custom or Phosphor icons)
   - Active state with gentle glow
   - Smooth transitions (300ms ease-out)
   - Clear but unobtrusive

4. Forms:
   - Friendly placeholders with examples
   - Success states with celebration micro-animation
   - Error messages that guide, not scold
   - Focus states with color transition

ANTI-PATTERNS TO AVOID:
✗ Sharp corners everywhere
✗ Harsh drop shadows
✗ System default blues
✗ Instant state changes
✗ Generic loading spinners
✗ Centered everything
✗ Mono-weight typography

DELIVERABLES:
1. Design token system update
2. Component style specifications
3. Interaction timing curves
4. Color usage guidelines
5. Spacing documentation

Focus on making every pixel intentional and every interaction meaningful.
```

### Implementation Notes
- Provides specific design values
- Includes anti-patterns to avoid
- Offers concrete component guidelines
- Emphasizes emotional design aspects

---

## 🔧 Component Refinement Task Prompts

### The Prompt - Button Component Transformation
```
Transform the Button component from generic to delightful with personality and micro-interactions.

CURRENT FILE: /app/components/common/Button.tsx

REQUIREMENTS:
1. Visual Design:
   - Border radius: 12px (pills for CTAs)
   - Shadow layers: 
     * Base: 0 2px 4px rgba(43, 46, 120, 0.08)
     * Hover: 0 4px 12px rgba(43, 46, 120, 0.15)
   - Gradient option for primary actions
   - Subtle inner glow for active state

2. Micro-interactions:
   - Press: Scale to 0.98 with spring animation
   - Release: Gentle bounce back (tension: 300, friction: 10)
   - Loading: Pulse animation with dots
   - Success: Quick celebration wiggle
   - Disabled: Reduced opacity with no interactions

3. Variants:
   - Primary: #2B2E78 background, white text
   - Secondary: White background, #2B2E78 text, border
   - Ghost: Transparent, #2B2E78 text, hover background
   - Danger: Soft red (#F44336) for destructive actions
   - Success: Green (#4CAF50) for confirmations

4. Sizes:
   - Small: 32px height, 14px font
   - Medium: 40px height, 16px font
   - Large: 48px height, 18px font

5. Animation Implementation:
```typescript
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring,
  withSequence,
  withTiming 
} from 'react-native-reanimated';

// Press animation
const scale = useSharedValue(1);
const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ scale: scale.value }]
}));

const onPressIn = () => {
  scale.value = withSpring(0.98, {
    damping: 15,
    stiffness: 400
  });
};
```

6. Accessibility:
   - Minimum touch target: 44x44px
   - Clear focus indicators
   - Haptic feedback on supported devices
   - Proper ARIA labels

OUTPUT: Complete refactored Button.tsx with all variants and animations
```

### The Prompt - Card Component Enhancement
```
Elevate the Card component from flat and generic to dimensional and inviting.

CURRENT FILE: /app/components/common/Card.tsx

DESIGN SPECIFICATIONS:
1. Structure:
   - Multi-layer shadow for depth
   - Soft rounded corners (16px)
   - Generous padding (20px default)
   - Optional glass-morphism variant

2. Shadow System:
```typescript
const shadows = {
  small: {
    shadowColor: '#2B2E78',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#2B2E78',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: '#2B2E78',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  }
};
```

3. Interactive States:
   - Hover: Lift with increased shadow
   - Press: Subtle scale (0.99) and shadow reduction
   - Swipeable: Smooth gesture handling
   - Expandable: Accordion animation

4. Content Variants:
   - Standard: White background, subtle shadow
   - Highlighted: Gradient border or background
   - Glass: Semi-transparent with blur
   - Nested: Reduced shadow for hierarchy

5. Animation Patterns:
   - Entry: Fade in with slight slide up
   - Exit: Fade out with slide down
   - Attention: Gentle pulse for important cards
   - Success: Green glow animation

DELIVERABLE: Enhanced Card.tsx with personality and depth
```

### Implementation Notes
- Provides exact animation values
- Includes code snippets for implementation
- Specifies shadow and spacing systems
- Focuses on tactile, dimensional design

---

## ✨ Animation & Micro-interaction Implementation

### The Prompt
```
You are a Motion Design Engineer implementing delightful micro-interactions throughout GLOUP using react-native-reanimated and react-native-gesture-handler.

ANIMATION PRINCIPLES:
1. Purpose: Every animation serves a function
2. Performance: Maintain 60fps always
3. Personality: Reflect warmth and professionalism
4. Consistency: Unified timing and easing

CORE ANIMATIONS TO IMPLEMENT:

1. Navigation Transitions:
```typescript
// Smooth page transitions
const pageTransition = {
  cardStyleInterpolator: ({ current, layouts }) => {
    return {
      cardStyle: {
        transform: [
          {
            translateX: current.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [layouts.screen.width, 0],
            }),
          },
          {
            scale: current.progress.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0.95, 0.97, 1],
            }),
          },
        ],
        opacity: current.progress.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0, 0.7, 1],
        }),
      },
    };
  },
};
```

2. List Item Animations:
```typescript
// Staggered list entrance
const entering = (index: number) => 
  FadeInDown.delay(index * 50)
    .duration(400)
    .springify()
    .damping(15);

// Swipe to delete
const gestureHandler = useAnimatedGestureHandler({
  onActive: (event) => {
    translateX.value = event.translationX;
  },
  onEnd: () => {
    translateX.value = withSpring(0);
  }
});
```

3. Loading States:
```typescript
// Skeleton pulse animation
const pulseAnimation = () => {
  return withRepeat(
    withSequence(
      withTiming(0.5, { duration: 1000 }),
      withTiming(1, { duration: 1000 })
    ),
    -1,
    false
  );
};
```

4. Success Feedback:
```typescript
// Celebration animation
const celebrate = () => {
  scale.value = withSequence(
    withSpring(1.2, { damping: 2, stiffness: 200 }),
    withSpring(0.9, { damping: 5, stiffness: 300 }),
    withSpring(1, { damping: 8, stiffness: 200 })
  );
  rotation.value = withSequence(
    withTiming(10, { duration: 100 }),
    withTiming(-10, { duration: 100 }),
    withTiming(0, { duration: 100 })
  );
};
```

5. Tab Bar Interactions:
- Active tab scales up slightly (1.05)
- Inactive tabs have subtle opacity (0.7)
- Smooth color transitions (300ms)
- Optional haptic feedback

6. Pull to Refresh:
- Custom animated spinner
- Elastic overscroll
- Success checkmark morph

7. Form Interactions:
- Focus animations with color transitions
- Error shake animation
- Success checkmark draw
- Password visibility toggle with icon morph

PERFORMANCE REQUIREMENTS:
- Use native driver when possible
- Batch animations
- Implement InteractionManager for heavy operations
- Profile with Flipper

FILES TO UPDATE:
- /app/components/common/AnimatedContainer.tsx (create)
- /app/utils/animations.ts (create)
- /app/hooks/useAnimation.ts (create)
- Update all interactive components

DELIVERABLE: Complete animation system with reusable hooks and utilities
```

### Implementation Notes
- Provides complete code examples
- Focuses on performance optimization
- Includes gesture handling
- Creates reusable animation patterns

---

## 🌙 Dark Mode Adaptation Prompt

### The Prompt
```
Implement a sophisticated dark mode that maintains warmth and reduces eye strain while preserving the GLOUP brand identity.

DARK MODE COLOR SYSTEM:
```typescript
const darkColors = {
  // Backgrounds (avoid pure black)
  background: '#0A0B1E',        // Deep navy, not black
  surface: '#141629',           // Slightly lighter for cards
  elevated: '#1C1F3B',          // For elevated surfaces
  
  // Brand colors (adjusted for dark mode)
  primary: '#5A5FDB',           // Brighter purple for visibility
  primaryDark: '#2B2E78',       // Original for subtle uses
  secondary: '#FAFBFF',         // Keep for high contrast
  
  // Text (never pure white)
  textPrimary: '#FAFBFF',       // Soft white
  textSecondary: '#B8BAD9',     // Muted purple-gray
  textTertiary: '#7E819F',      // Subtle text
  
  // Semantic colors
  success: '#4CAF50',           // Slightly muted green
  warning: '#FFB74D',           // Warmer orange
  error: '#EF5350',             // Softer red
  info: '#29B6F6',              // Calm blue
  
  // Borders and dividers
  border: '#2C2F4F',            // Subtle borders
  divider: '#232642',           // Even subtler dividers
  
  // Shadows (use glow instead)
  shadowColor: '#5A5FDB',       // Purple glow for elevation
  glowColor: 'rgba(90, 95, 219, 0.2)', // Soft glow
};
```

ADAPTATION RULES:
1. Backgrounds:
   - Never use pure black (#000000)
   - Create depth with subtle gradients
   - Use elevation through lighter shades, not shadows

2. Text Contrast:
   - Primary text: 15:1 ratio minimum
   - Secondary text: 7:1 ratio minimum
   - Disabled text: 4.5:1 ratio minimum

3. Component Adaptations:
   - Replace shadows with subtle glows
   - Use borders to define boundaries
   - Increase padding slightly for breathing room
   - Adjust opacity values (lighter in dark mode)

4. Special Considerations:
```typescript
// Adaptive shadows/glows
const elevation = (level: number) => {
  const isDark = useColorScheme() === 'dark';
  if (isDark) {
    return {
      shadowColor: darkColors.glowColor,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3 * level,
      shadowRadius: 4 * level,
      elevation: 0,
      borderWidth: 1,
      borderColor: darkColors.border,
    };
  }
  return standardShadow(level);
};

// Adaptive images
const imageStyle = {
  opacity: isDark ? 0.9 : 1,
  // Add subtle overlay for better contrast
  overlayColor: isDark ? 'rgba(0,0,0,0.1)' : 'transparent',
};
```

5. Transitions:
   - Smooth theme switching (300ms fade)
   - Persist user preference
   - Respect system settings by default
   - Add manual toggle in settings

FILES TO MODIFY:
- /app/constants/Colors.ts
- /app/hooks/useTheme.ts (create)
- /app/components/ThemeProvider.tsx (create)
- All component files for dark mode support

TESTING CHECKLIST:
✓ All text readable in both modes
✓ Interactive elements clearly visible
✓ No harsh contrast jumps
✓ Images and icons adapted
✓ Smooth transitions between modes
✓ Accessibility standards met

DELIVERABLE: Complete dark mode implementation with adaptive components
```

### Implementation Notes
- Avoids common dark mode pitfalls
- Provides specific color values
- Includes transition strategies
- Focuses on eye comfort

---

## 🚀 Quick Execution Commands

```bash
# Initialize Phase 1 with all agents
npx claude-flow sparc batch "orchestrator,designer,animator" "Execute Phase 1 Design Refonte using the provided prompts"

# Run specific refinements
npx claude-flow sparc run designer "Refactor Button component with personality and micro-interactions"
npx claude-flow sparc run animator "Implement core animation system"
npx claude-flow sparc run designer "Adapt all components for dark mode"

# Full pipeline execution
npx claude-flow sparc pipeline "Complete Phase 1: Design Refonte & Polish UI"
```

## 📊 Success Metrics

### Quantitative
- [ ] 60fps on all animations
- [ ] < 300ms interaction response time
- [ ] WCAG 2.1 AA compliance score
- [ ] Bundle size increase < 5%

### Qualitative
- [ ] No generic/template appearance
- [ ] Consistent design language throughout
- [ ] Delightful micro-interactions on all interactions
- [ ] Warm and inviting color usage
- [ ] Professional but not corporate feel

## 🎯 Phase 1 Completion Checklist

### Design Tokens
- [ ] Complete color system (light & dark)
- [ ] Typography scale implemented
- [ ] Spacing system (4px grid)
- [ ] Shadow/elevation system
- [ ] Animation timing constants

### Components
- [ ] Button - All variants with animations
- [ ] Card - Dimensional with interactions
- [ ] Input - Friendly with feedback
- [ ] Navigation - Smooth transitions
- [ ] Lists - Staggered animations
- [ ] Modals - Elegant presentation
- [ ] Loading states - Custom animations

### Polish
- [ ] Micro-interactions everywhere
- [ ] Dark mode fully supported
- [ ] Accessibility verified
- [ ] Performance optimized
- [ ] Documentation complete

---

*These prompts are optimized for immediate execution with Claude Code and the SPARC methodology. Each prompt provides specific, actionable instructions with clear success criteria.*