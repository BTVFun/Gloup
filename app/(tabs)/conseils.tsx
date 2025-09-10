import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart as Heart2, Dumbbell, Brain, Palette, BookOpen, Utensils, Plus } from 'lucide-react-native';

const categories = [
  {
    id: 'sante',
    title: 'Santé',
    icon: Heart2,
    color: '#EF4444',
    gradient: ['#EF4444', '#F87171'],
    description: 'Alimentation, sommeil, hygiène',
    articles: 12,
    image: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    id: 'sport',
    title: 'Sport & Forme',
    icon: Dumbbell,
    color: '#F97316',
    gradient: ['#F97316', '#FB923C'],
    description: 'Fitness, nutrition sportive',
    articles: 18,
    image: 'https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    id: 'mental',
    title: 'Mental',
    icon: Brain,
    color: '#10B981',
    gradient: ['#10B981', '#34D399'],
    description: 'Confiance, anxiété, motivation',
    articles: 15,
    image: 'https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    id: 'style',
    title: 'Style & Image',
    icon: Palette,
    color: '#8B5CF6',
    gradient: ['#8B5CF6', '#A78BFA'],
    description: 'Mode, maquillage, posture',
    articles: 21,
    image: 'https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    id: 'developpement',
    title: 'Développement Personnel',
    icon: BookOpen,
    color: '#3B82F6',
    gradient: ['#3B82F6', '#60A5FA'],
    description: 'Objectifs, organisation, lectures',
    articles: 9,
    image: 'https://images.pexels.com/photos/1181433/pexels-photo-1181433.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    id: 'nutrition',
    title: 'Nutrition',
    icon: Utensils,
    color: '#059669',
    gradient: ['#059669', '#10B981'],
    description: 'Recettes saines, équilibre',
    articles: 14,
    image: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
];

const featuredArticles = [
  {
    id: '1',
    title: '5 habitudes matinales qui changent la vie',
    category: 'Développement Personnel',
    readTime: '3 min',
    image: 'https://images.pexels.com/photos/6707/bed-bedroom-house-sleep.jpg?auto=compress&cs=tinysrgb&w=400',
    excerpt: 'Découvrez comment transformer vos matinées en moments de croissance personnelle...',
  },
  {
    id: '2',
    title: 'Gérer son stress naturellement',
    category: 'Mental',
    readTime: '5 min',
    image: 'https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg?auto=compress&cs=tinysrgb&w=400',
    excerpt: 'Techniques de respiration et méthodes douces pour retrouver la sérénité...',
  },
];

export default function ConseilsScreen() {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient
        colors={['#8B5CF6', '#3B82F6']}
        style={styles.header}
      >
        <Text style={styles.title}>Conseils</Text>
        <Text style={styles.subtitle}>Accompagnez votre évolution</Text>
      </LinearGradient>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Articles du moment</Text>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.featuredSection}>
          {featuredArticles.map((article) => (
            <TouchableOpacity key={article.id} style={styles.featuredCard}>
              <Image source={{ uri: article.image }} style={styles.featuredImage} />
              <View style={styles.featuredContent}>
                <Text style={styles.featuredCategory}>{article.category}</Text>
                <Text style={styles.featuredTitle} numberOfLines={2}>{article.title}</Text>
                <Text style={styles.featuredExcerpt} numberOfLines={2}>{article.excerpt}</Text>
                <Text style={styles.readTime}>{article.readTime} de lecture</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.sectionTitle}>Catégories</Text>
        
        <View style={styles.categoriesGrid}>
          {categories.map((category) => {
            const IconComponent = category.icon;
            return (
              <TouchableOpacity key={category.id} style={styles.categoryCard}>
                <Image source={{ uri: category.image }} style={styles.categoryImage} />
                <LinearGradient
                  colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.3)']}
                  style={styles.categoryOverlay}
                />
                <View style={styles.categoryContent}>
                  <View style={[styles.categoryIcon, { backgroundColor: category.color }]}>
                    <IconComponent size={24} color="white" />
                  </View>
                  <Text style={styles.categoryTitle}>{category.title}</Text>
                  <Text style={styles.categoryDescription}>{category.description}</Text>
                  <Text style={styles.articlesCount}>{category.articles} articles</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

      </View>

      <TouchableOpacity 
        style={styles.floatingButton}
        onPress={() => router.push('/(tabs)/create' as any)}
      >
        <LinearGradient
          colors={['#8B5CF6', '#3B82F6']}
          style={styles.floatingButtonGradient}
        >
          <Plus size={24} color="white" />
        </LinearGradient>
      </TouchableOpacity>
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
    marginTop: 8,
  },
  featuredSection: {
    marginBottom: 32,
  },
  featuredCard: {
    width: 280,
    backgroundColor: 'white',
    borderRadius: 16,
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  featuredImage: {
    width: '100%',
    height: 140,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  featuredContent: {
    padding: 16,
  },
  featuredCategory: {
    fontSize: 12,
    color: '#8B5CF6',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  featuredTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  featuredExcerpt: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  readTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  categoryCard: {
    width: '48%',
    height: 160,
    marginBottom: 16,
    borderRadius: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  categoryImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  categoryOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  categoryContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'flex-end',
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  articlesCount: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
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