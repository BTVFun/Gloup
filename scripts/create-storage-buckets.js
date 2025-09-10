// Script pour créer les buckets de stockage Supabase
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qsoutgrmvpyrazuygoeo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzb3V0Z3JtdnB5cmF6dXlnb2VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjY4OTIsImV4cCI6MjA3MzAwMjg5Mn0.6-OFiWeus-Z-4PV8-6BAhGZSS2LrN9GQKnTKqekMKNk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const log = {
  success: (msg) => console.log(`✅ ${msg}`),
  error: (msg) => console.log(`❌ ${msg}`),
  info: (msg) => console.log(`ℹ️  ${msg}`),
  section: (msg) => console.log(`\n🔧 ${msg}\n${'='.repeat(50)}`)
};

async function createStorageBuckets() {
  log.section('CRÉATION DES BUCKETS DE STOCKAGE');

  try {
    // Créer le bucket avatars
    log.info('Création du bucket "avatars"...');
    const { data: avatarsBucket, error: avatarsError } = await supabase.storage
      .createBucket('avatars', {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        fileSizeLimit: 5242880, // 5MB
      });

    if (avatarsError && !avatarsError.message.includes('already exists')) {
      throw avatarsError;
    }
    log.success('Bucket "avatars" créé ou existe déjà');

    // Créer le bucket posts
    log.info('Création du bucket "posts"...');
    const { data: postsBucket, error: postsError } = await supabase.storage
      .createBucket('posts', {
        public: true,
        allowedMimeTypes: [
          'image/jpeg', 
          'image/png', 
          'image/webp',
          'video/mp4',
          'video/quicktime',
          'video/x-msvideo'
        ],
        fileSizeLimit: 10485760, // 10MB
      });

    if (postsError && !postsError.message.includes('already exists')) {
      throw postsError;
    }
    log.success('Bucket "posts" créé ou existe déjà');

    // Vérifier les buckets créés
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) throw listError;

    log.section('BUCKETS DISPONIBLES');
    buckets.forEach(bucket => {
      log.success(`Bucket "${bucket.name}" - Public: ${bucket.public}`);
    });

    log.section('CONFIGURATION DES POLITIQUES DE STOCKAGE');
    log.info('Les politiques RLS pour le stockage doivent être configurées via l\'interface Supabase');
    log.info('Politiques recommandées:');
    log.info('- avatars: INSERT/UPDATE/DELETE pour auth.uid() = (storage.foldername(name))[1]');
    log.info('- posts: INSERT/UPDATE/DELETE pour auth.uid() = (storage.foldername(name))[1]');
    log.info('- SELECT public pour les deux buckets');

  } catch (error) {
    log.error(`Erreur lors de la création des buckets: ${error.message}`);
    process.exit(1);
  }
}

// Exécuter le script
createStorageBuckets()
  .then(() => {
    log.success('🎉 Buckets de stockage configurés avec succès !');
    process.exit(0);
  })
  .catch((error) => {
    log.error(`Erreur fatale: ${error.message}`);
    process.exit(1);
  });