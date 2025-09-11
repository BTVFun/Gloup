# Nouveau design – Brief à remplir

Ce document sert de brief complet pour repenser le design de l’application (Expo/React Native + Web). Plus tes réponses sont précises, plus le rendu sera distinctif, moins « IA », et mieux adapté à tes objectifs.

Comment remplir
- Remplis les champs entre guillemets ou listes. Supprime ce qui ne s’applique pas.
- Tu peux coller des liens (Figma, captures, refs) directement sous les sections.
- Si tu manques de temps, complète au minimum la section « Décisions rapides (12 choix) ».

---

## 0) Décisions rapides (12 choix)
- Couleur de marque (hex) : "#..."
- Couleur d’accent secondaire (hex) : "#..."
- Luminosité des neutres (clair vs gris chaud/froid) : "clair chaud | clair froid | neutre | sombre"
- Rayon des bords global (xs/sm/md/lg) : "xs | sm | md | lg"
- Densité d’interface (espacement) : "compacte | standard | aérée"
- Typographie (titres + corps) : "Titre: … / Corps: …"
- Style des boutons : "pleins | outline | mixtes" + forme "carré | arrondi | pilule"
- App Header (barre du haut) : "opaque | translucide | verre léger | dégradé discret"
- Listes/Cartes : "avec séparateurs fins | sans séparateurs | cartes avec ombre | cartes sans ombre"
- Mode sombre : "oui (inversé) | oui (adapté) | non"
- Niveau d’animation : "léger | moyen | riche" + haptique "oui/non"
- Ton de la copie (UX writing) : "direct | chaleureux | premium | fun | sérieux"

---

## 1) Objectifs & Contexte
- Objectifs principaux (1–3) :
  - "…"
  - "…"
- Problèmes actuels à corriger :
  - "a un look IA / trop générique"
  - "…"
- Plateformes cibles : "iOS | Android | Web"
- Marchés/langues : "fr | en | …"
- Contraintes produit (ce qu’on ne change pas) : "navigation, flux, priorités…"
- Mes risques ou contraintes techniques : "…"

## 2) Marque & Ton
- Valeurs/positionnement : "…"
- Adjectifs identitaires (5–7) : "…"
- Références (liens, apps, marques) :
  - "…"
- Ce que tu ne veux surtout pas :
  - "verre/blur flashy | dégradés stock | trop de coins arrondis | icônes incohérentes | …"

## 3) Identité visuelle
### 3.1 Couleurs
- Palette de marque (hex) :
  - Primaire: "#…" (50/100/200/300/400/500/600/700/800/900 si dispo)
  - Secondaire: "#…"
  - Accent: "#…"
- Couleurs sémantiques :
  - Succès: "#…" | Avert.: "#…" | Danger: "#…" | Info: "#…"
- Neutres (gris) : "chaud | neutre | froid" + exemples hex: "#… → #…"
- Accessibilité : objectifs de contraste "AA | AAA" pour texte, éléments interactifs.
- Interdits (ex: dégradés arc-en-ciel, saturations extrêmes, etc.) : "…"

### 3.2 Typographie
- Familles (Titres / Corps) : "… / …" (+ liens licence/Google Fonts)
- Variantes/poids autorisés : "400/500/600/700…"
- Échelle typographique (px) : "12, 14, 16, 20, 24, 32, 40…"
- Règles d’usage : H1/H2/H3, body, caption, boutons, onglets.
- Fallback iOS/Android/Web : "SF Pro / Roboto / System UI…"

### 3.3 Iconographie
- Style : "outline 2px | filled | duotone" – cohérence stricte.
- Pack/source : "Phosphor | Heroicons | Lucide | custom".
- Tailles standard : "16/20/24/32" – zones tactiles 44x44 min.

### 3.4 Illustration & médias
- Style d’illustration/photo : "flat | 3D discret | photo réaliste | mixte".
- Traitement : "désaturation légère | ombres douces | coins arrondis | pas de bords".
- Licences/banques : "…"

## 4) Layout & Spacing
- Grille d’espacement : "4pt | 8pt" (préciser si mixte).
- Rayons (radius) : "4 | 8 | 12 | 16 | pilule".
- Ombres/élévation : "aucune | douce | moyenne | marquée" (iOS vs Android).
- Largeurs container Web : "sm: 640 / md: 768 / lg: 1024 / xl: 1280" (ou autre).
- Safe areas (haut/bas) : "header collé | header flottant | tabs flottantes".
- Densité par vue : "flux: aéré | détails: standard | formulaires: compact".

