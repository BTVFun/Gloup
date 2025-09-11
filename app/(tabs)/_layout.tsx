import { Tabs } from 'expo-router';
import { Heart, BookOpen, MessageCircle, User } from 'lucide-react-native';
import { StyleSheet, View, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
import { useEffect, useRef } from 'react';
import { useTheme } from '@/lib/theme-context';
import { useHeaderScroll } from '@/hooks/useHeaderScroll';

export default function TabLayout() {
  const { theme } = useTheme();
  const { headerTranslateY, onScroll } = useHeaderScroll();

  return (
    <Tabs
      screenOptions={{
        headerShown: false, // We'll implement custom header
        headerTitle: 'Gloup',
        tabBarStyle: {
          backgroundColor: theme.surface.container,
          borderTopWidth: 0,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
          height: 84, // Slightly increased for better proportions
          paddingBottom: 20,
          paddingTop: 10,
        },
        tabBarActiveTintColor: theme.color.brand[600],
        tabBarInactiveTintColor: theme.text.muted,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Gloup',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[styles.tabIcon, focused && { backgroundColor: theme.color.brand[50] }]}>
              <Heart size={size} color={color} fill={focused ? color : 'transparent'} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="conseils"
        options={{
          title: 'Conseils',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[styles.tabIcon, focused && { backgroundColor: theme.color.brand[50] }]}>
              <BookOpen size={size} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[styles.tabIcon, focused && { backgroundColor: theme.color.brand[50] }]}>
              <MessageCircle size={size} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[styles.tabIcon, focused && { backgroundColor: theme.color.brand[50] }]}>
              <User size={size} color={color} />
            </View>
          ),
        }}
      />
      
      {/* Écrans cachés de la barre de navigation */}
      <Tabs.Screen
        name="create"
        options={{
          href: null, // Cache cet écran de la barre de navigation
        }}
      />
      <Tabs.Screen
        name="profile-edit"
        options={{
          href: null, // Cache cet écran de la barre de navigation
        }}
      />
      <Tabs.Screen
        name="create-group"
        options={{
          href: null, // Cache cet écran de la barre de navigation
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          href: null, // Cache cet écran de la barre de navigation
        }}
      />
      <Tabs.Screen
        name="group"
        options={{
          href: null, // Cache cet écran de la barre de navigation
        }}
      />
      <Tabs.Screen
        name="chat/[id]"
        options={{
          href: null, // Cache cet écran de la barre de navigation
        }}
      />
      <Tabs.Screen
        name="group/[id]"
        options={{
          href: null, // Cache cet écran de la barre de navigation
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    padding: 12, // Increased padding for better touch targets
    borderRadius: 16, // Adjusted to match design system
  },
});
