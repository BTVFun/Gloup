import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Image, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera, Image as ImageIcon, Type, Crown, Shirt, Dumbbell, Brain, Shield, Sparkles, ArrowLeft } from 'lucide-react-native';
import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';

const glowCategories = [
  { id: 'couronne', icon: Crown, title: 'Moment de fierté', color: '#FFD700' },
  { id: 'vetements', icon: Shirt, title: 'Style & Look', color: '#8B5CF6' },
  { id: 'sport', icon: Dumbbell, title: 'Sport & Forme', color: '#EF4444' },
  { id: 'mental', icon: Brain, title: 'Bien-être mental', color: '#10B981' },
  { id: 'confiance', icon: Shield, title: 'Confiance en soi', color: '#F59E0B' },
  { id: 'soins', icon: Sparkles, title: 'Soins & Beauté', color: '#EC4899' },
];

export default function CreateScreen() {
  const [postType, setPostType] = useState<'photo' | 'video' | 'text'>('photo');
  const [content, setContent] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [uploading, setUploading] = useState(false);

  async function chooseMedia() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert('Permission', 'Autorisez l'accès à la galerie.');
    const res = await ImagePicker.launchImageLibraryAsync({ 
      mediaTypes: ImagePicker.MediaTypeOptions.All, 
      quality: 0.9,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!res.canceled) setAsset(res.assets[0]);
  }

  async function publish() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Alert.alert('Connexion requise', 'Veuillez vous connecter.');
    if (!selectedCategory) return Alert.alert('Catégorie', 'Choisissez une catégorie.');
    if (!content.trim() && !asset) return Alert.alert('Contenu', 'Ajoutez du contenu ou une image.');
    
    try {
      setUploading(true);
      let media_url: string | undefined;
      let media_kind: 'photo' | 'video' | 'none' = 'none';
      
      if (asset && postType !== 'text') {
        const fileExt = asset.uri.split('.').pop()?.toLowerCase();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;
        
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        
        const { error: uploadError } = await supabase.storage
          .from('posts')
          .upload(filePath, blob, {
            contentType: asset.mimeType ?? (postType === 'video' ? 'video/mp4' : 'image/jpeg'),
            upsert: false,
          });
        
        if (uploadError) throw uploadError;
        
        const { data } = supabase.storage.from('posts').getPublicUrl(filePath);
        media_url = data.publicUrl;
        media_kind = postType === 'video' ? 'video' : 'photo';
      }

      const { error: insertError } = await supabase.from('posts').insert({
        author_id: user.id,
        content: content.trim() || null,
        media_url,
        media_kind,
        category: selectedCategory,
        privacy: 'public',
      });
      
      if (insertError) throw insertError;
      
      Alert.alert('Publié !', 'Votre Glow a été publié avec succès ✨', [
        { text: 'OK', onPress: () => router.back() }
      ]);
      
      // Reset form
      setContent('');
      setAsset(null);
      setSelectedCategory(null);
      
    } catch (e: any) {
      Alert.alert('Erreur', e.message ?? 'Échec de la publication');
    } finally {
      setUploading(false);
    }
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient
        colors={['#8B5CF6', '#3B82F6']}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.title}>Créer</Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={styles.subtitle}>Partagez votre glow moment</Text>
      </LinearGradient>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Type de contenu</Text>
        <View style={styles.postTypeContainer}>
          <TouchableOpacity
            style={[styles.postTypeButton, postType === 'photo' && styles.activePostType]}
            onPress={() => setPostType('photo')}
          >
            <Camera size={24} color={postType === 'photo' ? '#8B5CF6' : '#6B7280'} />
            <Text style={[styles.postTypeText, postType === 'photo' && styles.activePostTypeText]}>
              Photo
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.postTypeButton, postType === 'video' && styles.activePostType]}
            onPress={() => setPostType('video')}
          >
            <ImageIcon size={24} color={postType === 'video' ? '#8B5CF6' : '#6B7280'} />
            <Text style={[styles.postTypeText, postType === 'video' && styles.activePostTypeText]}>
              Vidéo
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.postTypeButton, postType === 'text' && styles.activePostType]}
            onPress={() => setPostType('text')}
          >
            <Type size={24} color={postType === 'text' ? '#8B5CF6' : '#6B7280'} />
            <Text style={[styles.postTypeText, postType === 'text' && styles.activePostTypeText]}>
              Texte
            </Text>
          </TouchableOpacity>
        </View>

        {postType !== 'text' && (
          <View style={styles.mediaSection}>
            <TouchableOpacity style={styles.mediaPlaceholder} onPress={chooseMedia}>
              {asset ? (
                <Image source={{ uri: asset.uri }} style={styles.mediaPreview} />
              ) : (
                <>
                  <Camera size={48} color="#9CA3AF" />
                  <Text style={styles.mediaPlaceholderText}>
                    {postType === 'photo' ? 'Ajouter une photo' : 'Ajouter une vidéo'}
                  </Text>
                  <Text style={styles.mediaButtonText}>Appuyez pour choisir</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.sectionTitle}>Votre message</Text>
        <TextInput
          style={styles.textInput}
          multiline
          numberOfLines={6}
          placeholder="Partagez votre moment de glow, vos progrès, ou ce qui vous rend fier/fière aujourd'hui..."
          placeholderTextColor="#9CA3AF"
          value={content}
          onChangeText={setContent}
          textAlignVertical="top"
          maxLength={500}
        />
        <Text style={styles.characterCount}>{content.length}/500</Text>

        <Text style={styles.sectionTitle}>Catégorie de votre glow</Text>
        <View style={styles.categoriesContainer}>
          {glowCategories.map((category) => {
            const IconComponent = category.icon;
            const isSelected = selectedCategory === category.id;
            
            return (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryChip,
                  isSelected && { backgroundColor: category.color + '20', borderColor: category.color }
                ]}
                onPress={() => setSelectedCategory(isSelected ? null : category.id)}
              >
                <IconComponent 
                  size={20} 
                  color={isSelected ? category.color : '#6B7280'} 
                />
                <Text style={[
                  styles.categoryChipText,
                  isSelected && { color: category.color }
                ]}>
                  {category.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <LinearGradient
          colors={['#8B5CF6', '#3B82F6']}
          style={styles.publishButton}
        >
          <TouchableOpacity 
            style={styles.publishButtonInner} 
            onPress={publish} 
            disabled={uploading}
          >
            <Text style={styles.publishButtonText}>
              {uploading ? 'Publication…' : 'Publier votre Glow ✨'}
            </Text>
          </TouchableOpacity>
        </LinearGradient>

        <Text style={styles.tipsText}>
          💡 Astuce : Les posts authentiques et positifs reçoivent plus de réactions bienveillantes !
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
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
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
    textAlign: 'center',
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
    marginTop: 20,
  },
  postTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  postTypeButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    borderRadius: 12,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  activePostType: {
    borderColor: '#8B5CF6',
    backgroundColor: '#F3F4F6',
  },
  postTypeText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activePostTypeText: {
    color: '#8B5CF6',
  },
  mediaSection: {
    marginBottom: 20,
  },
  mediaPlaceholder: {
    height: 200,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  mediaPlaceholderText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
    marginBottom: 8,
  },
  mediaButtonText: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 120,
  },
  characterCount: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
    marginTop: 4,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  categoryChipText: {
    fontSize: 14,
    marginLeft: 6,
    color: '#6B7280',
    fontWeight: '500',
  },
  publishButton: {
    marginTop: 32,
    borderRadius: 12,
  },
  publishButtonInner: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  publishButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  tipsText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#6B7280',
    marginTop: 16,
    paddingHorizontal: 20,
    fontStyle: 'italic',
  },
});