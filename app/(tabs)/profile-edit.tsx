import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';

export default function ProfileEditScreen() {
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', user.id).single();
      setFullName(data?.full_name ?? '');
      setAvatarUrl(data?.avatar_url ?? null);
    })();
  }, []);

  async function pickAvatar() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert('Permission', 'Autorisez la galerie.');
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.9 });
    if (!res.canceled) setAsset(res.assets[0]);
  }

  async function save() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    try {
      setSaving(true);
      let newAvatarUrl = avatarUrl ?? undefined;
      if (asset) {
        const path = `${user.id}/avatar-${Date.now()}-${asset.fileName ?? 'avatar'}`;
        const resp = await fetch(asset.uri);
        const blob = await resp.blob();
        const { error: upErr } = await supabase.storage.from('avatars').upload(path, blob, {
          contentType: asset.mimeType ?? 'image/jpeg', upsert: true,
        });
        if (upErr) throw upErr;
        const { data } = supabase.storage.from('avatars').getPublicUrl(path);
        newAvatarUrl = data.publicUrl;
      }

      const { error: updErr } = await supabase
        .from('profiles')
        .update({ full_name: fullName, avatar_url: newAvatarUrl })
        .eq('id', user.id);
      if (updErr) throw updErr;
      Alert.alert('Profil', 'Profil mis à jour');
      router.back();
    } catch (e: any) {
      Alert.alert('Erreur', e.message ?? 'Échec de mise à jour');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#8B5CF6", "#3B82F6"]} style={styles.header}>
        <Text style={styles.title}>Modifier le profil</Text>
      </LinearGradient>
      <View style={styles.content}>
        <TouchableOpacity style={styles.avatarWrap} onPress={pickAvatar}>
          {asset ? (
            <Image source={{ uri: asset.uri }} style={styles.avatar} />
          ) : (
            <Image source={{ uri: avatarUrl ?? 'https://placehold.co/200x200/png' }} style={styles.avatar} />
          )}
          <Text style={styles.avatarHint}>Changer l'avatar</Text>
        </TouchableOpacity>
        <Text style={styles.label}>Nom complet</Text>
        <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="Votre nom" placeholderTextColor="#9CA3AF" />
        <LinearGradient colors={["#8B5CF6", "#3B82F6"]} style={styles.btnGradient}>
          <TouchableOpacity style={styles.button} onPress={save} disabled={saving}>
            <Text style={styles.buttonText}>{saving ? 'Sauvegarde…' : 'Enregistrer'}</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingTop: 60, paddingBottom: 20, alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', color: 'white' },
  content: { padding: 16 },
  avatarWrap: { alignItems: 'center', marginBottom: 16 },
  avatar: { width: 120, height: 120, borderRadius: 60 },
  avatarHint: { color: '#6B7280', marginTop: 8 },
  label: { fontWeight: '600', color: '#1F2937', marginBottom: 6 },
  input: { backgroundColor: 'white', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 12 },
  btnGradient: { borderRadius: 12, marginTop: 8 },
  button: { paddingVertical: 14, alignItems: 'center' },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});

