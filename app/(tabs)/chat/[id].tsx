import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowLeft, Send } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme-context';

type Message = {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  receiver_id: string;
  isFromMe: boolean;
};

export default function ChatScreen() {
  const { theme } = useTheme();
  const { id: receiverId } = useLocalSearchParams<{ id: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [receiverProfile, setReceiverProfile] = useState<{ username?: string; avatar_url?: string } | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!receiverId) return;
    
    let isMounted = true;
    
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !isMounted) return;
      
      setCurrentUserId(user.id);
      
      // Charger le profil du destinataire
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', receiverId)
        .single();
      
      if (isMounted) {
        setReceiverProfile(profile);
      }
      
      // Charger les messages
      const { data: msgs, error } = await supabase
        .from('direct_messages')
        .select('id, content, created_at, sender_id, receiver_id')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Erreur chargement messages:', error);
        return;
      }
      
      if (isMounted) {
        const mapped: Message[] = (msgs || []).map(msg => ({
          ...msg,
          isFromMe: msg.sender_id === user.id,
        }));
        setMessages(mapped);
        
        // Marquer les messages comme lus
        await supabase
          .from('direct_messages')
          .update({ read_at: new Date().toISOString() })
          .eq('sender_id', receiverId)
          .eq('receiver_id', user.id)
          .is('read_at', null);
      }
    })();

    // Écouter les nouveaux messages
    const channel = supabase
      .channel(`chat-${user?.id}-${receiverId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages',
        filter: `or(and(sender_id.eq.${user?.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user?.id}))`
      }, (payload) => {
        const newMsg = payload.new as any;
        if (isMounted) {
          setMessages(prev => [...prev, {
            ...newMsg,
            isFromMe: newMsg.sender_id === user?.id,
          }]);
          listRef.current?.scrollToEnd({ animated: true });
        }
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [receiverId]);

  async function sendMessage() {
    if (!text.trim() || !currentUserId || !receiverId) return;
    
    const { error } = await supabase
      .from('direct_messages')
      .insert({
        sender_id: currentUserId,
        receiver_id: receiverId,
        content: text.trim(),
      });
    
    if (error) {
      Alert.alert('Erreur', error.message);
      return;
    }
    
    setText('');
  }

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[
      styles.messageContainer,
      item.isFromMe ? styles.myMessage : styles.theirMessage
    ]}>
      <View style={[
        styles.messageBubble,
        item.isFromMe ? styles.myBubble : styles.theirBubble
      ]}>
        <Text style={[
          styles.messageText,
          item.isFromMe ? styles.myText : styles.theirText
        ]}>
          {item.content}
        </Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <Image 
          source={{ uri: receiverProfile?.avatar_url || 'https://placehold.co/100x100/png' }} 
          style={styles.headerAvatar} 
        />
        <Text style={styles.headerName}>
          {receiverProfile?.username || 'Utilisateur'}
        </Text>
      </View>

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesContainer}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={text}
          onChangeText={setText}
          placeholder="Tapez votre message..."
          placeholderTextColor="#9CA3AF"
          multiline
          maxLength={500}
        />
        <TouchableOpacity 
          style={[styles.sendButton, !text.trim() && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!text.trim()}
        >
          <Send size={20} color={text.trim() ? theme.color.brand[600] : '#9CA3AF'} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    // Hide custom in-screen header to rely on navigation blur header
    display: 'none',
  },
  backButton: {
    marginRight: 12,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  headerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  messagesContainer: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 12,
  },
  myMessage: {
    alignItems: 'flex-end',
  },
  theirMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  myBubble: {
    backgroundColor: '#2B2E78',
  },
  theirBubble: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  myText: {
    color: 'white',
  },
  theirText: {
    color: '#1F2937',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 12,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
