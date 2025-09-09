import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { ensureProfile } from '@/lib/profile';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    try {
      setLoading(true);
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        Alert.alert('Inscription', "Vérifiez votre email si la confirmation est requise.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      await ensureProfile();
    } catch (e: any) {
      Alert.alert('Erreur', e.message ?? 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#8B5CF6", "#3B82F6"]} style={styles.header}>
        <Text style={styles.title}>GlowUp</Text>
        <Text style={styles.subtitle}>{mode === 'signin' ? 'Connexion' : 'Créer un compte'}</Text>
      </LinearGradient>

      <View style={styles.content}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#9CA3AF"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Mot de passe"
          placeholderTextColor="#9CA3AF"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <LinearGradient colors={["#8B5CF6", "#3B82F6"]} style={styles.btnGradient}>
          <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? '...' : mode === 'signin' ? 'Se connecter' : "S'inscrire"}</Text>
          </TouchableOpacity>
        </LinearGradient>

        <TouchableOpacity onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
          <Text style={styles.switchText}>
            {mode === 'signin' ? "Pas de compte ? S'inscrire" : 'Déjà un compte ? Se connecter'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingTop: 60, paddingBottom: 30, paddingHorizontal: 20, alignItems: 'center' },
  title: { fontSize: 32, fontWeight: 'bold', color: 'white' },
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.9)', marginTop: 4 },
  content: { padding: 16 },
  input: {
    backgroundColor: 'white', borderRadius: 12, padding: 16, fontSize: 16,
    borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 12
  },
  btnGradient: { borderRadius: 12, marginTop: 8 },
  button: { paddingVertical: 14, alignItems: 'center' },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  switchText: { marginTop: 12, textAlign: 'center', color: '#6B7280' },
});
