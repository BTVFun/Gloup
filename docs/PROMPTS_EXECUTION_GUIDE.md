# Guide d'Exécution des Prompts - GLOUP 🚀

## Vue d'Ensemble

Ce document contient les prompts d'exécution optimisés pour chaque phase du développement de GLOUP. Les prompts ont été créés par un agent prompt-engineer spécialisé et sont prêts à être utilisés avec les agents Claude Code.

---

## 📊 Résumé des Phases

| Phase | Durée | Priorité | Agents Principaux |
|-------|-------|----------|-------------------|
| **Phase 1** | 2 semaines | HAUTE | ui-ux-designer, cli-ui-designer, code-reviewer |
| **Phase 2** | 2 semaines | HAUTE | backend-architect, supabase-specialists, performance-benchmarker |
| **Phase 3** | 3 semaines | HAUTE | fullstack-developer, mobile-developer, security-manager |
| **Phase 4** | 2 semaines | MOYENNE | product-strategist, coder, analytics |
| **Phase 5** | 1 semaine | HAUTE | production-validator, deployment-engineer, technical-writer |

---

## 🎨 PHASE 1: Design & UI Polish

### Prompt Principal d'Orchestration

```
Tu es le chef d'orchestre de la Phase 1 pour GLOUP. Coordonne la refonte complète du design pour éliminer le look "généré par IA".

CONTEXTE:
- App: Réseau social bienveillant React Native/Expo
- Couleur principale: #2B2E78
- Accent secondaire: #FAFBFF
- Objectif: Design chaleureux et distinctif

TÂCHES PRIORITAIRES:
1. Implémenter nouveau design system (tokens, typography, spacing)
2. Refondre PostCard, Header, TabBar, Buttons
3. Ajouter animations et micro-interactions
4. Adapter le mode sombre

CONTRAINTES:
- Performance: 60fps minimum
- Accessibilité: WCAG AA
- Cohérence: Un seul pack d'icônes
- Pas de glassmorphism excessif

LIVRABLES:
- [ ] Theme tokens implémentés
- [ ] 10 composants principaux refondus
- [ ] Animations fluides
- [ ] Mode sombre complet
```

### Prompts Spécifiques Phase 1

#### 1. UI/UX Designer Agent
```
Refonte le design de GLOUP pour créer une identité visuelle distinctive et chaleureuse.

BRAND GUIDELINES:
- Primary: #2B2E78 (deep blue-purple)
- Secondary: #FAFBFF (soft white-blue)
- Neutrals: Warm light palette
- Border radius: Medium (12px)
- Spacing: 4pt/8pt grid
- Typography: System fonts with clear hierarchy

COMPOSANTS À DESIGNER:
1. PostCard: Sans bordures, ombres douces, interactions délicates
2. Header: Effet blur subtil, hauteur réduite, logo space
3. TabBar: Animations spring, haptic feedback
4. Buttons: Mixtes arrondis avec micro-interactions
5. Inputs: Focus states élégants, validation en temps réel

ANTI-PATTERNS À ÉVITER:
- Dégradés voyants génériques
- Glassmorphism excessif
- Icônes incohérentes
- Gris monotones
- Espacement aléatoire

Crée des maquettes et implémente les composants en respectant ces guidelines.
```

#### 2. Animation Implementation
```
Implémente des micro-interactions pour GLOUP qui ajoutent de la personnalité sans impacter les performances.

ANIMATIONS REQUISES:
1. Like Animation: Burst effect avec haptic
2. Navigation: Shared element transitions
3. Pull-to-refresh: Spring animation custom
4. Loading states: Skeleton screens shimmer
5. Success feedback: Confetti subtil

IMPLÉMENTATION:
- React Native Reanimated 3
- 60fps obligatoire
- Gesture-driven où possible
- Respecter reduced motion

CODE EXEMPLE:
const likeAnimation = () => {
  'worklet';
  const scale = withSpring(1.2, {
    damping: 12,
    stiffness: 200
  });
  runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
  return withSequence(scale, withSpring(1));
};
```

---

## 🔧 PHASE 2: Backend Robuste & Realtime

### Prompt Principal Backend

```
Optimise et sécurise le backend Supabase de GLOUP avec realtime et performance production.

ARCHITECTURE ACTUELLE:
- Tables: profiles, posts, reactions, groups, messages
- Auth: Email/password basique
- Storage: Avatars et posts buckets

OPTIMISATIONS REQUISES:
1. Indexes stratégiques sur queries fréquentes
2. RLS policies complètes et testées
3. Realtime subscriptions optimisées
4. Edge Functions pour logique complexe
5. Cache multi-couches

SÉCURITÉ:
- Validation inputs stricte
- Rate limiting par endpoint
- Encryption pour données sensibles
- Audit logs

PERFORMANCE CIBLES:
- API response < 200ms (P95)
- Realtime latency < 100ms
- DB queries < 50ms
```

### Edge Functions Critiques

```typescript
// generate-feed: Algorithme de feed personnalisé
// process-image: Resize et optimization
// send-notification: Dispatch multi-canal
// moderate-content: IA modération
// aggregate-analytics: Métriques temps réel
```

---

## 👥 PHASE 3: Features Sociales Complètes

### Prompt Système Social

```
Implémente un système social complet pour GLOUP avec follow, DM, comments et search.

FEATURES PRIORITAIRES:

1. FOLLOW SYSTEM:
- Follow/unfollow avec requests pour comptes privés
- Suggestions intelligentes
- Block/mute functionality
- Privacy settings

2. MESSAGES DIRECTS:
- Chiffrement E2E optionnel
- Typing indicators temps réel
- Read receipts
- Media sharing

3. COMMENTAIRES:
- Threading avec depth limite
- Mentions @user
- Hashtags #topic
- Rich reactions

4. RECHERCHE:
- Full-text search PostgreSQL
- Filtres avancés
- Trending topics
- Suggestions intelligentes

DATABASE: Schemas complets fournis
UI: Components React Native TypeScript
REALTIME: Supabase channels
```

