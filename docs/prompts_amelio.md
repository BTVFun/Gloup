# 🚀 Prompts d'Amélioration - Application Sociale Gloup

*Analyse de la codebase : Application React Native/Expo avec Supabase comme backend*

## 🔍 État Actuel Analysé

L'application a une structure solide avec :
- ✅ Authentification Supabase fonctionnelle
- ✅ Feed "Glow" avec posts et réactions
- ✅ Système de création de posts avec upload d'images
- ✅ Messaging direct et groupes (partiellement implémenté)
- ✅ Système de réactions avec points Glow
- ⚠️ Configuration Supabase à optimiser
- ⚠️ Feed nécessite améliorations UI/UX
- ⚠️ Fonctionnalités de groupe incomplètes

---

## 📋 **Prompt 1: Configuration et Optimisation Supabase**

Tu es un expert Supabase et développeur backend senior. Ton objectif est d'optimiser et finaliser la configuration backend Supabase pour l'application sociale "Gloup".

**CONTEXTE:**
- Application React Native/Expo avec authentification et feed social
- Tables existantes: profiles, posts, reactions, direct_messages, groups, group_members, group_messages
- Bucket storage: posts (pour images/vidéos)
- URL Supabase: https://qsoutgrmvpyrazuygoeo.supabase.co

**TÂCHES PRIORITAIRES:**

### 1. CRÉER LE SCHÉMA DE BASE DE DONNÉES COMPLET:

```sql
-- Table profiles (déjà existante, à vérifier/améliorer)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  glow_points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table posts avec tous les champs nécessaires
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT,
  media_url TEXT,
  media_kind TEXT CHECK (media_kind IN ('photo', 'video', 'none')),
  category TEXT CHECK (category IN ('couronne', 'vetements', 'sport', 'mental', 'confiance', 'soins')),
  glow_points INTEGER DEFAULT 0,
  privacy TEXT DEFAULT 'public' CHECK (privacy IN ('public', 'friends', 'private')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_created ON posts(created_at DESC);
```

### 2. CONFIGURER LES ROW LEVEL SECURITY (RLS):

```sql
-- Posts: lecture publique, écriture pour auteur
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Posts visibles par tous" ON posts
  FOR SELECT USING (privacy = 'public' OR author_id = auth.uid());

CREATE POLICY "Créer ses propres posts" ON posts
  FOR INSERT WITH CHECK (author_id = auth.uid());

CREATE POLICY "Modifier ses propres posts" ON posts
  FOR UPDATE USING (author_id = auth.uid());

-- Reactions: éviter doublons
CREATE UNIQUE INDEX idx_reactions_unique ON reactions(post_id, user_id, kind);
```

### 3. CRÉER LES FONCTIONS ET TRIGGERS:

```sql
-- Fonction pour mettre à jour les glow_points
CREATE OR REPLACE FUNCTION update_glow_points()
RETURNS TRIGGER AS $$
BEGIN
  -- Mise à jour points du post
  UPDATE posts 
  SET glow_points = (
    SELECT COALESCE(SUM(
      CASE kind
        WHEN 'couronne' THEN 20
        ELSE 10
      END
    ), 0)
    FROM reactions 
    WHERE post_id = NEW.post_id
  )
  WHERE id = NEW.post_id;
  
  -- Mise à jour points de l'auteur
  UPDATE profiles
  SET glow_points = (
    SELECT COALESCE(SUM(glow_points), 0)
    FROM posts
    WHERE author_id = profiles.id
  )
  WHERE id = (SELECT author_id FROM posts WHERE id = NEW.post_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_glow_points
AFTER INSERT ON reactions
FOR EACH ROW EXECUTE FUNCTION update_glow_points();
```

### 4. CONFIGURER LE REALTIME:

```sql
-- Activer realtime sur tables critiques
ALTER PUBLICATION supabase_realtime ADD TABLE posts;
ALTER PUBLICATION supabase_realtime ADD TABLE reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE direct_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE group_messages;
```

### 5. OPTIMISER LE STORAGE:
- Créer politique pour bucket 'posts'
- Limiter taille max à 10MB
- Autoriser formats: jpg, png, mp4, mov
- CDN pour performance

**FICHIERS À MODIFIER:**
- Créer `/supabase/migrations/001_schema.sql` avec toutes les commandes SQL
- Documenter dans `/docs/database-schema.md`
- Ajouter scripts dans `/scripts/setup-supabase.js`

**RÉSULTAT ATTENDU:**
Backend Supabase parfaitement configuré avec sécurité RLS, triggers automatiques, et performance optimisée.

---

## 📋 **Prompt 2: Amélioration du Feed "Glow" Style Twitter**

Tu es un expert UI/UX React Native spécialisé dans les réseaux sociaux. Transforme le feed "Glow" pour ressembler davantage à Twitter avec plusieurs posts visibles et une meilleure expérience utilisateur.

**FICHIER PRINCIPAL:** `app/(tabs)/index.tsx`

**AMÉLIORATIONS REQUISES:**

### 1. REFACTOR DU COMPOSANT PostCard:

```tsx
// Créer un nouveau composant optimisé
const PostCard = ({ post, onReaction, compact = false }) => {
  return (
    <View style={[styles.postCard, compact && styles.compactCard]}>
      {/* Header plus compact */}
      <View style={styles.postHeader}>
        <Image source={{ uri: post.author.avatar }} style={styles.avatarSmall} />
        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.authorName}>{post.author.name}</Text>
            <Text style={styles.username}>@{post.author.username}</Text>
            <Text style={styles.dot}>·</Text>
            <Text style={styles.timestamp}>{post.timestamp}</Text>
          </View>
          <View style={styles.glowBadge}>
            <Sparkles size={12} color="#FFD700" />
            <Text style={styles.glowText}>{post.author.glowPoints}</Text>
          </View>
        </View>
      </View>
      
      {/* Contenu optimisé */}
      <Text style={styles.postContent} numberOfLines={compact ? 3 : undefined}>
        {post.content}
      </Text>
      
      {/* Image avec aspect ratio Twitter */}
      {post.image && (
        <Image 
          source={{ uri: post.image }} 
          style={styles.postImageTwitter}
          resizeMode="cover"
        />
      )}
      
      {/* Barre de réactions style Twitter */}
      <View style={styles.engagementBar}>
        {/* Réactions compactes en ligne */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {Object.entries(reactionIcons).map(([key, { icon: Icon, color }]) => (
            <TouchableOpacity
              key={key}
              style={styles.reactionButtonCompact}
              onPress={() => onReaction(post.id, key)}
            >
              <Icon size={16} color={color} />
              <Text style={styles.reactionCountSmall}>
                {post.reactions[key] || 0}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      {/* Actions en bas */}
      <View style={styles.actionBarTwitter}>
        <TouchableOpacity style={styles.actionButtonTwitter}>
          <MessageCircle size={18} color="#6B7280" />
          <Text style={styles.actionCount}>12</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButtonTwitter}>
          <Heart size={18} color="#6B7280" />
          <Text style={styles.actionCount}>48</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButtonTwitter}>
          <Share size={18} color="#6B7280" />
        </TouchableOpacity>
      </View>
    </View>
  );
};
```

