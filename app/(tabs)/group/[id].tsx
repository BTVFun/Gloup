import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';

type Msg = {
  id: string;
  content: string;
  created_at: string;
  sender: { username?: string | null; avatar_url?: string | null } | null;
};

export default function GroupChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!id) return;
    let isMounted = true;
    (async () => {
      const { data, error } = await supabase
        .from('group_messages')
        .select('id, content, created_at, profiles:sender_id ( username, avatar_url )')
        .eq('group_id', id)
        .order('created_at', { ascending: true });
      if (!isMounted) return;
      if (error) { console.error(error); return; }
      const mapped: Msg[] = (data ?? []).map((m: any) => ({
        id: m.id,
        content: m.content,
        created_at: m.created_at,
        sender: m.profiles ?? null,
      }));
      setMessages(mapped);
    })();

    const ch = supabase
      .channel(`grp-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_messages', filter: `group_id=eq.${id}` }, payload => {
        const m: any = payload.new;
        // On n'a pas le profil joint dans l'event, on ajoute minimalement
        setMessages(prev => [...prev, { id: m.id, content: m.content, created_at: m.created_at, sender: null }]);
        listRef.current?.scrollToEnd({ animated: true });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); isMounted = false; };
  }, [id]);

  async function send() {
    if (!text.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Alert.alert('Connexion requise');
    const { error } = await supabase.from('group_messages').insert({ group_id: id, sender_id: user.id, content: text.trim() });
    if (error) return Alert.alert('Erreur', error.message);
    setText('');
  }

  const renderItem = ({ item }: { item: Msg }) => (
    <View style={styles.msgRow}>
      <Image source={{ uri: item.sender?.avatar_url ?? 'https://placehold.co/48x48/png' }} style={styles.avatar} />
      <View style={styles.msgBubble}>
        {!!item.sender?.username && <Text style={styles.sender}>{item.sender?.username}</Text>}
        <Text style={styles.msgText}>{item.content}</Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingKeyboardWrapper>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 12 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      />
      <View style={styles.inputRow}>
        <TextInput style={styles.input} value={text} onChangeText={setText} placeholder="Votre message" placeholderTextColor="#9CA3AF" />
        <TouchableOpacity style={styles.sendBtn} onPress={send}>
          <Text style={{ color: 'white', fontWeight: '700' }}>Envoyer</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingKeyboardWrapper>
  );
}

function KeyboardAvoidingKeyboardWrapper({ children }: { children: React.ReactNode }) {
  if (Platform.OS === 'ios') {
    return <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">{children}</KeyboardAvoidingView>;
  }
  return <View style={{ flex: 1 }}>{children}</View>;
}

const styles = StyleSheet.create({
  msgRow: { flexDirection: 'row', marginBottom: 10, alignItems: 'flex-start' },
  avatar: { width: 36, height: 36, borderRadius: 18, marginRight: 8 },
  msgBubble: { backgroundColor: '#fff', borderRadius: 12, padding: 10, flexShrink: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  sender: { fontSize: 12, color: '#6B7280', marginBottom: 2 },
  msgText: { fontSize: 15, color: '#1F2937' },
  inputRow: { flexDirection: 'row', padding: 8, borderTopWidth: 1, borderTopColor: '#E5E7EB', backgroundColor: 'white' },
  input: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 10, marginRight: 8 },
  sendBtn: { backgroundColor: '#8B5CF6', borderRadius: 20, paddingHorizontal: 16, justifyContent: 'center' },
});

