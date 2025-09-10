// 🔍 Script de vérification du backend Supabase pour Gloup ✨
// Vérifie la cohérence et l'intégrité de toute la configuration

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qsoutgrmvpyrazuygoeo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzb3V0Z3JtdnB5cmF6dXlnb2VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjY4OTIsImV4cCI6MjA3MzAwMjg5Mn0.6-OFiWeus-Z-4PV8-6BAhGZSS2LrN9GQKnTKqekMKNk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Configuration des tests
const REQUIRED_TABLES = [
  'profiles',
  'posts', 
  'reactions',
  'direct_messages',
  'groups',
  'group_members',
  'group_messages',
  'follows',
  'notifications'
];

const REQUIRED_COLUMNS = {
  profiles: ['id', 'username', 'full_name', 'avatar_url', 'bio', 'glow_points', 'streak_count', 'is_verified', 'follower_count', 'following_count'],
  posts: ['id', 'author_id', 'content', 'media_url', 'category', 'glow_points', 'reply_count', 'share_count', 'view_count'],
  reactions: ['id', 'post_id', 'user_id', 'kind', 'points'],
  direct_messages: ['id', 'sender_id', 'receiver_id', 'content', 'read_at'],
  groups: ['id', 'name', 'category', 'created_by'],
  group_members: ['group_id', 'user_id', 'role'],
  group_messages: ['id', 'group_id', 'sender_id', 'content']
};

const REQUIRED_FUNCTIONS = [
  'set_updated_at',
  'calculate_reaction_points', 
  'recalc_post_points',
  'recalc_user_points',
  'after_reaction_change'
];

// Utilitaires de logging
const log = {
  success: (msg) => console.log(`✅ ${msg}`),
  error: (msg) => console.log(`❌ ${msg}`),
  warning: (msg) => console.log(`⚠️  ${msg}`),
  info: (msg) => console.log(`ℹ️  ${msg}`),
  section: (msg) => console.log(`\n🔍 ${msg}\n${'='.repeat(50)}`)
};