### 2. OPTIMISER LE SCROLLING ET PERFORMANCE:

```tsx
// Utiliser FlatList au lieu de ScrollView
<FlatList
  data={posts}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => (
    <PostCard 
      post={item} 
      onReaction={handleReaction}
      compact={false}
    />
  )}
  ListHeaderComponent={<FeedHeader />}
  refreshControl={
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      colors={['#8B5CF6']}
    />
  }
  onEndReached={loadMorePosts}
  onEndReachedThreshold={0.5}
  initialNumToRender={10}
  maxToRenderPerBatch={5}
  windowSize={10}
  removeClippedSubviews={true}
/>
```

### 3. AJOUTER PAGINATION INFINIE:

```tsx
const [page, setPage] = useState(0);
const [hasMore, setHasMore] = useState(true);

async function loadMorePosts() {
  if (!hasMore || loading) return;
  
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false })
    .range(page * 10, (page + 1) * 10 - 1);
    
  if (data?.length < 10) setHasMore(false);
  setPosts(prev => [...prev, ...data]);
  setPage(prev => prev + 1);
}
```

### 4. STYLES TWITTER-LIKE:

```tsx
const styles = StyleSheet.create({
  postCard: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  avatarSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorName: {
    fontWeight: '600',
    fontSize: 15,
    color: '#1F2937',
  },
  username: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  postImageTwitter: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginTop: 8,
  },
  actionBarTwitter: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
    borderTopWidth: 0,
  },
  reactionButtonCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
  },
});
```

**RÉSULTAT ATTENDU:**
Feed Twitter-like avec posts compacts, scroll infini fluide, et plusieurs posts visibles simultanément.

---

## 📋 **Prompt 3: Système de Publication de Posts Amélioré**

Tu es un développeur React Native expert. Améliore le système de publication de posts avec preview, validation et optimisations.

**FICHIER:** `app/(tabs)/create.tsx`

**AMÉLIORATIONS:**

### 1. AJOUTER PREVIEW EN TEMPS RÉEL:

```tsx
// Composant PostPreview
const PostPreview = ({ content, asset, category }) => {
  const { data: { user } } = await supabase.auth.getUser();
  const [profile, setProfile] = useState(null);
  
  useEffect(() => {
    // Charger profil utilisateur pour preview
    supabase
      .from('profiles')
      .select('username, avatar_url, glow_points')
      .eq('id', user?.id)
      .single()
      .then(({ data }) => setProfile(data));
  }, []);
  
  return (
    <View style={styles.previewContainer}>
      <Text style={styles.previewTitle}>Aperçu</Text>
      <View style={styles.previewPost}>
        {/* Afficher le post comme il apparaîtra dans le feed */}
        <View style={styles.previewHeader}>
          <Image source={{ uri: profile?.avatar_url }} style={styles.previewAvatar} />
          <Text style={styles.previewName}>{profile?.username}</Text>
        </View>
        <Text style={styles.previewContent}>{content || "Votre message..."}</Text>
        {asset && <Image source={{ uri: asset.uri }} style={styles.previewImage} />}
        {category && (
          <View style={styles.previewCategory}>
            {/* Icône et nom de catégorie */}
          </View>
        )}
      </View>
    </View>
  );
};
```

### 2. COMPRESSION D'IMAGE OPTIMISÉE:

```tsx
import * as ImageManipulator from 'expo-image-manipulator';

async function compressImage(uri: string) {
  const manipResult = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1080 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  );
  return manipResult;
}

// Avant upload
if (asset) {
  const compressed = await compressImage(asset.uri);
  // Upload compressed.uri au lieu de asset.uri
}
```

### 3. VALIDATION ET FEEDBACK:

```tsx
const [errors, setErrors] = useState({});

function validatePost() {
  const newErrors = {};
  
  if (!content.trim() && !asset) {
    newErrors.content = "Ajoutez du texte ou une image";
  }
  
  if (content.length > 500) {
    newErrors.content = "Maximum 500 caractères";
  }
  
  if (!selectedCategory) {
    newErrors.category = "Sélectionnez une catégorie";
  }
  
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
}

// Afficher les erreurs
{errors.content && (
  <Text style={styles.errorText}>{errors.content}</Text>
)}
```

### 4. DRAFT ET BROUILLONS:

```tsx
import AsyncStorage from '@react-native-async-storage/async-storage';

// Sauvegarder brouillon
async function saveDraft() {
  const draft = {
    content,
    category: selectedCategory,
    timestamp: Date.now(),
  };
  await AsyncStorage.setItem('post_draft', JSON.stringify(draft));
}

// Restaurer brouillon
async function loadDraft() {
  const draft = await AsyncStorage.getItem('post_draft');
  if (draft) {
    const parsed = JSON.parse(draft);
    setContent(parsed.content);
    setSelectedCategory(parsed.category);
  }
}

// Auto-save toutes les 10 secondes
useEffect(() => {
  const interval = setInterval(saveDraft, 10000);
  return () => clearInterval(interval);
}, [content, selectedCategory]);
```

### 5. MULTI-IMAGES:

```tsx
const [assets, setAssets] = useState<ImagePickerAsset[]>([]);

async function pickMultipleImages() {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsMultipleSelection: true,
    selectionLimit: 4,
    quality: 0.9,
  });
  
  if (!result.canceled) {
    setAssets(result.assets);
  }
}

// Carousel pour afficher plusieurs images
<ScrollView horizontal pagingEnabled>
  {assets.map((asset, index) => (
    <Image key={index} source={{ uri: asset.uri }} style={styles.carouselImage} />
  ))}
</ScrollView>
```

**RÉSULTAT ATTENDU:**
Système de publication robuste avec preview, validation, compression, et sauvegarde automatique.

---

## 📋 **Prompt 4: Messagerie et Chat Temps Réel**

Tu es un expert en messagerie temps réel avec Supabase. Finalise le système de messaging avec notifications, typing indicators et améliorations UX.

**FICHIERS:** `app/(tabs)/messages.tsx`, `app/(tabs)/chat/[id].tsx`

**IMPLÉMENTATIONS:**

### 1. SYSTÈME DE SÉLECTION D'UTILISATEURS:

```tsx
// Nouveau fichier: app/(tabs)/new-message.tsx
export default function NewMessageScreen() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  
  async function searchUsers() {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .ilike('username', `%${search}%`)
      .limit(20);
    setUsers(data);
  }
  
  return (
    <View>
      <TextInput
        placeholder="Rechercher un utilisateur..."
        value={search}
        onChangeText={setSearch}
        onSubmitEditing={searchUsers}
      />
      <FlatList
        data={users}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => startChat(item.id)}>
            <View style={styles.userItem}>
              <Image source={{ uri: item.avatar_url }} />
              <Text>{item.username}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
```

### 2. TYPING INDICATORS:

