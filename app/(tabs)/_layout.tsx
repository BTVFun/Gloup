import { Tabs } from 'expo-router';
import { Heart, BookOpen, MessageCircle, User, Plus } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 0,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
          height: 80,
          paddingBottom: 20,
          paddingTop: 10,
        },
        tabBarActiveTintColor: '#8B5CF6',
        tabBarInactiveTintColor: '#9CA3AF',
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
          title: 'Glow',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[styles.tabIcon, focused && styles.activeTab]}>
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
            <View style={[styles.tabIcon, focused && styles.activeTab]}>
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
            <View style={[styles.tabIcon, focused && styles.activeTab]}>
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
            <View style={[styles.tabIcon, focused && styles.activeTab]}>
              <User size={size} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: 'Créer',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[styles.tabIcon, focused && styles.activeTab]}>
              <Plus size={size} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    padding: 8,
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: '#F3F4F6',
  },
});