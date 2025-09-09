import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, MessageCircle, Users, Heart } from 'lucide-react-native';
import { useState } from 'react';

interface Conversation {
  id: string;
  user: {
    name: string;
    avatar: string;
    isOnline: boolean;
  };
  lastMessage: string;
  timestamp: string;
  unread: boolean;
}

interface Group {
  id: string;
  name: string;
  members: number;
  lastActivity: string;
  image: string;
  category: string;
}

const mockConversations: Conversation[] = [
  {
    id: '1',
    user: {
      name: 'Marie L.',
      avatar: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=150',
      isOnline: true,
    },
    lastMessage: 'Merci pour tes encouragements ! 🙏',
    timestamp: '2min',
    unread: true,
  },
  {
    id: '2',
    user: {
      name: 'Alex R.',
      avatar: 'https://images.pexels.com/photos/1674752/pexels-photo-1674752.jpeg?auto=compress&cs=tinysrgb&w=150',
      isOnline: false,
    },
    lastMessage: 'Tu as des conseils pour la méditation ?',
    timestamp: '1h',
    unread: false,
  },
  {
    id: '3',
    user: {
      name: 'Sarah K.',
      avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150',
      isOnline: true,
    },
    lastMessage: 'J\'ai adoré ton post sur le yoga !',
    timestamp: '3h',
    unread: false,
  },
];

const mockGroups: Group[] = [
  {
    id: '1',
    name: 'Yoga & Méditation',
    members: 248,
    lastActivity: '15min',
    image: 'https://images.pexels.com/photos/317157/pexels-photo-317157.jpeg?auto=compress&cs=tinysrgb&w=150',
    category: 'Mental',
  },
  {
    id: '2',
    name: 'Fitness Motivation',
    members: 592,
    lastActivity: '32min',
    image: 'https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=150',
    category: 'Sport',
  },
  {
    id: '3',
    name: 'Style & Confiance',
    members: 324,
    lastActivity: '1h',
    image: 'https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg?auto=compress&cs=tinysrgb&w=150',
    category: 'Style',
  },
];

export default function MessagesScreen() {
  const [activeTab, setActiveTab] = useState<'messages' | 'groups'>('messages');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#8B5CF6', '#3B82F6']}
        style={styles.header}
      >
        <Text style={styles.title}>Messages</Text>
        <Text style={styles.subtitle}>Connectez-vous avec la communauté</Text>
        
        <View style={styles.searchContainer}>
          <Search size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher des conversations..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </LinearGradient>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'messages' && styles.activeTab]}
          onPress={() => setActiveTab('messages')}
        >
          <MessageCircle size={20} color={activeTab === 'messages' ? '#8B5CF6' : '#6B7280'} />
          <Text style={[styles.tabText, activeTab === 'messages' && styles.activeTabText]}>
            Messages
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'groups' && styles.activeTab]}
          onPress={() => setActiveTab('groups')}
        >
          <Users size={20} color={activeTab === 'groups' ? '#8B5CF6' : '#6B7280'} />
          <Text style={[styles.tabText, activeTab === 'groups' && styles.activeTabText]}>
            Groupes
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'messages' ? (
          <>
            {mockConversations.map((conversation) => (
              <TouchableOpacity key={conversation.id} style={styles.conversationItem}>
                <View style={styles.avatarContainer}>
                  <Image source={{ uri: conversation.user.avatar }} style={styles.avatar} />
                  {conversation.user.isOnline && <View style={styles.onlineIndicator} />}
                </View>
                
                <View style={styles.conversationContent}>
                  <View style={styles.conversationHeader}>
                    <Text style={styles.userName}>{conversation.user.name}</Text>
                    <Text style={styles.timestamp}>{conversation.timestamp}</Text>
                  </View>
                  <Text style={[styles.lastMessage, conversation.unread && styles.unreadMessage]}>
                    {conversation.lastMessage}
                  </Text>
                </View>
                
                {conversation.unread && <View style={styles.unreadBadge} />}
              </TouchableOpacity>
            ))}
            
            <View style={styles.emptyState}>
              <Heart size={48} color="#E5E7EB" />
              <Text style={styles.emptyStateTitle}>Plus de conversations à venir</Text>
              <Text style={styles.emptyStateText}>
                Interagissez avec des posts pour commencer de nouvelles conversations !
              </Text>
            </View>
          </>
        ) : (
          <>
            {mockGroups.map((group) => (
              <TouchableOpacity key={group.id} style={styles.groupItem}>
                <Image source={{ uri: group.image }} style={styles.groupImage} />
                
                <View style={styles.groupContent}>
                  <View style={styles.groupHeader}>
                    <Text style={styles.groupName}>{group.name}</Text>
                    <Text style={styles.categoryBadge}>{group.category}</Text>
                  </View>
                  <Text style={styles.groupInfo}>
                    {group.members} membres • Actif il y a {group.lastActivity}
                  </Text>
                </View>
                
                <View style={styles.joinButton}>
                  <Text style={styles.joinButtonText}>Rejoindre</Text>
                </View>
              </TouchableOpacity>
            ))}
            
            <View style={styles.createGroupCard}>
              <LinearGradient
                colors={['#F59E0B', '#F97316']}
                style={styles.createGroupGradient}
              >
                <Users size={32} color="white" />
                <Text style={styles.createGroupTitle}>Créer un groupe</Text>
                <Text style={styles.createGroupText}>
                  Rassemblez des personnes autour de vos passions
                </Text>
                <TouchableOpacity style={styles.createGroupButton}>
                  <Text style={styles.createGroupButtonText}>Commencer</Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </>
        )}
      </ScrollView>
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
    paddingBottom: 20,
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
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: '100%',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: 'white',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: -10,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#F3F4F6',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    color: '#6B7280',
  },
  activeTabText: {
    color: '#8B5CF6',
  },
  content: {
    flex: 1,
    padding: 16,
    marginTop: 16,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    backgroundColor: '#10B981',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'white',
  },
  conversationContent: {
    flex: 1,
    marginLeft: 12,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  timestamp: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  lastMessage: {
    fontSize: 14,
    color: '#6B7280',
  },
  unreadMessage: {
    color: '#1F2937',
    fontWeight: '500',
  },
  unreadBadge: {
    width: 8,
    height: 8,
    backgroundColor: '#8B5CF6',
    borderRadius: 4,
    marginLeft: 8,
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  groupImage: {
    width: 50,
    height: 50,
    borderRadius: 12,
  },
  groupContent: {
    flex: 1,
    marginLeft: 12,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginRight: 8,
  },
  categoryBadge: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8B5CF6',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  groupInfo: {
    fontSize: 14,
    color: '#6B7280',
  },
  joinButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  joinButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  createGroupCard: {
    marginTop: 20,
    marginBottom: 20,
  },
  createGroupGradient: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  createGroupTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 12,
    marginBottom: 8,
  },
  createGroupText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 16,
  },
  createGroupButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  createGroupButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});