```tsx
// Dans chat/[id].tsx
const [isTyping, setIsTyping] = useState(false);
const typingTimeout = useRef(null);

function handleTyping() {
  // Envoyer signal "typing"
  supabase.channel(`typing-${chatId}`)
    .send({
      type: 'broadcast',
      event: 'typing',
      payload: { user_id: currentUserId }
    });
    
  // Reset timeout
  if (typingTimeout.current) clearTimeout(typingTimeout.current);
  typingTimeout.current = setTimeout(() => {
    // Envoyer signal "stopped typing"
    supabase.channel(`typing-${chatId}`)
      .send({
        type: 'broadcast',
        event: 'stopped_typing',
        payload: { user_id: currentUserId }
      });
  }, 2000);
}

// Écouter typing des autres
useEffect(() => {
  const channel = supabase.channel(`typing-${chatId}`)
    .on('broadcast', { event: 'typing' }, ({ payload }) => {
      if (payload.user_id !== currentUserId) {
        setIsTyping(true);
      }
    })
    .on('broadcast', { event: 'stopped_typing' }, () => {
      setIsTyping(false);
    })
    .subscribe();
    
  return () => supabase.removeChannel(channel);
}, []);

// Afficher indicateur
{isTyping && (
  <View style={styles.typingIndicator}>
    <Text style={styles.typingText}>En train d'écrire...</Text>
    <ActivityIndicator size="small" color="#8B5CF6" />
  </View>
)}
```

### 3. NOTIFICATIONS PUSH:

```tsx
import * as Notifications from 'expo-notifications';

// Configuration notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Envoyer notification pour nouveau message
async function sendMessageNotification(receiverId: string, message: string) {
  const { data: receiver } = await supabase
    .from('profiles')
    .select('push_token')
    .eq('id', receiverId)
    .single();
    
  if (receiver?.push_token) {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: receiver.push_token,
        title: 'Nouveau message',
        body: message,
        data: { chatId: receiverId },
      }),
    });
  }
}
```

### 4. MESSAGES VOCAUX:

```tsx
import { Audio } from 'expo-av';

const [recording, setRecording] = useState(null);
const [audioUri, setAudioUri] = useState(null);

async function startRecording() {
  const { status } = await Audio.requestPermissionsAsync();
  if (status !== 'granted') return;
  
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });
  
  const recording = new Audio.Recording();
  await recording.prepareToRecordAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
  await recording.startAsync();
  setRecording(recording);
}

async function stopRecording() {
  await recording.stopAndUnloadAsync();
  const uri = recording.getURI();
  setAudioUri(uri);
  
  // Upload audio
  const { data } = await supabase.storage
    .from('voice-messages')
    .upload(`${Date.now()}.m4a`, {
      uri,
      type: 'audio/m4a',
    });
    
  // Envoyer message avec audio_url
  await supabase.from('direct_messages').insert({
    sender_id: currentUserId,
    receiver_id: receiverId,
    content: '🎤 Message vocal',
    audio_url: data.path,
  });
}
```

### 5. READ RECEIPTS:

```tsx
// Marquer comme lu
async function markAsRead(messageId: string) {
  await supabase
    .from('direct_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('id', messageId);
}

// Afficher statut de lecture
const MessageStatus = ({ message }) => {
  if (!message.isFromMe) return null;
  
  return (
    <View style={styles.statusContainer}>
      {message.read_at ? (
        <View style={styles.doubleCheck}>
          <Check size={12} color="#3B82F6" />
          <Check size={12} color="#3B82F6" style={{ marginLeft: -4 }} />
        </View>
      ) : message.delivered_at ? (
        <View style={styles.doubleCheck}>
          <Check size={12} color="#9CA3AF" />
          <Check size={12} color="#9CA3AF" style={{ marginLeft: -4 }} />
        </View>
      ) : (
        <Check size={12} color="#9CA3AF" />
      )}
    </View>
  );
};
```

**RÉSULTAT ATTENDU:**
Système de messagerie complet avec sélection d'utilisateurs, typing indicators, notifications, messages vocaux et read receipts.

---

## 📋 **Prompt 5: Système de Groupes et Communautés**

Tu es un développeur spécialisé dans les fonctionnalités sociales. Finalise le système de groupes avec administration, rôles et fonctionnalités avancées.

**FICHIERS:** `app/(tabs)/create-group.tsx`, `app/(tabs)/group/[id].tsx`

**IMPLÉMENTATIONS:**

### 1. CRÉATION DE GROUPE AMÉLIORÉE:

```tsx
// app/(tabs)/create-group.tsx
export default function CreateGroupScreen() {
  const [groupData, setGroupData] = useState({
    name: '',
    description: '',
    category: '',
    privacy: 'public', // public, private, secret
    rules: [],
    coverImage: null,
  });
  
  async function createGroup() {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Upload cover image si présente
    let cover_url = null;
    if (groupData.coverImage) {
      const { data } = await supabase.storage
        .from('groups')
        .upload(`covers/${Date.now()}.jpg`, groupData.coverImage);
      cover_url = data.path;
    }
    
    // Créer le groupe
    const { data: group, error } = await supabase
      .from('groups')
      .insert({
        name: groupData.name,
        description: groupData.description,
        category: groupData.category,
        privacy: groupData.privacy,
        rules: groupData.rules,
        cover_url,
        created_by: user.id,
      })
      .select()
      .single();
      
    if (!error) {
      // Ajouter créateur comme admin
      await supabase.from('group_members').insert({
        group_id: group.id,
        user_id: user.id,
        role: 'admin',
        joined_at: new Date().toISOString(),
      });
      
      router.push(`/group/${group.id}`);
    }
  }
  
  return (
    <ScrollView>
      {/* Image de couverture */}
      <TouchableOpacity onPress={pickCoverImage}>
        {groupData.coverImage ? (
          <Image source={{ uri: groupData.coverImage.uri }} style={styles.coverImage} />
        ) : (
          <View style={styles.coverPlaceholder}>
            <Camera size={40} color="#9CA3AF" />
            <Text>Ajouter une image de couverture</Text>
          </View>
        )}
      </TouchableOpacity>
      
      {/* Formulaire */}
      <TextInput
        placeholder="Nom du groupe"
        value={groupData.name}
        onChangeText={(text) => setGroupData({ ...groupData, name: text })}
      />
      
      <TextInput
        placeholder="Description"
        multiline
        numberOfLines={4}
        value={groupData.description}
        onChangeText={(text) => setGroupData({ ...groupData, description: text })}
      />
      
      {/* Sélection de catégorie */}
      <Picker
        selectedValue={groupData.category}
        onValueChange={(value) => setGroupData({ ...groupData, category: value })}
      >
        <Picker.Item label="Sport & Fitness" value="sport" />
        <Picker.Item label="Bien-être" value="wellness" />
        <Picker.Item label="Style & Mode" value="fashion" />
        <Picker.Item label="Motivation" value="motivation" />
      </Picker>
      
      {/* Privacy settings */}
      <View style={styles.privacySection}>
        <Text style={styles.sectionTitle}>Confidentialité</Text>
        {['public', 'private', 'secret'].map((privacy) => (
          <TouchableOpacity
            key={privacy}
            onPress={() => setGroupData({ ...groupData, privacy })}
            style={styles.privacyOption}
          >
            <RadioButton selected={groupData.privacy === privacy} />
            <Text>{privacy === 'public' ? 'Public' : privacy === 'private' ? 'Privé' : 'Secret'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {/* Règles du groupe */}
      <View style={styles.rulesSection}>
        <Text style={styles.sectionTitle}>Règles du groupe</Text>
        {groupData.rules.map((rule, index) => (
          <View key={index} style={styles.ruleItem}>
            <TextInput
              value={rule}
              onChangeText={(text) => updateRule(index, text)}
              placeholder={`Règle ${index + 1}`}
            />
            <TouchableOpacity onPress={() => removeRule(index)}>
              <X size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity onPress={addRule} style={styles.addRuleButton}>
          <Plus size={20} color="#8B5CF6" />
          <Text>Ajouter une règle</Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity onPress={createGroup} style={styles.createButton}>
        <Text>Créer le groupe</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
```

