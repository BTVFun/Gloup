import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Users, Hash, Plus } from 'lucide-react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';

const categories = [
  'Sport & Fitness',
  'Bien-être mental',
  'Style & Mode',
  'Nutrition',
  'Développement personnel',
  'Soins & Beauté',
  'Motivation',
  'Autre'
];

export default function CreateGroupScreen() {
  const [name, setName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [creating, setCreating] = useState(false);

  async function createGroup() {
    if (!name.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un nom pour le groupe');
      return;
    }
    
    if (!selectedCategory) {
      Alert.alert('Erreur', 'Veuillez sélectionner une catégorie');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert('Connexion requise', 'Veuillez vous connecter');
      return;
    }

    try {
      setCreating(true);
      
      // Créer le groupe
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert({
          name: name.trim(),
          category: selectedCategory,
          created_by: user.id,
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Rejoindre automatiquement le groupe en tant qu'admin
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: group.id,
          user_id: user.id,
          role: 'admin',
        });

      if (memberError) throw memberError;

      Alert.alert(
        'Groupe créé !',
        `Le groupe "${name}" a été créé avec succès.`,
        [
          {
            text: 'OK',
            onPress: () => {
              router.back();
              router.push({ pathname: '/(tabs)/group/[id]', params: { id: group.id } } as any);
            }
          }
        ]
      );
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible de créer le groupe');
    } finally {
      setCreating(false);
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
          <Text style={styles.title}>Créer un groupe</Text>
          <View style={{ width: 24 }} />
        </View>
        <Text style={styles.subtitle}>Rassemblez une communauté autour de vos passions</Text>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.label}>Nom du groupe *</Text>
          <View style={styles.inputContainer}>
            <Hash size={20} color="#6B7280" />
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Ex: Motivation Matinale"
              placeholderTextColor="#9CA3AF"
              maxLength={50}
            />
          </View>
          <Text style={styles.helperText}>{name.length}/50 caractères</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Catégorie *</Text>
          <View style={styles.categoriesContainer}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryChip,
                  selectedCategory === category && styles.selectedCategory
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text style={[
                  styles.categoryText,
                  selectedCategory === category && styles.selectedCategoryText
                ]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.infoSection}>
          <Users size={24} color="#8B5CF6" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Règles de la communauté</Text>
            <Text style={styles.infoText}>
              • Restez bienveillant et respectueux{'\n'}
              • Partagez des contenus constructifs{'\n'}
              • Encouragez les autres membres{'\n'}
              • Évitez le spam et les contenus inappropriés
            </Text>
          </View>
        </View>

        <LinearGradient
          colors={['#8B5CF6', '#3B82F6']}
          style={styles.createButton}
        >
          <TouchableOpacity 
            style={styles.createButtonInner} 
            onPress={createGroup}
            disabled={creating}
          >
            <Text style={styles.createButtonText}>
              {creating ? 'Création...' : 'Créer le groupe'}
            </Text>
          </TouchableOpacity>
        </LinearGradient>

        <TouchableOpacity 
          style={styles.floatingButton}
          onPress={() => router.push('/(tabs)/messages' as any)}
        >
          <LinearGradient
            colors={['#8B5CF6', '#3B82F6']}
            style={styles.floatingButtonGradient}
          >
            <Plus size={24} color="white" />
          </LinearGradient>
        </TouchableOpacity>
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
    marginBottom: 12,
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
    color: 'white',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    marginLeft: 12,
  },
  textArea: {
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    fontSize: 16,
    color: '#1F2937',
    minHeight: 100,
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'right',
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  selectedCategory: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  categoryText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  selectedCategoryText: {
    color: 'white',
  },
  infoSection: {
    flexDirection: 'row',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  createButton: {
    borderRadius: 12,
    marginBottom: 20,
  },
  createButtonInner: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  createButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  floatingButtonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
});