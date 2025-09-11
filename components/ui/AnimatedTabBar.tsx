import React from 'react';
import { View, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Heart, BookOpen, MessageCircle, User } from 'lucide-react-native';
import { useTheme } from '@/lib/theme-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface AnimatedTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
  translateY: Animated.Value;
}

export function AnimatedTabBar({ state, descriptors, navigation, translateY }: AnimatedTabBarProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  // Debug: Log routes to identify visibility issues
  console.log('All routes:', state.routes.map((r: any) => ({ name: r.name, href: descriptors[r.key]?.options?.href })));

  const getTabIcon = (routeName: string, focused: boolean) => {
    const iconProps = {
      size: 24,
      color: focused ? theme.color.brand[600] : theme.text.muted,
    };

    switch (routeName) {
      case 'index':
        return <Heart {...iconProps} fill={focused ? iconProps.color : 'transparent'} />;
      case 'conseils':
        return <BookOpen {...iconProps} />;
      case 'messages':
        return <MessageCircle {...iconProps} />;
      case 'profile':
        return <User {...iconProps} />;
      default:
        return null;
    }
  };

  return (
    <Animated.View 
      style={[
        styles.tabBar,
        {
          backgroundColor: theme.surface.container,
          paddingBottom: insets.bottom + 20,
          transform: [{ translateY }],
        }
      ]}
    >
      {state.routes.filter((route: any) => {
        const { options } = descriptors[route.key];
        // Only show routes that don't have href: null
        return options.href !== null;
      }).map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            style={[
              styles.tabItem,
              isFocused && { backgroundColor: theme.color.brand[50] }
            ]}
          >
            {getTabIcon(route.name, isFocused)}
          </TouchableOpacity>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    borderTopWidth: 0,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    paddingTop: 10,
    paddingHorizontal: 16,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 16,
  },
});