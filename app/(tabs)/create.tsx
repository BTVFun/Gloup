import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera, Image as ImageIcon, Type, Crown, Shirt, Dumbbell, Brain, Shield, Sparkles } from 'lucide-react-native';
import { useState } from 'react';

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

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient
        colors={['#8B5CF6', '#3B82F6']}
        style={styles.header}
      >
        <Text style={styles.title}>Créer</Text>
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
            <View style={styles.mediaPlaceholder}>
              <Camera size={48} color="#9CA3AF" />
              <Text style={styles.mediaPlaceholderText}>
                {postType === 'photo' ? 'Prendre une photo' : 'Enregistrer une vidéo'}
              </Text>
              <TouchableOpacity style={styles.mediaButton}>
                <Text style={styles.mediaButtonText}>Choisir depuis la galerie</Text>
              </TouchableOpacity>
            </View>
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
        />

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

        <View style={styles.privacySection}>
          <Text style={styles.sectionTitle}>Confidentialité</Text>
          <View style={styles.privacyOptions}>
            <TouchableOpacity style={[styles.privacyOption, styles.activePrivacy]}>
              <Text style={styles.activePrivacyText}>🌍 Public</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.privacyOption}>
              <Text style={styles.privacyText}>👥 Abonnés</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.privacyOption}>
              <Text style={styles.privacyText}>🔒 Amis</Text>
            </TouchableOpacity>
          </View>
        </View>

        <LinearGradient
          colors={['#8B5CF6', '#3B82F6']}
          style={styles.publishButton}
        >
          <TouchableOpacity style={styles.publishButtonInner}>
            <Text style={styles.publishButtonText}>Publier votre Glow ✨</Text>
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
  mediaPlaceholderText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
    marginBottom: 16,
  },
  mediaButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  mediaButtonText: {
    color: 'white',
    fontSize: 14,
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
  privacySection: {
    marginTop: 20,
  },
  privacyOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  privacyOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 12,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activePrivacy: {
    borderColor: '#8B5CF6',
    backgroundColor: '#F3F4F6',
  },
  privacyText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  activePrivacyText: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '600',
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