### 2. PAGE DE GROUPE COMPLÈTE:

```tsx
// app/(tabs)/group/[id].tsx
export default function GroupScreen() {
  const { id } = useLocalSearchParams();
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [activeTab, setActiveTab] = useState('posts'); // posts, members, about, events
  
  // Interface admin
  const AdminPanel = () => {
    if (userRole !== 'admin' && userRole !== 'moderator') return null;
    
    return (
      <View style={styles.adminPanel}>
        <Text style={styles.adminTitle}>Administration</Text>
        <TouchableOpacity style={styles.adminButton}>
          <Settings size={20} />
          <Text>Paramètres du groupe</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.adminButton}>
          <UserPlus size={20} />
          <Text>Inviter des membres</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.adminButton}>
          <Shield size={20} />
          <Text>Gérer les modérateurs</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.adminButton}>
          <AlertCircle size={20} />
          <Text>Signalements ({pendingReports})</Text>
        </TouchableOpacity>
      </View>
    );
  };
  
  // Posts du groupe
  const GroupPosts = () => (
    <FlatList
      data={posts}
      renderItem={({ item }) => (
        <PostCard 
          post={item}
          onReport={() => reportPost(item.id)}
          onPin={() => pinPost(item.id)}
          showGroupActions={userRole === 'admin'}
        />
      )}
    />
  );
  
  // Liste des membres
  const MembersList = () => (
    <FlatList
      data={members}
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.memberItem}>
          <Image source={{ uri: item.avatar_url }} style={styles.memberAvatar} />
          <View style={styles.memberInfo}>
            <Text style={styles.memberName}>{item.username}</Text>
            <Text style={styles.memberRole}>{item.role}</Text>
          </View>
          {(userRole === 'admin' && item.role !== 'admin') && (
            <Menu>
              <MenuTrigger>
                <MoreVertical size={20} />
              </MenuTrigger>
              <MenuOptions>
                <MenuOption onSelect={() => promoteMember(item.id)}>
                  <Text>Promouvoir modérateur</Text>
                </MenuOption>
                <MenuOption onSelect={() => removeMember(item.id)}>
                  <Text style={{ color: 'red' }}>Retirer du groupe</Text>
                </MenuOption>
              </MenuOptions>
            </Menu>
          )}
        </TouchableOpacity>
      )}
    />
  );
  
  // À propos du groupe
  const AboutSection = () => (
    <ScrollView style={styles.aboutSection}>
      <Text style={styles.description}>{group.description}</Text>
      
      <View style={styles.statsContainer}>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>{members.length}</Text>
          <Text style={styles.statLabel}>Membres</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>{posts.length}</Text>
          <Text style={styles.statLabel}>Posts</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>{group.created_at}</Text>
          <Text style={styles.statLabel}>Créé le</Text>
        </View>
      </View>
      
      <View style={styles.rulesContainer}>
        <Text style={styles.rulesTitle}>Règles du groupe</Text>
        {group.rules?.map((rule, index) => (
          <View key={index} style={styles.rule}>
            <Text style={styles.ruleNumber}>{index + 1}.</Text>
            <Text style={styles.ruleText}>{rule}</Text>
          </View>
        ))}
      </View>
      
      {userRole === 'admin' && <AdminPanel />}
    </ScrollView>
  );
  
  return (
    <View style={styles.container}>
      {/* Header avec image de couverture */}
      <ImageBackground source={{ uri: group?.cover_url }} style={styles.coverImage}>
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={styles.gradient}>
          <Text style={styles.groupName}>{group?.name}</Text>
          <Text style={styles.groupCategory}>{group?.category}</Text>
        </LinearGradient>
      </ImageBackground>
      
      {/* Tabs */}
      <View style={styles.tabs}>
        {['posts', 'members', 'about', 'events'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab === 'posts' ? 'Publications' :
               tab === 'members' ? 'Membres' :
               tab === 'about' ? 'À propos' : 'Événements'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {/* Contenu selon tab actif */}
      {activeTab === 'posts' && <GroupPosts />}
      {activeTab === 'members' && <MembersList />}
      {activeTab === 'about' && <AboutSection />}
      
      {/* Bouton flottant pour poster */}
      {isMember && (
        <TouchableOpacity style={styles.fab} onPress={createGroupPost}>
          <Plus size={24} color="white" />
        </TouchableOpacity>
      )}
    </View>
  );
}
```

### 3. SYSTÈME D'ÉVÉNEMENTS DE GROUPE:

```tsx
// Composant Events dans le groupe
const GroupEvents = () => {
  const [events, setEvents] = useState([]);
  
  const createEvent = async () => {
    const { data } = await supabase
      .from('group_events')
      .insert({
        group_id: groupId,
        title: eventData.title,
        description: eventData.description,
        start_date: eventData.startDate,
        end_date: eventData.endDate,
        location: eventData.location,
        max_participants: eventData.maxParticipants,
        created_by: currentUserId,
      });
  };
  
  return (
    <View>
      {userRole === 'admin' && (
        <TouchableOpacity onPress={showCreateEventModal}>
          <Text>Créer un événement</Text>
        </TouchableOpacity>
      )}
      
      <FlatList
        data={events}
        renderItem={({ item }) => (
          <EventCard
            event={item}
            onJoin={() => joinEvent(item.id)}
            onLeave={() => leaveEvent(item.id)}
            isJoined={item.participants.includes(currentUserId)}
          />
        )}
      />
    </View>
  );
};
```

**RÉSULTAT ATTENDU:**
Système de groupes complet avec création avancée, administration, rôles, événements et modération.

---

## 📋 **Prompt 6: Optimisation des Réactions et Gamification**

Tu es un expert en gamification et engagement utilisateur. Améliore le système de réactions avec animations, achievements et leaderboard.

**FICHIERS:** `app/(tabs)/index.tsx`, `components/ReactionSystem.tsx` (à créer)

**IMPLÉMENTATIONS:**

### 1. SYSTÈME DE RÉACTIONS ANIMÉES:

