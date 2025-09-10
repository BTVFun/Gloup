import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, Alert, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';

export default function ProfileEditScreen() {
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('full_name, bio, avatar_url')
        .eq('id', user.id)
        .single();
      setFullName(data?.full_name ?? '');
      setBio(data?.bio ?? '');
      setAvatarUrl(data?.avatar_url ?? null);
    })();
  }, []);

  async function pickAvatar() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert('Permission', 'Autorisez l\'accès à la galerie.');
    const res = await ImagePicker.launchImageLibraryAsync({ 
      mediaTypes: ImagePicker.MediaTypeOptions.Images, 
      quality: 0.9,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!res.canceled) setAsset(res.assets[0]);
  }

  async function save() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    try {
      setSaving(true);
      let newAvatarUrl = avatarUrl;
      
      if (asset) {
        const fileExt = asset.uri.split('.').pop()?.toLowerCase();
        const fileName = `avatar-${Date.now()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;
        
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, blob, {
            contentType: asset.mimeType ?? 'image/jpeg',
            upsert: false,
          });
        
        if (uploadError) throw uploadError;
        
        const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
        newAvatarUrl = data.publicUrl;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          full_name: fullName.trim() || null,
          bio: bio.trim() || null,
          avatar_url: newAvatarUrl 
        })
        .eq('id', user.id);
        
      if (updateError) throw updateError;
      
      Alert.alert('Succès', 'Profil mis à jour avec succès !', [
        { text: 'OK', onPress: () => router.back() }
      ]);
      
    } catch (e: any) {
      Alert.alert('Erreur', e.message ?? 'Échec de la mise à jour');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={["#8B5CF6", "#3B82F6"]} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.title}>Modifier le profil</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>
      
      <View style={styles.content}>
        <View style={styles.avatarSection}>
          <TouchableOpacity style={styles.avatarContainer} onPress={pickAvatar}>
            {asset ? (
              <Image source={{ uri: asset.uri }} style={styles.avatar} />
            ) : (
              <Image source={{ uri: avatarUrl ?? 'https://placehold.co/200x200/png' }} style={styles.avatar} />
            )}
            <View style={styles.cameraOverlay}>
              <Camera size={24} color="white" />
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Appuyez pour changer la photo</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Nom complet</Text>
          <TextInput 
            style={styles.input} 
            value={fullName} 
            onChangeText={setFullName} 
            placeholder="Votre nom complet" 
            placeholderTextColor="#9CA3AF"
            maxLength={50}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Bio</Text>
          <TextInput 
            style={[styles.input, styles.textArea]} 
            value={bio} 
            onChangeText={setBio} 
            placeholder="Parlez-nous de vous..." 
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            maxLength={200}
            textAlignVertical="top"
          />
          <Text style={styles.characterCount}>{bio.length}/200</Text>
        </View>

        <LinearGradient colors={["#8B5CF6", "#3B82F6"]} style={styles.saveButton}>
          <TouchableOpacity style={styles.saveButtonInner} onPress={save} disabled={saving}>
            <Text style={styles.saveButtonText}>
              {saving ? 'Sauvegarde...' : 'Enregistrer les modifications'}
            </Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8FAFC' 
  },
  header: { 
    paddingTop: 60, 
    paddingBottom: 30, 
    paddingHorizontal: 20 
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: 'white' 
  },
  content: { 
    padding: 20 
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: { 
    width: 120, 
    height: 120, 
    borderRadius: 60,
    borderWidth: 4,
    borderColor: 'white',
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  avatarHint: { 
    color: '#6B7280', 
    fontSize: 14,
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  label: { 
    fontWeight: '600', 
    color: '#1F2937', 
    marginBottom: 8,
    fontSize: 16,
  },
  input: { 
    backgroundColor: 'white', 
    borderRadius: 12, 
    padding: 16, 
    fontSize: 16,
    borderWidth: 1, 
    borderColor: '#E5E7EB',
    color: '#1F2937',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
    marginTop: 4,
  },
  saveButton: { 
    borderRadius: 12, 
    marginTop: 20,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonInner: { 
    paddingVertical: 16, 
    alignItems: 'center' 
  },
  saveButtonText: { 
    color: 'white', 
    fontSize: 18, 
    fontWeight: 'bold' 
  },
});