import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qsoutgrmvpyrazuygoeo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzb3V0Z3JtdnB5cmF6dXlnb2VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjY4OTIsImV4cCI6MjA3MzAwMjg5Mn0.6-OFiWeus-Z-4PV8-6BAhGZSS2LrN9GQKnTKqekMKNk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  try {
    const { error, count } = await supabase
      .from('profiles')
      .select('id', { head: true, count: 'exact' });
    if (error) throw error;
    console.log('Supabase OK. profiles count (head):', count ?? 'unknown');
    process.exit(0);
  } catch (e) {
    console.error('Supabase smoke test failed:', e.message || e);
    process.exit(1);
  }
}

run();