```tsx
// components/ReactionSystem.tsx
import { Animated, Easing } from 'react-native';
import LottieView from 'lottie-react-native';

export const AnimatedReaction = ({ type, onComplete }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    // Animation de réaction
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 3,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.bounce,
        useNativeDriver: true,
      }),
    ]).start(onComplete);
  }, []);
  
  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  
  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }, { rotate: spin }],
        position: 'absolute',
      }}
    >
      {/* Animation Lottie selon le type */}
      <LottieView
        source={getAnimationSource(type)}
        autoPlay
        loop={false}
        style={{ width: 100, height: 100 }}
      />
    </Animated.View>
  );
};

// Bouton de réaction avec feedback haptique
export const ReactionButton = ({ type, count, onPress, hasReacted }) => {
  const [showAnimation, setShowAnimation] = useState(false);
  
  const handlePress = async () => {
    // Haptic feedback
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Afficher animation
    setShowAnimation(true);
    
    // Appeler callback
    onPress();
    
    // Cacher animation après 1s
    setTimeout(() => setShowAnimation(false), 1000);
  };
  
  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[styles.reactionButton, hasReacted && styles.reacted]}
    >
      <Icon name={type} size={20} color={hasReacted ? colors[type] : '#6B7280'} />
      <Text style={[styles.count, hasReacted && { color: colors[type] }]}>
        {count}
      </Text>
      {showAnimation && <AnimatedReaction type={type} />}
    </TouchableOpacity>
  );
};
```

### 2. SYSTÈME D'ACHIEVEMENTS:

```tsx
// hooks/useAchievements.ts
export function useAchievements() {
  const [achievements, setAchievements] = useState([]);
  const [unlockedAchievements, setUnlockedAchievements] = useState([]);
  
  const checkAchievements = async (userId: string) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('glow_points, posts_count, reactions_given')
      .eq('id', userId)
      .single();
      
    const newAchievements = [];
    
    // Premier post
    if (profile.posts_count === 1 && !hasAchievement('first_post')) {
      newAchievements.push({
        id: 'first_post',
        title: 'Premier Glow !',
        description: 'Vous avez publié votre premier post',
        icon: '✨',
        points: 50,
      });
    }
    
    // 100 Glow Points
    if (profile.glow_points >= 100 && !hasAchievement('glow_100')) {
      newAchievements.push({
        id: 'glow_100',
        title: 'Étoile Montante',
        description: '100 Glow Points atteints !',
        icon: '⭐',
        points: 100,
      });
    }
    
    // Donner 50 réactions
    if (profile.reactions_given >= 50 && !hasAchievement('supporter')) {
      newAchievements.push({
        id: 'supporter',
        title: 'Super Supporter',
        description: '50 réactions données',
        icon: '💝',
        points: 75,
      });
    }
    
    // Sauvegarder nouveaux achievements
    if (newAchievements.length > 0) {
      await supabase.from('user_achievements').insert(
        newAchievements.map(a => ({
          user_id: userId,
          achievement_id: a.id,
          unlocked_at: new Date().toISOString(),
        }))
      );
      
      // Afficher notification
      showAchievementNotification(newAchievements[0]);
    }
    
    return newAchievements;
  };
  
  return { achievements, checkAchievements };
}

// Composant de notification d'achievement
const AchievementNotification = ({ achievement, onDismiss }) => {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
    
    setTimeout(() => {
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start(onDismiss);
    }, 3000);
  }, []);
  
  return (
    <Animated.View
      style={[
        styles.achievementNotification,
        { transform: [{ translateY: slideAnim }] },
      ]}
    >
      <LinearGradient colors={['#FFD700', '#FFA500']} style={styles.achievementGradient}>
        <Text style={styles.achievementIcon}>{achievement.icon}</Text>
        <View>
          <Text style={styles.achievementTitle}>{achievement.title}</Text>
          <Text style={styles.achievementDesc}>{achievement.description}</Text>
          <Text style={styles.achievementPoints}>+{achievement.points} points</Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};
```

### 3. LEADERBOARD HEBDOMADAIRE:

```tsx
// components/Leaderboard.tsx
export const Leaderboard = () => {
  const [timeframe, setTimeframe] = useState('week'); // week, month, all
  const [leaders, setLeaders] = useState([]);
  const [userRank, setUserRank] = useState(null);
  
  async function loadLeaderboard() {
    // Calculer date de début selon timeframe
    const startDate = getStartDate(timeframe);
    
    const { data } = await supabase
      .from('leaderboard_view') // Vue SQL créée dans Supabase
      .select('*')
      .gte('created_at', startDate)
      .order('glow_points', { ascending: false })
      .limit(100);
      
    setLeaders(data);
    
    // Trouver rang de l'utilisateur
    const currentUserId = (await supabase.auth.getUser()).data.user?.id;
    const rank = data.findIndex(l => l.user_id === currentUserId) + 1;
    setUserRank(rank || null);
  }
  
  return (
    <View style={styles.leaderboardContainer}>
      {/* Podium top 3 */}
      <View style={styles.podium}>
        {leaders.slice(0, 3).map((leader, index) => (
          <View key={leader.id} style={[styles.podiumSpot, styles[`position${index + 1}`]]}>
            <Image source={{ uri: leader.avatar_url }} style={styles.podiumAvatar} />
            <Text style={styles.podiumName}>{leader.username}</Text>
            <View style={styles.medal}>
              <Text style={styles.medalEmoji}>
                {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
              </Text>
            </View>
            <Text style={styles.podiumPoints}>{leader.glow_points}</Text>
          </View>
        ))}
      </View>
      
      {/* Liste complète */}
      <FlatList
        data={leaders.slice(3)}
        renderItem={({ item, index }) => (
          <View style={[
            styles.leaderItem,
            userRank === index + 4 && styles.currentUser,
          ]}>
            <Text style={styles.rank}>#{index + 4}</Text>
            <Image source={{ uri: item.avatar_url }} style={styles.leaderAvatar} />
            <Text style={styles.leaderName}>{item.username}</Text>
            <View style={styles.pointsContainer}>
              <Sparkles size={16} color="#FFD700" />
              <Text style={styles.points}>{item.glow_points}</Text>
            </View>
          </View>
        )}
      />
      
      {/* Position de l'utilisateur si hors top 100 */}
      {userRank && userRank > 100 && (
        <View style={styles.userPosition}>
          <Text>Votre position: #{userRank}</Text>
        </View>
      )}
    </View>
  );
};
```

### 4. COMBO SYSTÈME:

```tsx
// Système de combo pour réactions consécutives
const useComboSystem = () => {
  const [combo, setCombo] = useState(0);
  const [lastReactionTime, setLastReactionTime] = useState(null);
  
  const addReaction = () => {
    const now = Date.now();
    
    // Si dernière réaction < 10 secondes, augmenter combo
    if (lastReactionTime && (now - lastReactionTime) < 10000) {
      setCombo(prev => prev + 1);
      
      // Bonus points selon combo
      const bonusPoints = Math.floor(combo / 5) * 10;
      if (bonusPoints > 0) {
        showComboNotification(combo, bonusPoints);
      }
    } else {
      setCombo(1);
    }
    
    setLastReactionTime(now);
  };
  
  return { combo, addReaction };
};
```

**RÉSULTAT ATTENDU:**
Système de gamification complet avec animations, achievements, leaderboard et système de combo pour maximiser l'engagement.

---

## 📋 **Prompt 7: Upload de Photos et Médias Optimisé**

Tu es un expert en gestion de médias React Native. Améliore le système d'upload avec compression, preview, édition et gestion multi-médias.

**FICHIERS:** `app/(tabs)/create.tsx`, `lib/mediaUtils.ts` (à créer)

**IMPLÉMENTATIONS:**

### 1. UTILITAIRES DE GESTION MÉDIA:

