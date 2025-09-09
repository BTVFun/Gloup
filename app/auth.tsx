import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { ensureProfile } from '@/lib/profile';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    try {
      setLoading(true);
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        Alert.alert('Inscription réussie', 'Bienvenue sur GlowUp ! 🎉');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      await ensureProfile();
    } catch (e: any) {
      let message = 'Erreur inconnue';
      if (e.message?.includes('Invalid login credentials')) {
        message = 'Email ou mot de passe incorrect';
      } else if (e.message?.includes('User already registered')) {
        message = 'Cet email est déjà utilisé';
      } else if (e.message) {
        message = e.message;
      }
      Alert.alert('Erreur', message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient colors={["#8B5CF6", "#3B82F6"]} style={styles.header}>
        <View style={styles.logoContainer}>
          <Sparkles size={40} color="white" />
          <Text style={styles.title}>GlowUp</Text>
        </View>
        <Text style={styles.subtitle}>
          {mode === 'signin' ? 'Bon retour parmi nous !' : 'Rejoignez la communauté'}
        </Text>
      </LinearGradient>

      <View style={styles.content}>
        <Text style={styles.formTitle}>
          {mode === 'signin' ? 'Connexion' : 'Créer un compte'}
        </Text>
        
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#9CA3AF"
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Mot de passe"
          placeholderTextColor="#9CA3AF"
          secureTextEntry
          autoComplete={mode === 'signin' ? 'password' : 'new-password'}
          value={password}
          onChangeText={setPassword}
        />

        <LinearGradient colors={["#8B5CF6", "#3B82F6"]} style={styles.btnGradient}>
          <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
            <Text style={styles.buttonText}>
              {loading ? 'Chargement...' : mode === 'signin' ? 'Se connecter' : "S'inscrire"}
            </Text>
          </TouchableOpacity>
        </LinearGradient>

        <TouchableOpacity onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
          <Text style={styles.switchText}>
            {mode === 'signin' ? "Pas de compte ? S'inscrire" : 'Déjà un compte ? Se connecter'}
          </Text>
        </TouchableOpacity>

        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            ✨ Rejoignez une communauté bienveillante dédiée au développement personnel
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { 
    paddingTop: 60, 
    paddingBottom: 40, 
    paddingHorizontal: 20, 
    alignItems: 'center' 
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: { 
    fontSize: 32, 
    fontWeight: 'bold', 
    color: 'white',
    marginLeft: 12,
  },
  subtitle: { 
    fontSize: 16, 
    color: 'rgba(255,255,255,0.9)', 
    textAlign: 'center',
  },
  content: { 
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 32,
  },
  input: {
    backgroundColor: 'white', 
    borderRadius: 12, 
    padding: 16, 
    fontSize: 16,
    borderWidth: 1, 
    borderColor: '#E5E7EB', 
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  btnGradient: { 
    borderRadius: 12, 
    marginTop: 8,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  button: { 
    paddingVertical: 16, 
    alignItems: 'center' 
  },
  buttonText: { 
    color: 'white', 
    fontSize: 18, 
    fontWeight: 'bold' 
  },
  switchText: { 
    marginTop: 20, 
    textAlign: 'center', 
    color: '#8B5CF6',
    fontSize: 16,
    fontWeight: '600',
  },
  infoContainer: {
    marginTop: 32,
    padding: 16,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});