## 5) Thèmes (clair/sombre)
- Stratégie : "clair par défaut, sombre auto | sélecteur manuel | sombre only".
- Fond du clair : "blanc pur | gris 50 | teinte chaleureuse légère".
- Fond du sombre : "gris 900 | graphite | near-black".
- Contrastes & surfaces : "surfaces nivelées (0/1/2/3) | bordures de séparation fines | sans bordures".
- Haute visibilité (optionnel) : "oui/non" et règles.

## 6) Composants à designer/préciser
Coche et précise les variantes/états. Indique si présent dans le repo (ex: `components/ui/PostCard.tsx`, `MediaCarousel.tsx`).
- App Header (TopBar)
  - Variantes: "avec recherche | avec avatar | transparent au scroll".
  - États: "scrolled | sticky | hidden on scroll".
- Onglets (Bottom Tabs / Tabs supérieures)
  - Style: "texte | icônes | mixtes"; souligné vs pilule.
- Boutons (Primary/Secondary/Tertiary, Icon-only)
  - États: "default/hover? (web)/pressed/focus/disabled/loading".
  - Formes: "carré | arrondi | pilule"; tailles: "sm/md/lg".
- Champs & Formulaires
  - Inputs, selects, toggles, sliders, date pickers; erreurs/aides.
- Cartes & Listes (ex: PostCard, ListItem)
  - Séparateurs: "oui/non"; ombre: "oui/non"; thumbnail: "oui/non".
- Media (MediaCarousel, lecteur vidéo)
  - Indicateurs, pagination, gestes (swipe/pinch), placeholders.
- Avatars & Badges
  - Anneau de statut, tailles, fallback lettres/couleur.
- Modales / BottomSheets
  - Poignées, coins, obscurcissement fond, safe area.
- Notifications/toasts
  - Success/warn/error/info + durées.
- États vides & skeletons
  - Illustrations, copy, actions de rebond.
- Onboarding & Auth (si applicable)
  - Slides, illustrations, ton, longueur.

Pour chaque composant choisi, précise:
- Rôle/objectif : "…"
- Variantes : "…"
- États : "…"
- Contenu (icône/texte) : "…"
- Restrictions : "…"

## 7) Micro‑interactions & Animation
- Niveau d’animation : "léger | moyen | riche".
- Durées/easings : "100–150ms (tap) / 200–300ms (entrées) / 400–500ms (transitions)".
- Easing préféré : "standard | ease-out | spring léger".
- Transitions d’écran (stack/tabs) : "glissement iOS | fondu | none".
- Haptique : "léger sur succès, medium sur erreurs".
- Réduction du mouvement (accessibilité) : "respecter l’OS".

## 8) Contenu & UX Writing
- Ton (tutoiement/vouvoiement) : "…"
- Microcopy des états clés (remplir exemples):
  - Erreur réseau: "…"
  - Vide de flux: "…"
  - Succès d’action: "…"
- Emojis/émoticônes : "oui/non" (règles d’usage).
- Longueurs max (titres, sous‑titres, toasts) : "…"

## 9) Accessibilité
- Contraste cible: "AA | AAA".
- Cibles tactiles: min 44×44 pt.
- Prise en charge lecteurs d’écran: labels/roles/ordre focus.
- Taille de police dynamique: "oui, jusqu’à x1.3/x1.5".
- Focus visible (Web): styles de focus personnalisés.

## 10) Performance & Contraintes techniques
- Polices: "variable | woff2 | sous‑ensembles latin" – budget ko.
- Images/vidéos: tailles max, formats, lazy‑loading.
- Lottie/animations: poids max par animation.
- Appareils cibles: "bas de gamme | milieu | haut".
- Modules Expo autorisés à ajouter: "…"

## 11) Inspirations & Anti‑patterns (anti‑look IA)
- Références (2–5) avec URLs et ce qu’on aime:
  - "…"
- À éviter (pour éviter le look IA):
  - Dégradés trop voyants et génériques.
  - Verre/glassmorphism excessif, reflets artificiels.
  - Icônes hétérogènes (traits/angles incohérents).
  - Gris monotones sans hiérarchie ni profondeur.
  - Espacement par défaut non réfléchi (aléatoire).
  - Placeholders/fillers clichés, trop de lorem ipsum.
  - Manque d’état/feedback (tout statique/aplat).
- À favoriser:
  - Hiérarchie nette, blancs maîtrisés, rythme d’espacement.
  - Un accent couleur signature utilisé avec parcimonie.
  - Détails soignés (bords, ombres, transitions cohérentes).
  - Micro‑interactions/haptiques utiles, pas gadget.