```tsx
// lib/mediaUtils.ts
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as VideoThumbnails from 'expo-video-thumbnails';
import * as FileSystem from 'expo-file-system';

export class MediaManager {
  static async pickImage(options = {}) {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: options.aspect || [4, 3],
      quality: 0.9,
      allowsMultipleSelection: options.multiple || false,
      selectionLimit: options.limit || 1,
    });
    
    if (!result.canceled) {
      return await this.processImages(result.assets);
    }
    return null;
  }
  
  static async takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'Autorisez l\'accès à la caméra');
      return null;
    }
    
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.9,
    });
    
    if (!result.canceled) {
      return await this.processImages(result.assets);
    }
    return null;
  }
  
  static async processImages(assets) {
    const processed = [];
    
    for (const asset of assets) {
      // Obtenir infos fichier
      const fileInfo = await FileSystem.getInfoAsync(asset.uri);
      
      // Compression si > 2MB
      let finalUri = asset.uri;
      if (fileInfo.size > 2 * 1024 * 1024) {
        const compressed = await this.compressImage(asset.uri);
        finalUri = compressed.uri;
      }
      
      // Générer thumbnail
      const thumbnail = await this.generateThumbnail(finalUri);
      
      processed.push({
        uri: finalUri,
        thumbnail,
        width: asset.width,
        height: asset.height,
        size: fileInfo.size,
        type: asset.type,
      });
    }
    
    return processed;
  }
  
  static async compressImage(uri, quality = 0.7) {
    // Calculer dimensions optimales
    const { width, height } = await this.getImageDimensions(uri);
    const maxDimension = 1920;
    
    let newWidth = width;
    let newHeight = height;
    
    if (width > maxDimension || height > maxDimension) {
      const ratio = Math.min(maxDimension / width, maxDimension / height);
      newWidth = width * ratio;
      newHeight = height * ratio;
    }
    
    return await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: newWidth, height: newHeight } }],
      { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
    );
  }
  
  static async generateThumbnail(uri, isVideo = false) {
    if (isVideo) {
      const { uri: thumbnailUri } = await VideoThumbnails.getThumbnailAsync(uri, {
        time: 1000,
      });
      return thumbnailUri;
    }
    
    // Pour image, créer version 200x200
    return await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 200, height: 200 } }],
      { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
    );
  }
  
  static async uploadToSupabase(file, bucket = 'posts') {
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const fileExt = file.uri.split('.').pop();
    const filePath = `${fileName}.${fileExt}`;
    
    // Convertir en blob
    const response = await fetch(file.uri);
    const blob = await response.blob();
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, blob, {
        contentType: file.type || 'image/jpeg',
        upsert: false,
      });
      
    if (error) throw error;
    
    // Retourner URL publique
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);
      
    return publicUrl;
  }
}
```

### 2. ÉDITEUR D'IMAGE INTÉGRÉ:

```tsx
// components/ImageEditor.tsx
import { Canvas, Circle, Path, Skia, TouchInfo, useCanvasRef } from '@shopify/react-native-skia';

export const ImageEditor = ({ imageUri, onSave }) => {
  const [editMode, setEditMode] = useState('filter'); // filter, crop, draw, text
  const [currentFilter, setCurrentFilter] = useState(null);
  const canvasRef = useCanvasRef();
  
  // Filtres prédéfinis
  const filters = [
    { name: 'Original', matrix: null },
    { name: 'Lumineux', matrix: brightnessMatrix(1.2) },
    { name: 'Vintage', matrix: sepiaMatrix() },
    { name: 'Noir & Blanc', matrix: grayscaleMatrix() },
    { name: 'Contraste', matrix: contrastMatrix(1.3) },
  ];
  
  // Mode dessin
  const DrawingCanvas = () => {
    const [paths, setPaths] = useState([]);
    const [currentPath, setCurrentPath] = useState([]);
    
    const handleTouch = (touchInfo: TouchInfo) => {
      const { x, y } = touchInfo;
      
      if (touchInfo.type === 'start') {
        setCurrentPath([{ x, y }]);
      } else if (touchInfo.type === 'active') {
        setCurrentPath(prev => [...prev, { x, y }]);
      } else if (touchInfo.type === 'end') {
        setPaths(prev => [...prev, currentPath]);
        setCurrentPath([]);
      }
    };
    
    return (
      <Canvas style={styles.canvas} ref={canvasRef} onTouch={handleTouch}>
        <Image source={imageUri} fit="contain" />
        {paths.map((path, index) => (
          <Path
            key={index}
            path={Skia.Path.Make().moveTo(path[0].x, path[0].y)
              .lineTo(...path.slice(1).flatMap(p => [p.x, p.y]))}
            color="red"
            style="stroke"
            strokeWidth={3}
          />
        ))}
      </Canvas>
    );
  };
  
  // Mode recadrage
  const CropMode = () => {
    const [cropArea, setCropArea] = useState({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    });
    
    return (
      <View style={styles.cropContainer}>
        <Image source={{ uri: imageUri }} style={styles.cropImage} />
        <View
          style={[styles.cropOverlay, cropArea]}
          {...panResponder.panHandlers}
        />
        <View style={styles.cropHandles}>
          {/* Poignées de redimensionnement */}
        </View>
      </View>
    );
  };
  
  // Mode texte
  const TextMode = () => {
    const [texts, setTexts] = useState([]);
    const [currentText, setCurrentText] = useState('');
    const [textPosition, setTextPosition] = useState({ x: 50, y: 50 });
    
    return (
      <View style={styles.textContainer}>
        <Image source={{ uri: imageUri }} />
        {texts.map((text, index) => (
          <Text
            key={index}
            style={[styles.overlayText, { left: text.x, top: text.y }]}
          >
            {text.content}
          </Text>
        ))}
        <TextInput
          value={currentText}
          onChangeText={setCurrentText}
          placeholder="Ajouter du texte..."
          onSubmitEditing={() => {
            setTexts([...texts, {
              content: currentText,
              x: textPosition.x,
              y: textPosition.y,
            }]);
            setCurrentText('');
          }}
        />
      </View>
    );
  };
  
  const saveEditedImage = async () => {
    // Capturer canvas comme image
    const snapshot = await canvasRef.current?.makeImageSnapshot();
    if (snapshot) {
      const base64 = snapshot.encodeToBase64();
      onSave(`data:image/png;base64,${base64}`);
    }
  };
  
  return (
    <View style={styles.editor}>
      {/* Barre d'outils */}
      <View style={styles.toolbar}>
        <TouchableOpacity onPress={() => setEditMode('filter')}>
          <Icon name="filter" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setEditMode('crop')}>
          <Icon name="crop" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setEditMode('draw')}>
          <Icon name="pen" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setEditMode('text')}>
          <Icon name="text" />
        </TouchableOpacity>
      </View>
      
      {/* Zone d'édition selon mode */}
      {editMode === 'filter' && <FilterMode />}
      {editMode === 'crop' && <CropMode />}
      {editMode === 'draw' && <DrawingCanvas />}
      {editMode === 'text' && <TextMode />}
      
      {/* Boutons action */}
      <View style={styles.actions}>
        <TouchableOpacity onPress={onCancel}>
          <Text>Annuler</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={saveEditedImage}>
          <Text>Enregistrer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
```

