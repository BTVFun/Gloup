import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, MessageCircle, Users, Heart, Plus } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';

interface DirectMessage {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  receiver_id: string;
  read_at: string | null;
  sender?: { username?: string; avatar_url?: string };
  receiver?: { username?: string; avatar_url?: string };
}

interface Group {
  id: string;
  name: string;
  members: number;
  lastActivity: string;
  image: string;
  category: string;
}

interface Conversation {
  id: string;
  user: {
    id: string;
    name: string;
    avatar: string;
    isOnline: boolean;
  };
  lastMessage: string;
  timestamp: string;
  unread: boolean;
}

const mockGroups: Group[] = [];

export default function MessagesScreen() {
  const [activeTab, setActiveTab] = useState<'messages' | 'groups'>('messages');
  const [searchQuery, setSearchQuery] = useState('');
  const [groups, setGroups] = useState<Group[]>(mockGroups);
  const [memberships, setMemberships] = useState<Record<string, boolean>>({});
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  async function loadGroups() {
    const { data: list, error } = await supabase.from('groups').select('id, name, category, image_url');
    if (error) { console.error(error); return; }
    // Count members per group (approx v1)
    const ids = list.map(g => g.id);
    const { data: gm } = await supabase.from('group_members').select('group_id').in('group_id', ids);
    const counts: Record<string, number> = {};
    gm?.forEach(m => { counts[m.group_id] = (counts[m.group_id] ?? 0) + 1; });
    const mapped: Group[] = list.map(g => ({
      id: g.id,
      name: g.name,
      category: g.category ?? '',
      image: g.image_url ?? 'https://placehold.co/100x100/png',
      members: counts[g.id] ?? 0,
      lastActivity: '—',
    }));
    setGroups(mapped);

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: my } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);
      const map: Record<string, boolean> = {};
      my?.forEach(m => { map[m.group_id] = true; });
      setMemberships(map);
    }
  }

  async function loadConversations() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Récupérer les derniers messages pour chaque conversation
    const { data: messages, error } = await supabase
      .from('direct_messages')
      .select(`
        id, content, created_at, sender_id, receiver_id, read_at,
        sender:profiles!direct_messages_sender_id_fkey(username, avatar_url),
        receiver:profiles!direct_messages_receiver_id_fkey(username, avatar_url)
      `)
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur chargement conversations:', error);
      return;
    }

    // Grouper par conversation et garder le dernier message
    const conversationMap = new Map<string, DirectMessage>();
    messages?.forEach((msg: any) => {
      const otherUserId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
      if (!conversationMap.has(otherUserId)) {
        conversationMap.set(otherUserId, msg);
      }
    });

    const convs: Conversation[] = Array.from(conversationMap.values()).map((msg: any) => {
      const isFromMe = msg.sender_id === user.id;
      const otherUser = isFromMe ? msg.receiver : msg.sender;
      return {
        id: isFromMe ? msg.receiver_id : msg.sender_id,
        user: {
          id: isFromMe ? msg.receiver_id : msg.sender_id,
          name: otherUser?.username || 'Utilisateur',
          avatar: otherUser?.avatar_url || 'https://placehold.co/100x100/png',
          isOnline: false,
        },
        lastMessage: msg.content,
        timestamp: timeSince(new Date(msg.created_at)),
        unread: !isFromMe && !msg.read_at,
      };
    });

    setConversations(convs);
  }

  useEffect(() => { loadGroups(); }, []);
  useEffect(() => { loadConversations(); }, []);

  useEffect(() => {
    const ch = supabase
      .channel('grp-list-activity')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_messages' }, (payload) => {
        const gId = (payload.new as any).group_id as string;
        setGroups(prev => prev.map(g => g.id === gId ? { ...g, lastActivity: "à l'instant" } : g));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function join(groupId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Alert.alert('Connexion requise', 'Veuillez vous connecter.');
    const { error } = await supabase.from('group_members').insert({ group_id: groupId, user_id: user.id });
    if (error && (error as any).code !== '23505') return Alert.alert('Erreur', error.message);
    setMemberships(prev => ({ ...prev, [groupId]: true }));
  }

  async function createGroup(name: string, category: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Alert.alert('Connexion requise');
    
    const { data: group, error } = await supabase
      .from('groups')
      .insert({ name, category, created_by: user.id })
      .select()
      .single();
    
    if (error) return Alert.alert('Erreur', error.message);
    
    // Rejoindre automatiquement le groupe créé
    await supabase.from('group_members').insert({ group_id: group.id, user_id: user.id, role: 'admin' });
    
    loadGroups();
    setShowCreateGroup(false);
  }

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
            {conversations.map((conversation) => (
              <TouchableOpacity key={conversation.id} style={styles.conversationItem} onPress={() => router.push({ pathname: '/(tabs)/chat/[id]', params: { id: conversation.user.id } } as any)}>
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
            
            {conversations.length === 0 && (
              <View style={styles.emptyState}>
                <Heart size={48} color="#E5E7EB" />
                <Text style={styles.emptyStateTitle}>Aucune conversation</Text>
                <Text style={styles.emptyStateText}>
                  Interagissez avec des posts pour commencer de nouvelles conversations !
                </Text>
              </View>
            )}
          </>
        ) : (
          <>
            <TouchableOpacity 
              style={styles.createGroupCard}
              onPress={() => router.push('/(tabs)/create-group' as any)}
            >
              <LinearGradient
                colors={['#F59E0B', '#F97316']}
                style={styles.createGroupGradient}
              >
                <Users size={32} color="white" />
                <Text style={styles.createGroupTitle}>Créer un groupe</Text>
                <Text style={styles.createGroupText}>
                  Rassemblez des personnes autour de vos passions
                </Text>
                <View style={styles.createGroupButton}>
                  <Text style={styles.createGroupButtonText}>Commencer</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {groups.map((group) => (
              <TouchableOpacity key={group.id} style={styles.groupItem} onPress={() => router.push({ pathname: '/(tabs)/group/[id]', params: { id: group.id } } as any)}>
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
                
                {memberships[group.id] ? (
                  <View style={[styles.joinButton, { backgroundColor: '#10B981' }]}>
                    <Text style={styles.joinButtonText}>Membre</Text>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.joinButton} onPress={() => join(group.id)}>
                    <Text style={styles.joinButtonText}>Rejoindre</Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            ))}
            
            <TouchableOpacity 
              style={styles.createGroupCard}
              onPress={() => {
                setShowCreateGroup(true);
              }}
            >
            </TouchableOpacity>
          </>
              }}
            >
            </TouchableOpacity>
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
    borderRadius: 12,
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

function timeSince(date: Date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  const intervals: [number, string][] = [[3600*24, 'j'], [3600, 'h'], [60, 'min']];
  for (const [s, label] of intervals) {
    const v = Math.floor(seconds / s);
    if (v >= 1) return `${v}${label}`;
  }
  return `${seconds}s`;
}