## 12) Mesure du succès
- KPI design (qualitatifs/quantitatifs) : "taux d’achèvement, clics utiles, NPS, Time-to-first-action…"
- Hypothèses à valider : "…"
- Méthodes : "tests utilisateurs rapides, analytics, heatmaps web".

## 13) Priorités & Roadmap
- Must‑have (Semaine 1–2) :
  - "…"
- Should‑have :
  - "…"
- Nice‑to‑have :
  - "…"
- Jalons/livrables : "maquettes Figma, tokens, icônes, assets".

## 14) Acceptation & Validation
- Critères de DONE (design) :
  - Couvrir écrans principaux + états (chargement, vide, erreur).
  - Variantes de composants critiques (btn, input, liste, carte).
  - Thème sombre conforme et contrasté.
  - Spécs remises (tokens, tailles, espacements, comportements).

## 15) Handoff (ce que tu me fournis)
- Liens Figma/pages: "…"
- Nommage des tokens: "brand.primary.500, surface.1, text.primary…"
- Assets exportés (icônes, illustrations, logos, splash, app icon): "…"
- Règles de redlining (marges, paddings, rayons, ombres): "…"

---

## Annexe A – Spéc tokens (à implémenter ensuite)
Exemple de structure de tokens que j’utiliserai pour implémenter le thème. Pas besoin de tout remplir si tu as déjà un fichier Figma Tokens; donne‑le moi et j’en ferai l’import/mapping.

```ts
// Spéc – pas d’implémentation encore (lib/theme.ts)
export type Theme = {
  color: {
    brand: { 50: string; 100: string; 200: string; 300: string; 400: string; 500: string; 600: string; 700: string; 800: string; 900: string };
    accent: { 50: string; 100: string; 500: string; 600: string };
    success: { 50: string; 500: string; 600: string };
    warning: { 50: string; 500: string; 600: string };
    danger: { 50: string; 500: string; 600: string };
    neutral: { 0: string; 25: string; 50: string; 100: string; 200: string; 300: string; 400: string; 500: string; 600: string; 700: string; 800: string; 900: string; 950: string };
    overlay: string;
  };
  surface: {
    background: string; // app background
    container: string;  // cards
    elevated: string;   // modals/sheets
    border: string;     // subtle borders
  };
  text: {
    primary: string; secondary: string; muted: string; inverted: string;
  };
  radius: { xs: number; sm: number; md: number; lg: number; xl: number; full: number };
  space: { xs: number; sm: number; md: number; lg: number; xl: number; '2xl': number };
  elevation: { 0: string; 1: string; 2: string; 3: string; 4: string };
  typography: {
    fontFamily: string;
    headings: { h1: number; h2: number; h3: number; h4: number };
    body: { sm: number; md: number; lg: number };
    caption: number;
    lineHeights: { tight: number; normal: number; relaxed: number };
  };
};
```

Mapping d’intentions (exemples):
- App Header: `surface.background`, `text.primary`, `border` optionnel.
- Button Primary: `color.brand.600` (bg), `text.inverted` (texte), `radius.lg`.
- Button Secondary: `surface.container` (bg), `color.brand.600` (bord/texte).
- Card/List item: `surface.container`, `border` très subtil, ombre `elevation.1`.
- PostCard (si présent): image 16:9, title `text.primary`, meta `text.muted`.
- MediaCarousel (si présent): pagination `accent.500`, fond `surface.background`.

---

## Annexe B – Checklist anti‑« basique »
- Hiérarchie visuelle claire (titres, poids, tailles, blancs).
- Rythme d’espacement cohérent (4/8pt), pas d’à‑peu‑près.
- Accent de marque utilisé avec parcimonie et cohérence.
- Icônes cohérentes (même pack, même épaisseur).
- États/feedback visibles (pressed/focus/loading/skeleton).
- Détails polis: bords, ombres, arrondis, alignements pixel‑perfect.
- Micro‑interactions utiles (pas de gimmick) + haptique dosée.
- Accessibilité vérifiée (contraste, tailles tactiles, Dynamic Type).
- Mode sombre dédié (pas juste inversion naïve).
- Performances (fonts/images/animations sous contrôle).

---

Quand ce brief est rempli, je l’utiliserai pour:
- Proposer une planche de style et variantes clés.
- Définir les tokens et le thème (clair/sombre).
- Mettre à jour les composants UI existants et les écrans principaux.
- Appliquer les micro‑interactions et états.

Tu peux commencer par la section 0 pour me débloquer rapidement, puis compléter le reste au fil de l’eau.