### 3. GALERIE MÉDIA INTÉGRÉE:

```tsx
// components/MediaGallery.tsx
export const MediaGallery = ({ media, onSelect, onDelete }) => {
  const [viewMode, setViewMode] = useState('grid'); // grid, carousel
  const [selectedItems, setSelectedItems] = useState([]);
  const [isSelecting, setIsSelecting] = useState(false);
  
  return (
    <View style={styles.gallery}>
      {/* Header avec options */}
      <View style={styles.galleryHeader}>
        <Text style={styles.galleryTitle}>Médias ({media.length})</Text>
        <View style={styles.galleryActions}>
          <TouchableOpacity onPress={() => setViewMode(viewMode === 'grid' ? 'carousel' : 'grid')}>
            <Icon name={viewMode === 'grid' ? 'grid' : 'carousel'} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsSelecting(!isSelecting)}>
            <Text>{isSelecting ? 'Annuler' : 'Sélectionner'}</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {viewMode === 'grid' ? (
        <FlatList
          data={media}
          numColumns={3}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => isSelecting ? toggleSelect(item.id) : onSelect(item)}
              onLongPress={() => startSelection(item.id)}
              style={styles.gridItem}
            >
              <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
              {item.type === 'video' && (
                <View style={styles.videoOverlay}>
                  <PlayCircle size={24} color="white" />
                  <Text style={styles.duration}>{item.duration}</Text>
                </View>
              )}
              {isSelecting && selectedItems.includes(item.id) && (
                <View style={styles.selectedOverlay}>
                  <CheckCircle size={24} color="white" />
                </View>
              )}
            </TouchableOpacity>
          )}
        />
      ) : (
        <ScrollView horizontal pagingEnabled>
          {media.map((item) => (
            <View key={item.id} style={styles.carouselItem}>
              {item.type === 'video' ? (
                <Video
                  source={{ uri: item.uri }}
                  style={styles.carouselMedia}
                  useNativeControls
                />
              ) : (
                <Image source={{ uri: item.uri }} style={styles.carouselMedia} />
              )}
            </View>
          ))}
        </ScrollView>
      )}
      
      {/* Actions de sélection multiple */}
      {isSelecting && selectedItems.length > 0 && (
        <View style={styles.selectionActions}>
          <TouchableOpacity onPress={deleteSelected}>
            <Text>Supprimer ({selectedItems.length})</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={shareSelected}>
            <Text>Partager</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};
```

### 4. UPLOAD PROGRESSIF ET QUEUE:

```tsx
// hooks/useUploadQueue.ts
export const useUploadQueue = () => {
  const [queue, setQueue] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({});
  
  const addToQueue = (files) => {
    const items = files.map(file => ({
      id: Date.now() + Math.random(),
      file,
      status: 'pending',
      progress: 0,
      url: null,
      error: null,
    }));
    
    setQueue(prev => [...prev, ...items]);
    
    if (!uploading) {
      processQueue();
    }
  };
  
  const processQueue = async () => {
    setUploading(true);
    
    while (queue.length > 0) {
      const item = queue.find(i => i.status === 'pending');
      if (!item) break;
      
      try {
        // Mettre à jour statut
        updateItemStatus(item.id, 'uploading');
        
        // Upload avec progression
        const url = await uploadWithProgress(item.file, (progress) => {
          setProgress(prev => ({ ...prev, [item.id]: progress }));
        });
        
        updateItemStatus(item.id, 'completed', url);
      } catch (error) {
        updateItemStatus(item.id, 'failed', null, error.message);
      }
    }
    
    setUploading(false);
  };
  
  const uploadWithProgress = async (file, onProgress) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          onProgress(percentComplete);
        }
      });
      
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          resolve(response.url);
        } else {
          reject(new Error('Upload failed'));
        }
      });
      
      xhr.open('POST', `${SUPABASE_URL}/storage/v1/object/posts`);
      xhr.setRequestHeader('Authorization', `Bearer ${SUPABASE_ANON_KEY}`);
      
      const formData = new FormData();
      formData.append('file', file);
      
      xhr.send(formData);
    });
  };
  
  return { queue, addToQueue, progress, uploading };
};
```

**RÉSULTAT ATTENDU:**
Système complet de gestion média avec édition, compression intelligente, galerie intégrée et upload progressif.

---

## 📋 **Prompt 8: Performance et Optimisations Finales**

Tu es un expert en optimisation React Native. Finalise l'application avec optimisations de performance, cache, et améliorations UX.

**IMPLÉMENTATIONS:**

### 1. SYSTÈME DE CACHE INTELLIGENT:

```tsx
// lib/cacheManager.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export class CacheManager {
  static CACHE_DURATION = {
    POSTS: 5 * 60 * 1000, // 5 minutes
    PROFILES: 30 * 60 * 1000, // 30 minutes
    MESSAGES: 60 * 1000, // 1 minute
  };
  
  static async get(key: string, fetcher: () => Promise<any>, duration: number) {
    // Vérifier cache
    const cached = await AsyncStorage.getItem(`cache_${key}`);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < duration) {
        return data;
      }
    }
    
    // Fetch et mettre en cache
    const fresh = await fetcher();
    await this.set(key, fresh);
    return fresh;
  }
  
  static async set(key: string, data: any) {
    await AsyncStorage.setItem(`cache_${key}`, JSON.stringify({
      data,
      timestamp: Date.now(),
    }));
  }
  
  static async invalidate(pattern: string) {
    const keys = await AsyncStorage.getAllKeys();
    const toRemove = keys.filter(k => k.startsWith(`cache_${pattern}`));
    await AsyncStorage.multiRemove(toRemove);
  }
  
  // Préchargement intelligent
  static async preload() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    // Précharger données critiques
    const promises = [
      this.get('feed_posts', () => supabase.from('posts').select('*').limit(20), this.CACHE_DURATION.POSTS),
      this.get(`profile_${user.id}`, () => supabase.from('profiles').select('*').eq('id', user.id).single(), this.CACHE_DURATION.PROFILES),
      this.get('groups', () => supabase.from('groups').select('*').limit(10), this.CACHE_DURATION.POSTS),
    ];
    
    await Promise.all(promises);
  }
}
```

### 2. OPTIMISATION DES LISTES AVEC VIRTUALISATION:

```tsx
// components/OptimizedFeed.tsx
import { FlashList } from '@shopify/flash-list';

export const OptimizedFeed = ({ posts }) => {
  const [visibleItems, setVisibleItems] = useState(new Set());
  
  const renderPost = useCallback(({ item }) => {
    const isVisible = visibleItems.has(item.id);
    
    return (
      <View>
        {/* Lazy load images */}
        {isVisible ? (
          <Image source={{ uri: item.image }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.placeholder]} />
        )}
        
        {/* Contenu toujours rendu */}
        <Text>{item.content}</Text>
        
        {/* Animations conditionnelles */}
        {isVisible && <AnimatedReactions post={item} />}
      </View>
    );
  }, [visibleItems]);
  
  const onViewableItemsChanged = useCallback(({ viewableItems }) => {
    setVisibleItems(new Set(viewableItems.map(v => v.item.id)));
  }, []);
  
  return (
    <FlashList
      data={posts}
      renderItem={renderPost}
      estimatedItemSize={300}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={{
        itemVisiblePercentThreshold: 50,
      }}
      // Optimisations
      drawDistance={500}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      initialNumToRender={5}
    />
  );
};
```

