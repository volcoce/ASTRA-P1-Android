# ASTRA — Architecture de l'information et système UI

**Statut :** spécification cible de l'expérience utilisateur, au 20 novembre 2026.  
**Périmètre :** ASTRA 0.7.1 (WebView Android + web), mobile-first (Galaxy A15), tablette et ordinateur.  
**Référence d'organisation :** Flo, pour son écran quotidien défilable, ses widgets organisés par importance et sa divulgation progressive. Ne pas copier l'identité visuelle, les illustrations ni les fonctions de suivi de santé de Flo.

**Références :**
- [Flo — How we evolved and enriched the main screen, Part 2 (Cycle widgets)](https://medium.com/flo-health/how-we-evolved-and-enriched-the-main-screen-of-the-flo-app-part-2-cycle-widgets-b73d5ccb948d)
- [Flo — Part 1 (My daily insights)](https://medium.com/flo-health/how-we-evolved-and-enriched-the-main-screen-of-the-flo-app-part-1-stories-cee6f4035e5)
- [WCAG 2.2 — W3C](https://www.w3.org/TR/WCAG22/)

## 1. Hiérarchie de l'information

**Principe :** « Que se passe-t-il / que signifie ce panneau / quelle action puis-je faire ? » doit être compris en moins de cinq secondes. Ne pas prétendre que l'astrologie est prédictive : **calcul astronomique** et **interprétation symbolique** restent distingués.

### Rôles des quatre écrans

| Écran | Question utilisateur | Visible d'emblée (P0) | Secondaire (P1) | À la demande (P2) |
| --- | --- | --- | --- | --- |
| **Ce jour** | Où se trouve la Lune à midi et quand change-t-elle de signe ? | Sélection de semaine, **Lune en [signe] à midi** dans le fuseau du profil, changements de signe/phase du jour par ordre chronologique | Cartes Soleil / Journal / Mon ciel, trois premiers événements | Autres événements, aspects en cours, calcul détaillé |
| **Ce mois** | Que se passe-t-il pendant le mois affiché ? | Mois, nombre d'événements calculés, Nouvelles Lunes et Pleines Lunes | Premiers événements du mois et jours consignés | Dates détaillées, accès au journal |
| **Calendrier** | À quelle date est cet événement ? | Grille mensuelle, jour choisi, icône lunaire de midi par date et **trait doré pour un aspect exact du Soleil** | Nouvelle Lune violette, Pleine Lune dorée, événements du jour et prochaines phases | Filtres, tropical/sidéral, autres détails |
| **Mon ciel** | Quel est mon thème et comment le comprendre ? | Soleil/Lune/Ascendant en clair, « Comprendre mon thème », carte de naissance | « Comparer deux dates », lecture d'une planète | Matrice d'aspects, systèmes de maisons, détails techniques et exports |

**Journal secondaire :** le Journal n'est plus un onglet principal, mais reste accessible depuis Ce jour, Ce mois et les fiches d'événements, y compris sans thème natal. Ses données locales et ses fonctions de saisie/recherche/sauvegarde ne changent pas.

**Nouveau profil :** une seule carte de démarrage avec un appel à l'action « Créer ma carte de naissance », les champs de naissance et l'explication des données locales. Ne pas saturer chaque page de messages techniques.

**Naissance sans heure connue :** ne pas inventer Ascendant ou maisons. Afficher une explication courte, conserver les données calculables, marquer les données incertaines.

### Structure d'accueil (360 CSS px)

```text
┌──────────────────────────────────┐
│ ✳ ASTRA                          │  marque uniquement
├──────────────────────────────────┤
│ Aujourd'hui                      │  titre + une phrase utile
│ Lu  Ma  Me  Je  Ve  Sa  Di       │  navigation de semaine
│ 16  17  18 [19] 20  21  22      │
│                                  │
│ ┌──────────────────────────────┐ │
│ │ LE CIEL DU JOUR              │ │  seule carte dominante
│ │ ☾ Lune en Bélier             │ │  signe/phase à midi local
│ │  3 événements calculés        │ │  information secondaire
│ │ Voir les événements       ↓  │ │
│ └──────────────────────────────┘ │
│                                  │
│ À découvrir                      │
│ ┌───────────┐ ┌───────────┐    │  rail défilable horizontal
│ │ ☉ Soleil │ │ Journal   │ →  │
│ │ Phase     │ │ Ma note   │    │
│ └───────────┘ └───────────┘    │
│                                  │
│ Événements du jour               │
│ ┌──────────────────────────────┐ │  feed vertical
│ │ Position / heure / détail    │ │
│ └──────────────────────────────┘ │
│ Aspects en cours              ▾  │  disclosure
├──────────────────────────────────┤
│ Ce jour Ce mois Calendr. Mon ciel │  navigation fixe
└──────────────────────────────────┘
```

Le *résumé* ne doit pas être une métrique spectaculaire mais vide de sens : afficher clairement la date, le nombre réel d'événements, une description neutre et une action. Ne pas créer de « score énergétique », de « chance » ou d'avis psychologique déduit d'aspects.

## 2. Structure de navigation

### Navigation principale (fixe sur mobile)

Quatre destinations persistantes, dans cet ordre :

1. **Ce jour** (icône soleil) — journée sélectionnée, résumé et semaine.
2. **Ce mois** (icône vue mensuelle) — synthèse du mois et phases majeures de ce mois.
3. **Calendrier** (icône calendrier) — grille complète, sélection et événements détaillés.
4. **Mon ciel** (icône étoile) — thème natal, compréhension et comparaison.

La navigation doit toujours afficher **icône + texte**. L'état actif se distingue par fond et typographie, pas seulement la couleur. La barre demeure accessible sauf quand le clavier virtuel couvre la zone utile ou qu'une vue immersive modale est ouverte.

### Navigation secondaire

- **Ce jour** — à chaque ouverture de l’onglet, revenir à la date actuelle ; le sélecteur de semaine peut temporairement afficher une autre journée. La position à midi est datée, chaque changement de signe et phase exacte du même jour possède sa propre heure. En cas de signes distincts, le texte explique la différence. Ne pas afficher de chronologie lunaire future ni de bouton de progression conversationnelle.
- **Ce mois** — à chaque ouverture de l’onglet, revenir au mois actuel ; les flèches permettent d'explorer d’autres mois temporairement. Nombre réel d'événements, phases majeures du mois, cinq premiers événements et accès au calendrier. Les filtres du calendrier n'y changent rien.
- **Calendrier** — mois précédent/suivant, jour sélectionné, Nouvelle Lune et Pleine Lune colorées, quatre prochaines phases lunaires interactives ; filtres dans « Options d'affichage ».
- **Journal (secondaire)** — accès depuis une carte ou une fiche, retour à Ce jour, jour précédent/suivant, sauvegarde et historique sous la saisie.
- **Mon ciel** — trois vues de la même carte : « Roue / Planètes / Aspects ». Deux parcours à intitulés compréhensibles restent disponibles : « Comprendre mon thème » et « Comparer deux dates ». Le glossaire est contextuel ; les progressions et la carte composite sont repliées dans les outils avancés.
- **Réglages** — paramètres essentiels en premier, « Options avancées » et exports repliables.

**Retour Android :** fermer un panneau contextuel, puis la roue immersive, puis revenir de la sous-page à Mon ciel, puis à Ce jour. Ne jamais quitter l'app sur un simple retour depuis un détail.

### Répartition selon l'écran

| Largeur CSS | Navigation | Contenu |
| --- | --- | --- |
| 320–479 px | Barre basse 4 destinations | Une colonne, widgets secondaires en rail horizontal |
| 480–767 px | Barre basse | Colonne principale plus aérée, rail 2 cartes visibles |
| 768–1023 px | Barre basse conservée | Largeur de lecture plafonnée, 2 colonnes seulement pour des cartes indépendantes |
| >=1024 px | Navigation latérale *possible après test*, pas obligatoire | Zone centrale 640–760 px + panneau secondaire discret, jamais tableau de bord « cockpit » |

Ne jamais afficher une barre latérale **et** une barre basse concurrentes ; il doit exister une seule navigation principale.

## 3. Zones et composants réutilisables

### Zones de page

- `AppShell` — fond et largeur confortable, barres système et safe areas Android.
- `BrandHeader` — identité courte; pas de navigation concurrente.
- `ScreenIntro` — un titre H1, sous-titre d'une phrase maximum, aucun titre répété à l'identique.
- `PageContent` — flux vertical commun, sections accessibles avec titres H2.
- `BottomNavigation` — quatre boutons, label, icône, `aria-current="page"`.
- `ContextSheet` / `FullScreenChart` — détails et lecture agrandie, focus géré et bouton fermer.

### Bibliothèque de composants

| Composant | Données / rôle | Contraintes |
| --- | --- | --- |
| `WeekPicker` | semaine de 7 jours + sélection d'une date | UTC à midi pour les étiquettes calendaires, accès clavier, boutons 44 px |
| `DayHero` | Lune en signe, phase à midi, date et nombre réel d'événements | un seul exemplaire par écran, heure/fuseau explicités, état de chargement et zéro événement |
| `InsightCard` | Soleil du jour, Journal, Mon ciel | titre concret, 1 idée/carte, rail défilable avec indication de continuité |
| `EventList` / `EventRow` | corps, angle, moment, détails | description accessible, ne pas confondre observation et interprétation |
| `ExpandSection` | détails longs et réglages | `summary` explicite, état ouvert lisible et préservé si pertinent |
| `NatalSignTile` | Soleil, Lune, Ascendant | symbole + **nom en toutes lettres** + signe, option incertitude |
| `ChartViewport` | SVG natal / transits, zoom et export | lisible à 100% sans défilement latéral de page |
| `DateMonthPicker` | calendrier mensuel et jours à aspects solaires exacts | 7 colonnes fixes, cases de 55 px, numéro en haut, icône lunaire SVG centrée, point d'événement en coin, trait doré sous l'icône pour aspect exact du Soleil ; Nouvelle Lune violette, Pleine Lune dorée. Préfixer les classes SVG pour éviter la collision avec `.calendar`. Légende, `aria-label` et notes distinctes |
| `MoodPicker` / `JournalEditor` | humeur, énergie, note, sauvegarde | labels explicites, persistance de brouillon lors d'une navigation |
| `BirthForm` / `CityPicker` | saisie date/heure/ville | erreurs au champ, aucune ville non confirmée, heure inconnue possible |
| `FeedbackState` | vide, chargement, erreur, confirmation | action suivante visible, ton neutre, pas de faux résultat |

### États de chaque widget

| État | Design et texte |
| --- | --- |
| **Chargement** | Une phrase courte (« Calcul des positions… »), zone réservée pour éviter les sauts, pas de faux nombre |
| **Vide** | Pourquoi c'est vide et une prochaine action : « Aucun événement exact ce jour. Choisis une autre date. » |
| **Erreur** | Message local et précis + « Réessayer »; ne pas effacer les données saisies |
| **Incomplet** | Éviter de prétendre connaître l'Ascendant sans heure; données restantes utilisables |
| **Sélectionné** | Surbrillance avec bordure / coche / attribut accessible, pas la couleur seule |
| **Enregistré** | Confirmation discrète `role=status`, sans masquer les contrôles |

### Règles de rédaction

- Écrire **« Comparer deux dates »** avant « Transits ».
- Écrire **« Comprendre mon thème »** avant « Explorateur natal ».
- Écrire **« Comment tu te sens ? »** avant « Humeur (1–5) ».
- Expliquer une fois « Aspect = angle entre deux planètes », garder les degrés dans un panneau de détail.
- Éviter les éléments vagues « Contacts », « Énergie du ciel », « Potentiel de la journée » s'ils ne désignent aucune information mesurée.
- Ne pas écrire « Aujourd'hui » si la personne consulte une autre date sans identifier la date choisie.

## 4. Cohérence visuelle et accessibilité

### Tokens de base

| Token | Valeur | Usage |
| --- | --- | --- |
| Fond | `#f6f7f7` | surface générale |
| Blanc | `#ffffff` | cartes |
| Encre | `#172637` | titres et texte |
| Texte secondaire | `#526273` | description, 6.26:1 sur blanc |
| Bleu nuit | `#172b3e` | masthead et CTA |
| Bleu actif | `#315e79` | navigation et détails, 6.98:1 sur blanc |
| Ligne | `#d8e1e6` | séparateurs |
| Or doux | `#e9bb71` | illustration uniquement, **jamais texte clair sur blanc** |
| Cuivre transit | `#be714e` | graphique/repère, **pas texte courant sur blanc** |

Ces rapports sont calculés sur fond blanc à partir des couleurs proposées. Conserver au moins **4,5:1** pour les textes ordinaires et **3:1** pour les éléments non textuels essentiels, conformément à WCAG 2.2 AA.

### Échelle

- Espacement : grille 4 px : `4 / 8 / 12 / 16 / 24 / 32`.
- Zone latérale mobile : 14–16 px, jamais moins de 10 px à 320 CSS px.
- Sections : 20–28 px d'écart; au maximum une carte dominante dans le premier écran.
- Titre H1 : 28–32 px, line-height ~1.2.
- H2 : 19–22 px, line-height ~1.3.
- Corps : 15–16 px, line-height 1.45–1.6.
- Texte secondaire : 13–14 px, jamais inférieur à 12 px pour l'information utile.
- Boutons : hauteur conseillée **48 px** et surface tactile cible >=44 × 44 CSS px.
- Cartes : rayon 14–18 px; une seule séparation visuelle (bordure *ou* ombre, pas les deux).
- Typographie système, poids 400/650/750; pas de titres de cartes en capitales intégrales.

### Réactivité et confort

- Reflow sans défilement horizontal de page à **320 CSS px** (sauf roue zoomée / rail explicitement défilable).
- Tester 320×700, 360×780 (Galaxy A15 simulé), 393×844, 412×915, 768×1024, 1280×800.
- Tester agrandissement de police et de l'affichage Android, portrait/paysage, clavier ouvert et fermeture, barres système.
- Pas de CTA essentiel sous la barre basse; `env(safe-area-inset-*)` ou insets natifs gérés **une seule fois**.
- Champs toujours associés à `label`, titres sémantiques, progression `aria-live`, `aria-expanded` et `aria-pressed` si adaptés.
- Focus visible et correctement restauré après re-render. Navigation TalkBack et clavier. Toutes les informations essentielles doivent être accessibles sans geste horizontal.
- Animations fonctionnelles de 120–180 ms, désactivées avec `prefers-reduced-motion`. Aucune roue en mouvement sans interaction explicite.
- Les indicateurs de précision doivent accompagner les résultats eux-mêmes (heure inconnue, phase lunaire approximée, zodiaque).

## Critères de validation pour la prochaine itération

1. Sur Galaxy A15 (360 × 780 CSS simulés), la **date, le résumé et le début des informations utiles** apparaissent rapidement sans encombrement.
2. Une personne non initiée peut expliquer les quatre onglets et trouver où noter son humeur en moins de 15 secondes.
3. Les trois cartes du ciel affichent le **nom** de Soleil, Lune et Ascendant et le **signe en toutes lettres** (ou une limite explicite).
4. Aucun débordement de page à 320, 360, 393, 412, 768 et 1280 px; seule la rangée de widgets peut défiler latéralement.
5. Deux cents pour cent de taille de texte ne provoquent ni recouvrement des liens de navigation ni boutons tronqués.
6. Toute donnée incertaine est distinguée, aucun nombre astrologique fictif, aucun contenu médical ou psychologique généré automatiquement.
7. Navigation, journal, exports et calculs passent les tests Chromium, Android et un contrôle manuel sur téléphone réel.

**État par rapport à la Preview 0.7.1 :** le sélecteur de semaine, le widget dominant, la rangée Lune/Journal/Mon ciel et la liste d'événements existent déjà. Certaines recommandations de cette spécification sont des **cibles UX à affiner**, non des fonctionnalités prouvées par test utilisateur.
