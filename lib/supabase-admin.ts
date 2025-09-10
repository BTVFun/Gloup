// 🔧 Utilitaires d'administration Supabase pour Gloup ✨
// Fonctions pour maintenir et monitorer le backend

import { supabase } from './supabase';

export class SupabaseAdmin {
  
  // 📊 Statistiques du backend
  static async getBackendStats() {
    try {
      const [
        { count: usersCount },
        { count: postsCount },
        { count: reactionsCount },
        { count: messagesCount },
        { count: groupsCount }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('posts').select('*', { count: 'exact', head: true }),
        supabase.from('reactions').select('*', { count: 'exact', head: true }),
        supabase.from('direct_messages').select('*', { count: 'exact', head: true }),
        supabase.from('groups').select('*', { count: 'exact', head: true })
      ]);

      return {
        users: usersCount || 0,
        posts: postsCount || 0,
        reactions: reactionsCount || 0,
        messages: messagesCount || 0,
        groups: groupsCount || 0,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Erreur récupération stats:', error);
      return null;
    }
  }

  // 🔄 Recalculer tous les Glow Points
  static async recalculateAllGlowPoints() {
    try {
      console.log('🔄 Recalcul des Glow Points...');
      
      // Récupérer tous les posts
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('id');
      
      if (postsError) throw postsError;
      
      // Recalculer chaque post
      for (const post of posts || []) {
        const { error } = await supabase.rpc('recalc_post_points', {
          p_post_id: post.id
        });
        if (error) console.error(`Erreur post ${post.id}:`, error);
      }
      
      // Récupérer tous les utilisateurs
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id');
      
      if (usersError) throw usersError;
      
      // Recalculer chaque utilisateur
      for (const user of users || []) {
        const { error } = await supabase.rpc('recalc_user_points', {
          p_user_id: user.id
        });
        if (error) console.error(`Erreur user ${user.id}:`, error);
      }
      
      console.log('✅ Recalcul terminé');
      return true;
    } catch (error) {
      console.error('❌ Erreur recalcul:', error);
      return false;
    }
  }

  // 🧹 Nettoyage des données orphelines
  static async cleanupOrphanedData() {
    try {
      console.log('🧹 Nettoyage des données orphelines...');
      
      // Supprimer les réactions sur des posts inexistants
      const { error: reactionsError } = await supabase
        .from('reactions')
        .delete()
        .not('post_id', 'in', `(SELECT id FROM posts)`);
      
      if (reactionsError) console.error('Erreur nettoyage réactions:', reactionsError);
      
      // Supprimer les messages de groupes inexistants
      const { error: messagesError } = await supabase
        .from('group_messages')
        .delete()
        .not('group_id', 'in', `(SELECT id FROM groups)`);
      
      if (messagesError) console.error('Erreur nettoyage messages:', messagesError);
      
      console.log('✅ Nettoyage terminé');
      return true;
    } catch (error) {
      console.error('❌ Erreur nettoyage:', error);
      return false;
    }
  }

  // 📈 Analyser les performances
  static async analyzePerformance() {
    try {
      console.log('📈 Analyse des performances...');
      
      // Top posts par glow points
      const { data: topPosts } = await supabase
        .from('posts')
        .select('id, content, glow_points, profiles:author_id(username)')
        .order('glow_points', { ascending: false })
        .limit(10);
      
      // Top utilisateurs par glow points
      const { data: topUsers } = await supabase
        .from('profiles')
        .select('id, username, glow_points')
        .order('glow_points', { ascending: false })
        .limit(10);
      
      // Posts récents avec le plus de réactions
      const { data: hotPosts } = await supabase
        .from('posts')
        .select('id, content, created_at, reactions(count)')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(10);
      
      return {
        topPosts: topPosts || [],
        topUsers: topUsers || [],
        hotPosts: hotPosts || [],
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Erreur analyse:', error);
      return null;
    }
  }

  // 🔍 Vérifier l'intégrité des données
  static async checkDataIntegrity() {
    const issues = [];
    
    try {
      // Vérifier les posts sans auteur
      const { data: orphanedPosts } = await supabase
        .from('posts')
        .select('id')
        .not('author_id', 'in', `(SELECT id FROM profiles)`);
      
      if (orphanedPosts && orphanedPosts.length > 0) {
        issues.push(`${orphanedPosts.length} posts sans auteur`);
      }
      
      // Vérifier les réactions sans post
      const { data: orphanedReactions } = await supabase
        .from('reactions')
        .select('id')
        .not('post_id', 'in', `(SELECT id FROM posts)`);
      
      if (orphanedReactions && orphanedReactions.length > 0) {
        issues.push(`${orphanedReactions.length} réactions orphelines`);
      }
      
      // Vérifier les glow points incohérents
      const { data: inconsistentPosts } = await supabase
        .from('posts')
        .select('id, glow_points')
        .lt('glow_points', 0);
      
      if (inconsistentPosts && inconsistentPosts.length > 0) {
        issues.push(`${inconsistentPosts.length} posts avec glow_points négatifs`);
      }
      
      return {
        isHealthy: issues.length === 0,
        issues,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Erreur vérification intégrité:', error);
      return {
        isHealthy: false,
        issues: ['Erreur lors de la vérification'],
        error: error.message
      };
    }
  }

  // 🚀 Test de charge basique
  static async performLoadTest(iterations = 10) {
    console.log(`🚀 Test de charge (${iterations} itérations)...`);
    
    const results = {
      reads: [],
      writes: [],
      errors: 0
    };
    
    for (let i = 0; i < iterations; i++) {
      try {
        // Test lecture
        const readStart = Date.now();
        await supabase.from('posts').select('id').limit(10);
        results.reads.push(Date.now() - readStart);
        
        // Test écriture (simulation)
        const writeStart = Date.now();
        await supabase.from('profiles').select('id').limit(1);
        results.writes.push(Date.now() - writeStart);
        
      } catch (error) {
        results.errors++;
        console.error(`Erreur itération ${i}:`, error);
      }
    }
    
    return {
      avgReadTime: results.reads.reduce((a, b) => a + b, 0) / results.reads.length,
      avgWriteTime: results.writes.reduce((a, b) => a + b, 0) / results.writes.length,
      errors: results.errors,
      successRate: ((iterations - results.errors) / iterations) * 100
    };
  }
}

// Fonctions utilitaires pour le développement
export const DevUtils = {
  // Créer des données de test
  async createTestData() {
    console.log('🧪 Création de données de test...');
    // Implementation would go here
  },
  
  // Nettoyer les données de test
  async cleanTestData() {
    console.log('🧹 Nettoyage des données de test...');
    // Implementation would go here
  },
  
  // Réinitialiser les compteurs
  async resetCounters() {
    console.log('🔄 Réinitialisation des compteurs...');
    // Implementation would go here
  }
};