### 3. OPTIMISATION DES IMAGES:

```tsx
// components/OptimizedImage.tsx
import FastImage from 'react-native-fast-image';

export const OptimizedImage = ({ source, style, priority = 'normal' }) => {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // URL optimisée avec transformation Supabase
  const getOptimizedUrl = (url: string, width: number) => {
    if (!url || !url.includes('supabase')) return url;
    
    // Ajouter paramètres de transformation
    return `${url}?width=${width}&quality=80&format=webp`;
  };
  
  const { width } = style;
  const optimizedSource = {
    uri: getOptimizedUrl(source.uri, width),
    priority: FastImage.priority[priority],
    cache: FastImage.cacheControl.immutable,
  };
  
  return (
    <View style={style}>
      {loading && (
        <View style={[StyleSheet.absoluteFill, styles.skeleton]}>
          <Skeleton />
        </View>
      )}
      
      <FastImage
        style={style}
        source={error ? require('./assets/placeholder.png') : optimizedSource}
        onLoad={() => setLoading(false)}
        onError={() => {
          setError(true);
          setLoading(false);
        }}
        resizeMode={FastImage.resizeMode.cover}
      />
    </View>
  );
};
```

### 4. OPTIMISATION MÉMOIRE ET PERFORMANCE:

```tsx
// hooks/useMemoryOptimization.ts
export const useMemoryOptimization = () => {
  useEffect(() => {
    // Nettoyer cache images périodiquement
    const interval = setInterval(() => {
      FastImage.clearMemoryCache();
    }, 5 * 60 * 1000); // 5 minutes
    
    // Listener pour mémoire faible
    const subscription = AppState.addEventListener('memoryWarning', () => {
      // Nettoyer caches
      FastImage.clearMemoryCache();
      FastImage.clearDiskCache();
      AsyncStorage.clear();
      
      // Réduire nombre d'items rendus
      store.dispatch(reducePaginationLimit());
    });
    
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, []);
};

// Optimisation des re-renders
export const PostCard = memo(({ post, onReaction }) => {
  // Utiliser useMemo pour calculs coûteux
  const totalReactions = useMemo(() => {
    return Object.values(post.reactions).reduce((a, b) => a + b, 0);
  }, [post.reactions]);
  
  // Callbacks mémorisés
  const handleReaction = useCallback((type) => {
    onReaction(post.id, type);
  }, [post.id, onReaction]);
  
  return (
    <View style={styles.card}>
      {/* Contenu */}
    </View>
  );
}, (prevProps, nextProps) => {
  // Comparaison personnalisée
  return prevProps.post.id === nextProps.post.id &&
         prevProps.post.reactions === nextProps.post.reactions;
});
```

### 5. OFFLINE SUPPORT:

```tsx
// lib/offlineManager.ts
import NetInfo from '@react-native-community/netinfo';

export class OfflineManager {
  static queue = [];
  static isOnline = true;
  
  static async init() {
    // Écouter changements de connexion
    NetInfo.addEventListener(state => {
      this.isOnline = state.isConnected;
      
      if (this.isOnline) {
        this.processQueue();
      }
    });
    
    // Charger queue persistée
    const saved = await AsyncStorage.getItem('offline_queue');
    if (saved) {
      this.queue = JSON.parse(saved);
    }
  }
  
  static async addToQueue(action) {
    this.queue.push({
      id: Date.now(),
      action,
      timestamp: new Date().toISOString(),
      retries: 0,
    });
    
    await this.persistQueue();
    
    if (this.isOnline) {
      this.processQueue();
    }
  }
  
  static async processQueue() {
    while (this.queue.length > 0 && this.isOnline) {
      const item = this.queue[0];
      
      try {
        await this.executeAction(item.action);
        this.queue.shift();
        await this.persistQueue();
      } catch (error) {
        item.retries++;
        
        if (item.retries > 3) {
          // Abandonner après 3 essais
          this.queue.shift();
          // Notifier l'utilisateur
        } else {
          // Réessayer plus tard
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    }
  }
  
  static async executeAction(action) {
    switch (action.type) {
      case 'CREATE_POST':
        return supabase.from('posts').insert(action.data);
      case 'SEND_MESSAGE':
        return supabase.from('direct_messages').insert(action.data);
      case 'ADD_REACTION':
        return supabase.from('reactions').insert(action.data);
      default:
        throw new Error('Unknown action type');
    }
  }
  
  static async persistQueue() {
    await AsyncStorage.setItem('offline_queue', JSON.stringify(this.queue));
  }
}

// Hook pour utilisation
export const useOffline = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingActions, setPendingActions] = useState(0);
  
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected);
      setPendingActions(OfflineManager.queue.length);
    });
    
    return unsubscribe;
  }, []);
  
  return { isOnline, pendingActions };
};
```

### 6. ANALYTICS ET MONITORING:

```tsx
// lib/analytics.ts
export class Analytics {
  static async track(event: string, properties?: any) {
    // Tracking local
    const analyticsData = {
      event,
      properties,
      timestamp: new Date().toISOString(),
      user_id: (await supabase.auth.getUser()).data.user?.id,
    };
    
    // Sauvegarder dans Supabase
    await supabase.from('analytics').insert(analyticsData);
    
    // Métriques de performance
    if (event === 'screen_view') {
      const renderTime = performance.now();
      await this.trackPerformance('screen_render', { 
        screen: properties.screen,
        duration: renderTime,
      });
    }
  }
  
  static async trackPerformance(metric: string, data: any) {
    await supabase.from('performance_metrics').insert({
      metric,
      data,
      device_info: {
        platform: Platform.OS,
        version: Platform.Version,
        model: Device.modelName,
      },
    });
  }
}
```

**RÉSULTAT ATTENDU:**
Application optimisée avec cache intelligent, virtualisation, support offline et monitoring de performance.

---

## 🎯 **Résumé et Plan d'Action**

### **Ordre de Mise en Œuvre Recommandé:**

1. **🔧 Prompt 1** - Configuration Supabase (Base essentielle)
2. **📱 Prompt 2** - Feed Twitter-like (Impact visuel immédiat)
3. **📝 Prompt 3** - Système de publication amélioré
4. **💬 Prompt 4** - Messagerie temps réel
5. **👥 Prompt 5** - Système de groupes complet
6. **🎮 Prompt 6** - Gamification et réactions
7. **📷 Prompt 7** - Upload de médias optimisé
8. **⚡ Prompt 8** - Optimisations de performance

### **Impact Attendu:**

- **Backend Supabase** parfaitement configuré et sécurisé
- **Feed "Glow"** moderne et fluide style Twitter
- **Publications** avec preview et validation
- **Messagerie** complète avec notifications push
- **Groupes** avec administration avancée
- **Gamification** pour maximiser l'engagement
- **Upload médias** avec édition intégrée
- **Performance** optimisée avec cache et offline

---

*Ces prompts transformeront votre application en un réseau social complet et performant ! 🚀*