---

## 🏆 PHASE 4: Gamification & Engagement

### Prompt Gamification System

```
Crée un système de gamification engageant pour GLOUP qui encourage les interactions positives.

SYSTÈMES À IMPLÉMENTER:

1. BADGES & ACHIEVEMENTS:
- 50+ badges dans 6 catégories
- Progress tracking temps réel
- Rareté et niveaux
- Showcase sur profil

2. CHALLENGES COMMUNAUTAIRES:
- Défis hebdomadaires
- Leaderboards dynamiques
- Récompenses progressives
- Participation solo/équipe

3. STORIES/STATUS:
- Contenu éphémère 24h
- Polls et questions interactifs
- Story highlights
- Analytics détaillées

4. NOTIFICATIONS INTELLIGENTES:
- ML pour timing optimal
- Segmentation comportementale
- A/B testing intégré
- Multi-canal avec fatigue prevention

MÉCANIQUES VIRALES:
- Invite rewards
- Streak bonuses
- Social proof
- FOMO elements subtils
```

---

## 🚀 PHASE 5: Polish & Launch

### Prompt Production Readiness

```
Prépare GLOUP pour le lancement production avec polish final et monitoring.

CHECKLIST CRITIQUE:

1. ONBOARDING:
- [ ] Welcome flow 3 écrans max
- [ ] Profile setup wizard
- [ ] Tutorial interactif
- [ ] First post encouragement
- [ ] Permission requests optimaux

2. PERFORMANCE:
- [ ] Bundle size < 40MB
- [ ] Startup time < 1s
- [ ] 60fps sur tous devices
- [ ] Memory usage < 200MB
- [ ] Battery drain minimal

3. TESTING:
- [ ] Unit tests 90% coverage
- [ ] E2E tests critiques paths
- [ ] Visual regression tests
- [ ] Accessibility audit
- [ ] Security pen testing

4. MONITORING:
- [ ] Sentry error tracking
- [ ] Analytics funnel complet
- [ ] Performance monitoring
- [ ] User session replay
- [ ] A/B testing framework

5. LAUNCH:
- [ ] Feature flags système
- [ ] Staged rollout plan
- [ ] Rollback procedures
- [ ] Support documentation
- [ ] App Store assets optimisés
```

---

## 🛠️ Commandes d'Exécution

### Lancement Séquentiel (Recommandé)

```bash
# Phase 1: Design
npx claude-flow sparc run ui-designer "Refonte design GLOUP selon Phase 1"
npx claude-flow sparc run animator "Implémenter animations Phase 1"

# Phase 2: Backend
npx claude-flow sparc run backend-architect "Optimiser backend selon Phase 2"
npx claude-flow sparc run realtime-optimizer "Implémenter realtime Phase 2"

# Phase 3: Social
npx claude-flow sparc run fullstack "Implémenter features sociales Phase 3"

# Phase 4: Gamification
npx claude-flow sparc run gamification "Créer système gamification Phase 4"

# Phase 5: Launch
npx claude-flow sparc run production "Préparer launch selon Phase 5"
```

### Lancement Parallèle (Agents Multiples)

```bash
# Utiliser Claude Code Task tool pour parallélisation
# Dans un seul message:

Task("UI Designer", "Refonte design GLOUP Phase 1", "ui-ux-designer")
Task("Backend Architect", "Optimiser backend Phase 2", "backend-architect")
Task("Fullstack Dev", "Features sociales Phase 3", "fullstack-developer")
Task("Performance", "Optimisations Phase 5", "performance-benchmarker")
```

---

## 📈 Métriques de Succès

### KPIs par Phase

| Phase | Métrique | Cible | Mesure |
|-------|----------|-------|---------|
| **Phase 1** | Design Consistency | 100% | Audit visuel |
| **Phase 1** | Animation FPS | 60fps | Performance monitor |
| **Phase 2** | API Latency | <200ms | Monitoring |
| **Phase 2** | Realtime Delay | <100ms | WebSocket metrics |
| **Phase 3** | Feature Completion | 100% | Tests E2E |
| **Phase 3** | User Engagement | +50% | Analytics |
| **Phase 4** | Daily Active Users | +30% | Analytics |
| **Phase 4** | Retention D7 | >40% | Cohort analysis |
| **Phase 5** | Crash Rate | <1% | Sentry |
| **Phase 5** | App Rating | >4.5 | Store reviews |

---

## ⚠️ Points d'Attention Critiques

1. **Sécurité**: Toujours valider côté serveur, jamais trust client
2. **Performance**: Profiler régulièrement, optimiser les re-renders
3. **Accessibilité**: Tester avec screen readers iOS/Android
4. **Offline**: Implémenter cache et sync progressive
5. **Scalabilité**: Préparer pour 100K+ users dès le début

---

## 🔄 Workflow de Validation

Après chaque phase:

1. **Code Review** par agent `code-reviewer`
2. **Tests** par agent `tester`
3. **Performance** par agent `performance-benchmarker`
4. **Security** par agent `security-manager`
5. **Documentation** par agent `technical-writer`

---

## 📝 Notes Finales

- Les prompts sont conçus pour être autonomes mais peuvent être chainés
- Chaque prompt inclut validation et tests
- Focus sur l'expérience utilisateur bienveillante
- Architecture scalable dès le début
- Monitoring et analytics intégrés partout

Ce guide est votre référence pour exécuter le développement de GLOUP de manière systématique et professionnelle. Chaque prompt a été optimisé pour produire du code production-ready.

Bonne exécution ! 🚀