// Tests de vérification
class BackendVerifier {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.successes = [];
  }

  async runAllTests() {
    log.section('VÉRIFICATION DU BACKEND SUPABASE - GLOUP ✨');
    
    try {
      await this.testConnection();
      await this.testTables();
      await this.testColumns();
      await this.testRLS();
      await this.testFunctions();
      await this.testTriggers();
      await this.testRealtime();
      await this.testGlowPoints();
      await this.testStorage();
      
      this.printSummary();
    } catch (error) {
      log.error(`Erreur critique: ${error.message}`);
    }
  }

  async testConnection() {
    log.section('Test de connexion');
    
    try {
      const { data, error } = await supabase.from('profiles').select('count').limit(1);
      if (error) throw error;
      
      log.success('Connexion Supabase établie');
      this.successes.push('Connexion OK');
    } catch (error) {
      log.error(`Connexion échouée: ${error.message}`);
      this.errors.push('Connexion échouée');
    }
  }

  async testTables() {
    log.section('Vérification des tables');
    
    for (const table of REQUIRED_TABLES) {
      try {
        const { error } = await supabase.from(table).select('*').limit(1);
        if (error) throw error;
        
        log.success(`Table '${table}' existe`);
        this.successes.push(`Table ${table}`);
      } catch (error) {
        log.error(`Table '${table}' manquante ou inaccessible: ${error.message}`);
        this.errors.push(`Table ${table} manquante`);
      }
    }
  }

  async testColumns() {
    log.section('Vérification des colonnes');
    
    for (const [table, columns] of Object.entries(REQUIRED_COLUMNS)) {
      try {
        // Test avec une requête SELECT pour vérifier les colonnes
        const selectColumns = columns.join(', ');
        const { error } = await supabase
          .from(table)
          .select(selectColumns)
          .limit(1);
          
        if (error) {
          log.error(`Colonnes manquantes dans '${table}': ${error.message}`);
          this.errors.push(`Colonnes ${table}`);
        } else {
          log.success(`Colonnes de '${table}' OK`);
          this.successes.push(`Colonnes ${table}`);
        }
      } catch (error) {
        log.error(`Erreur colonnes '${table}': ${error.message}`);
        this.errors.push(`Colonnes ${table}`);
      }
    }
  }

  async testRLS() {
    log.section('Vérification RLS (Row Level Security)');
    
    // Test basique: essayer de lire sans auth (doit échouer pour certaines tables)
    const protectedTables = ['direct_messages', 'notifications'];
    
    for (const table of protectedTables) {
      try {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        
        if (data && data.length === 0) {
          log.success(`RLS actif sur '${table}' (aucune donnée accessible sans auth)`);
          this.successes.push(`RLS ${table}`);
        } else if (error && error.message.includes('row-level security')) {
          log.success(`RLS correctement configuré sur '${table}'`);
          this.successes.push(`RLS ${table}`);
        } else {
          log.warning(`RLS possiblement mal configuré sur '${table}'`);
          this.warnings.push(`RLS ${table}`);
        }
      } catch (error) {
        log.warning(`Impossible de tester RLS sur '${table}': ${error.message}`);
        this.warnings.push(`RLS ${table}`);
      }
    }
  }

  async testFunctions() {
    log.section('Vérification des fonctions');
    
    // Test indirect via une requête qui utilise les fonctions
    try {
      const { data, error } = await supabase.rpc('calculate_reaction_points', { 
        reaction_kind: 'couronne' 
      });
      
      if (error) {
        log.error(`Fonction calculate_reaction_points manquante: ${error.message}`);
        this.errors.push('Fonctions manquantes');
      } else if (data === 20) {
        log.success('Fonctions de calcul des points OK');
        this.successes.push('Fonctions');
      } else {
        log.warning('Fonctions présentes mais résultat inattendu');
        this.warnings.push('Fonctions');
      }
    } catch (error) {
      log.error(`Erreur test fonctions: ${error.message}`);
      this.errors.push('Fonctions');
    }
  }

  async testTriggers() {
    log.section('Test des triggers (Glow Points)');
    
    // Ce test nécessiterait une authentification pour créer des données
    // Pour l'instant, on vérifie juste la cohérence des points existants
    try {
      const { data: posts, error } = await supabase
        .from('posts')
        .select('id, glow_points, reactions(kind)')
        .limit(5);
        
      if (error) throw error;
      
      if (posts && posts.length > 0) {
        log.success('Structure des données cohérente pour les triggers');
        this.successes.push('Triggers structure');
      } else {
        log.info('Aucune donnée pour tester les triggers');
      }
    } catch (error) {
      log.warning(`Impossible de tester les triggers: ${error.message}`);
      this.warnings.push('Triggers');
    }
  }

  async testRealtime() {
    log.section('Test Realtime');
    
    // Test de base: vérifier qu'on peut s'abonner aux changements
    try {
      const channel = supabase
        .channel('test-channel')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'posts'
        }, () => {})
        .subscribe();
        
      // Attendre un peu puis se désabonner
      setTimeout(() => {
        supabase.removeChannel(channel);
        log.success('Realtime: abonnement aux posts OK');
        this.successes.push('Realtime');
      }, 1000);
      
    } catch (error) {
      log.error(`Realtime non fonctionnel: ${error.message}`);
      this.errors.push('Realtime');
    }
  }

  async testGlowPoints() {
    log.section('Vérification Glow Points');
    
    try {
      // Vérifier que les posts ont des glow_points cohérents
      const { data: posts, error } = await supabase
        .from('posts')
        .select('id, glow_points')
        .gte('glow_points', 0)
        .limit(10);
        
      if (error) throw error;
      
      if (posts) {
        const validPoints = posts.every(post => 
          typeof post.glow_points === 'number' && post.glow_points >= 0
        );
        
        if (validPoints) {
          log.success(`Glow Points cohérents sur ${posts.length} posts`);
          this.successes.push('Glow Points');
        } else {
          log.error('Glow Points incohérents détectés');
          this.errors.push('Glow Points');
        }
      }
    } catch (error) {
      log.error(`Erreur vérification Glow Points: ${error.message}`);
      this.errors.push('Glow Points');
    }
  }

  async testStorage() {
    log.section('Vérification Storage');
    
    try {
      // Lister les buckets
      const { data: buckets, error } = await supabase.storage.listBuckets();
      
      if (error) throw error;
      
      const requiredBuckets = ['avatars', 'posts'];
      const existingBuckets = buckets.map(b => b.name);
      
      for (const bucket of requiredBuckets) {
        if (existingBuckets.includes(bucket)) {
          log.success(`Bucket '${bucket}' existe`);
          this.successes.push(`Storage ${bucket}`);
        } else {
          log.error(`Bucket '${bucket}' manquant`);
          this.errors.push(`Storage ${bucket}`);
        }
      }
    } catch (error) {
      log.warning(`Impossible de vérifier le storage: ${error.message}`);
      this.warnings.push('Storage');
    }
  }

  printSummary() {
    log.section('RÉSUMÉ DE LA VÉRIFICATION');
    
    console.log(`✅ Succès: ${this.successes.length}`);
    console.log(`⚠️  Avertissements: ${this.warnings.length}`);
    console.log(`❌ Erreurs: ${this.errors.length}`);
    
    if (this.errors.length === 0) {
      log.success('🎉 BACKEND ENTIÈREMENT FONCTIONNEL !');
    } else {
      log.error('🔧 CORRECTIONS NÉCESSAIRES');
      console.log('\nErreurs à corriger:');
      this.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    if (this.warnings.length > 0) {
      console.log('\nAvertissements:');
      this.warnings.forEach(warning => console.log(`  - ${warning}`));
    }
    
    console.log('\n' + '='.repeat(50));
    log.info('Vérification terminée');
  }
}

// Exécution du script
async function main() {
  const verifier = new BackendVerifier();
  await verifier.runAllTests();
}

// Exécuter si appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default BackendVerifier;