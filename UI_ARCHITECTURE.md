# ASTRA — Architecture de l'information et système UI

**Statut :** spécification cible de l'expérience utilisateur, au 20 novembre 2026.  
**Périmètre :** ASTRA 0.8.17-preview (WebView Android + web), mobile-first, tablette et ordinateur. Document de référence UX, à confronter au code en cas de différence.  
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
| **Ce jour** | Où se trouve la Lune à midi et quand change-t-elle de signe ? | Sélection de semaine, **Lune en [signe] à midi** dans le fuseau du profil, changement de signe en titre si présent, phase majeure exacte en encart dans la même carte | Cartes Soleil / Journal / Mon ciel, trois premiers événements | Autres événements, aspects en cours, calcul détaillé |
| **Calendrier** | À quelle date est cet événement ? | Grille mensuelle, phases lunaires à midi, **fond solaire continu sur plusieurs jours**, coloré selon l'élément (Feu, Terre, Air, Eau), avec jour de transition partagé 50/50, événements personnels multi-jours | Nouvelle Lune violette, Pleine Lune dorée, événements du jour et prochaines phases | Filtres contextuels, autres détails ; zodiaque dans Paramètres |
| **Mon ciel** | Quel est mon thème et comment le comprendre ? | Soleil/Lune/Ascendant en clair, « Comprendre mon thème », carte de naissance | « Comparer deux dates », lecture d'une planète | Matrice d’aspects et mesures précises dans les fiches ; maisons dans Paramètres |

**Journal secondaire :** le Journal n'est plus un onglet principal, mais reste accessible depuis Ce jour, Calendrier et les fiches d'événements, y compris sans thème natal. Ses données locales et ses fonctions de saisie/recherche/sauvegarde ne changent pas.

**Nouveau profil :** une seule carte de démarrage avec un appel à l'action « Créer ma carte de naissance », les champs de naissance et l'explication des données locales. Ne pas saturer chaque page de messages techniques.

**Naissance sans heure connue :** ne pas inventer Ascendant ou maisons. Afficher une explication courte, conserver les données calculables, marquer les données incertaines.

### Structure d'accueil (360 CSS px)

```text
┌──────────────────────────────────┐
│ ✳ ASTRA                          │  marque seulement
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
│ Ce jour Calendr. Mon ciel Param.  │  navigation fixe
└──────────────────────────────────┘
```

Le *résumé* ne doit pas être une métrique spectaculaire mais vide de sens : afficher clairement la date, le nombre réel d'événements, une description neutre et une action. Ne pas créer de « score énergétique », de « chance » ou d'avis psychologique déduit d'aspects.

## 2. Structure de navigation

### Navigation principale (fixe sur mobile)

Trois destinations et un bouton de paramètres persistants, dans cet ordre :

1. **Ce jour** (icône soleil) — journée sélectionnée, résumé et semaine.
2. **Calendrier** (icône calendrier) — grille, synthèse mensuelle, phases majeures avec signe et heure locale, événements détaillés.
3. **Mon ciel** (icône étoile) — thème natal, compréhension et comparaison.
4. **Paramètres** — fenêtre modale.

La navigation doit toujours afficher **icône + texte**. L'état actif se distingue par fond et typographie, pas seulement la couleur. La barre demeure accessible sauf quand le clavier virtuel couvre la zone utile ou qu’une fenêtre de paramètres est affichée au premier plan.

### Navigation secondaire

- **Ce jour** — à chaque ouverture de l’onglet, revenir à la date actuelle ; le sélecteur de semaine peut temporairement afficher une autre journée. La phase illustrée et la référence horaire correspondent à midi ; lorsqu'un changement de signe a lieu, son parcours devient le titre (Taureau → Gémeaux) et l'heure est affichée sous le titre. Les phases exactes du jour ont leur encart dans la même carte, avec heure et signe calculé à cet instant. Ne pas répéter ces informations dans une deuxième carte. Ne pas afficher de chronologie lunaire future ni de bouton de progression conversationnelle.
- **Calendrier** — mois précédent/suivant, jour sélectionné, Nouvelle Lune et Pleine Lune colorées, synthèse du mois et événements groupés par jour sous la grille ; filtres dans « Options d'affichage ».
- **Journal (secondaire)** — accès depuis une carte ou une fiche, retour à Ce jour, jour précédent/suivant, sauvegarde et historique sous la saisie.
- **Mon ciel** — trois vues de la même carte : « Roue / Planètes / Aspects ». Deux parcours à intitulés compréhensibles restent disponibles : « Comprendre mon thème » et « Comparer deux dates ». Le glossaire est contextuel ; les progressions et la carte composite sont repliées dans les outils avancés. Les progressions secondaires et la carte composite ne font plus partie de l’interface.
- **Paramètres généraux** — un quatrième bouton « Paramètres » dans la barre de navigation, immédiatement à droite de « Mon ciel », visible depuis tous les écrans. Fenêtre modale native à cinq rubriques : **Astrologie** (zodiaques prévisionnel et natal, maisons, raccourci vers la naissance), **Apparence** (thème et palettes), **Données** (confidentialité, import/export, effacement), **Avancé** (diagnostics et limites), **Aide** (glossaire et calendrier). Fermeture explicite, touche Échap, bouton Retour Android, focus restauré.
- **Paramètres → Astrologie → Personnaliser mon thème** — accès unique à l’éditeur de naissance et aux commandes de personnalisation de la roue (niveau de détail, disposition natale/double, date de comparaison et zoom). Les vues de « Mon ciel » n’affichent plus d’action « Personnaliser » en doublon.

### Contrat de la fenêtre de paramètres

1. Les préférences globales ont **un seul emplacement de modification** ; elles sont sauvegardées et immédiatement appliquées aux écrans concernés. L’éditeur du thème est accessible depuis la rubrique Astrologie, y compris pour modifier les données de naissance.
2. La fenêtre se superpose à l'écran courant, sans changer de date ou d'onglet. Sur mobile, elle devient une feuille adaptée à l'écran, sans doublonner la barre de navigation.
3. Les sections ne sont pas simultanément ouvertes ; les cinq onglets ont un état sélectionné visible et se pilotent au clavier (flèches, Début, Fin).
4. Après l'enregistrement d'un réglage, le focus revient au contrôle modifié. Fermer la fenêtre rend le focus au bouton Paramètres de la barre inférieure. Accéder au formulaire de naissance conserve le focus du nouveau parcours.
5. Le style, le responsive, la palette sombre/claire et les marges de cette fenêtre appartiennent **exclusivement** à `astra-components.css`. Aucune règle spécifique à Ce jour, Calendrier ou Mon ciel.
6. La sauvegarde et l'effacement restent dans Données, jamais dans le formulaire de naissance ou les commandes de roue.

**Retour Android :** fermer la fenêtre de paramètres ou un panneau contextuel, puis revenir de la sous-page à Mon ciel, puis à Ce jour. Ne jamais quitter l'app sur un simple retour depuis un détail.

### Répartition selon l'écran

| Largeur CSS | Navigation | Contenu |
| --- | --- | --- |
| 320–479 px | Barre basse : 4 vues + Paramètres | Une colonne, widgets secondaires en rail horizontal |
| 480–767 px | Barre basse | Colonne principale plus aérée, rail 2 cartes visibles |
| 768–1023 px | Barre basse fixe conservée | Colonne centrale plafonnée, 2 colonnes seulement pour des cartes indépendantes |
| >=1024 px | Barre basse fixe conservée, aucune exception par page | Colonne centrale de lecture partagée, jamais tableau de bord « cockpit » |

Ne jamais afficher une barre latérale **et** une barre basse concurrentes ; il doit exister une seule navigation principale.

## 3. Zones et composants réutilisables

### Zones de page

- `AppShell` — fond et largeur confortable, barres système et safe areas Android.
- `ScreenIntro` — titre H1 et sous-titre contextuels en tête de chaque écran. Aucun bandeau ASTRA permanent ; la navigation principale reste en bas.
- `ScreenIntro` — un titre H1, sous-titre d'une phrase maximum, aucun titre répété à l'identique.
- `PageContent` — flux vertical commun, sections accessibles avec titres H2.
- `BottomNavigation` — quatre vues et une entrée Paramètres à droite de Mon ciel ; icônes et libellés, `aria-current="page"` pour les vues, `aria-expanded` pour les paramètres.
- `ContextSheet` — lecture d’un objet de la roue sur la page courante, avec fermeture et restauration du focus. Aucune deuxième roue en plein écran ; le zoom intégré reste disponible dans les outils de la carte, sans exports PNG/SVG.

### Roue de naissance — contrat de visualisation

- **Trois anneaux lisibles** — douze signes égaux à l'extérieur, positions des planètes sans étiquettes de degrés, maisons Placidus/égales/signes entiers dans leur anneau distinct ; le centre est réservé aux aspects.
- **Glyphes typographiques** — les signes SVG utilisent la variante Unicode texte (FE0E), sans carrés emoji. Les palettes restent sélectionnables ; les glyphes proches utilisent l’anticollision angulaire originale.
- **Position vraie préservée** — les points et aspects utilisent les longitudes exactes. Les glyphes conservent le rayon de leur anneau, avec un espacement angulaire minimal fixe de 14° sur chaque anneau, conformément au rendu antérieur à la comparaison des roues, optimisé par `layoutPlanetLabels` ; les glyphes isolés ne bougent pas. Un trait discret relie les seuls glyphes décalés à leur point exact. Aucun regroupement ni changement de rayon.
- **Essentiel (par défaut)** — symboles et jusqu'à six aspects retenus par orbe faible ; **Complet** — tous les aspects du filtre, sans ajouter d'étiquettes de degrés. Pas de classement énergétique inventé ; les positions exactes restent dans les fiches.
- **Roue double** — conserve deux anneaux distincts natal / transits ; aucun degré ou minute superposé au dessin, même en mode Complet.
- **Sans heure de naissance** — pas de maisons ni d'Ascendant ; la Lune reste indicative et sa fiche le précise. Aucun changement de calcul des éphémérides.
- **Mobile** — la vue reste dans la largeur standard, les marqueurs/fiches restent interactifs et clavier-accessibles, les légendes supplémentaires n'imposent ni débordement de page ni une deuxième roue agrandie.

- `GlobalSettingsDialog` — préférences globales en quatre rubriques accessibles depuis la dernière entrée de la barre inférieure, un seul propriétaire CSS et restauration du focus.

### Bibliothèque de composants

| Composant | Données / rôle | Contraintes |
| --- | --- | --- |
| `WeekPicker` | semaine de 7 jours + sélection d'une date | UTC à midi pour les étiquettes calendaires, accès clavier, boutons 44 px |
| `DayHero` | Lune en signe, phase à midi et date, sans compteur d'événements redondant | un seul exemplaire par écran, heure/fuseau explicités, état de chargement et zéro événement |
| `InsightCard` | Soleil du jour, Journal, Mon ciel | titre concret, 1 idée/carte, rail défilable avec indication de continuité |
| `EventList` / `EventRow` | corps, angle, moment, détails | description accessible, ne pas confondre observation et interprétation |
| `ExpandSection` | détails longs et réglages | `summary` explicite, état ouvert lisible et préservé si pertinent |
| `NatalSignTile` | Soleil, Lune, Ascendant | symbole + **nom en toutes lettres** + signe, option incertitude |
| `ChartViewport` | SVG natal / transits et zoom interactif (sans export graphique) | lisible à 100% sans défilement latéral de page |
| `DateMonthPicker` | calendrier mensuel avec phases lunaires, fonds solaires continus par élément et événements personnels | 7 colonnes fixes, cases de 55 px, numéro en haut, icône lunaire SVG centrée, événements personnels en bandes sur plusieurs jours ; Nouvelle Lune et Pleine Lune distinctes. Aucun marqueur d’« Aspect solaire exact ». Préfixer les classes SVG pour éviter la collision avec `.calendar`. Légende, `aria-label` et notes distinctes |
| `MoodPicker` / `JournalEditor` | humeur, énergie, note, sauvegarde | labels explicites, persistance de brouillon lors d'une navigation |
| `BirthForm` / `CityPicker` | saisie date/heure et liste de villes suggérées | choix fréquents sans saisie, recherche automatique après 3 lettres (280 ms), nom/région/pays visibles, flèches/Entrée/Échap accessibles, seules les villes explicitement sélectionnées fournissent coordonnées et fuseau, heure inconnue possible |
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
- Expliquer une fois « Aspect = angle entre deux planètes » ; ne pas afficher de degrés ni de graduations sur la roue. Les positions et mesures exactes restent accessibles dans les fiches.
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
| Bleu nuit | `#172b3e` | CTA et surfaces d’accentuation |
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
- Boutons : zone cliquable cible **48 × 48 px CSS** dans la WebView (équivalent de conception au repère Android 48 dp à échelle normale). Les icônes peuvent être plus petites que leur surface interactive.
- Les actions voisines utilisent **8 px** d'écart (`--astra-touch-gap`) ; les actions destructives sont séparées visuellement et nécessitent confirmation.
- Les grilles de sept jours à 320 px ne peuvent pas contenir sept cellules de 48 px de large. Leurs cellules restent **entières cliquables, hautes d'au moins 48 px**, avec l'exception d'espacement WCAG 2.2, sans défilement horizontal obligatoire.
- Cartes : rayon 14–18 px; une seule séparation visuelle (bordure *ou* ombre, pas les deux).
- Typographie système, poids 400/650/750; pas de titres de cartes en capitales intégrales.

### Réactivité et confort

- Reflow sans défilement horizontal de page à **320 CSS px** (sauf roue zoomée / rail explicitement défilable).
- Tester 320×700, 360×780 (Galaxy A15 simulé), 393×844, 412×915, 768×1024, 1280×800, ainsi que paysage et texte agrandi. Vérifier les rectangles interactifs réels (`getBoundingClientRect`) de la barre basse, des menus, des flèches et des commandes de roue.
- Tester agrandissement de police et de l'affichage Android, portrait/paysage, clavier ouvert et fermeture, barres système.
- Android Edge-to-Edge : la WebView et ses fonds se prolongent sous l'encoche, la barre d'état et les boutons de navigation. L'Activity dessine avec des barres transparentes et désactive le contraste forcé de la barre inférieure ; les insets physiques (`systemBars | displayCutout`) sont convertis en pixels CSS et publiés sur `--astra-native-inset-*`. Les variables `--astra-safe-*` emploient les insets natifs ou `env(safe-area-inset-*)` sur navigateur, **jamais les deux en addition**. Les boutons restent dans la zone sûre, la barre inférieure conserve son fond sous la navigation système et l'IME est géré séparément.
- Pas de CTA essentiel sous la barre basse ; vérifier les deux systèmes de navigation Android (gestes et 3 boutons), le mode clair/sombre et les découpes latérales.
- Champs toujours associés à `label`, titres sémantiques, progression `aria-live`, `aria-expanded` et `aria-pressed` si adaptés.
- Le champ de ville ouvre une liste de propositions dès le focus (villes fréquentes) et la met à jour après trois caractères sans bouton « Rechercher ». Le menu utilise `combobox` / `listbox`, conserve le focus pendant la saisie et distingue les villes homonymes par région et pays. Les données de naissance ne sont jamais envoyées au service de géocodage.
- Focus visible et correctement restauré après re-render. Navigation TalkBack et clavier. Toutes les informations essentielles doivent être accessibles sans geste horizontal.
- Animations fonctionnelles de 120–180 ms, désactivées avec `prefers-reduced-motion`. Aucune roue en mouvement sans interaction explicite.
- Les indicateurs de précision doivent accompagner les résultats eux-mêmes (heure inconnue, phase lunaire approximée, zodiaque).

## Critères de validation pour la prochaine itération

1. Sur Galaxy A15 (360 × 780 CSS simulés), la **date, le résumé et le début des informations utiles** apparaissent rapidement sans encombrement.
2. Une personne non initiée peut expliquer les quatre vues principales, repérer les paramètres et trouver où noter son humeur en moins de 15 secondes.
3. Les trois cartes du ciel affichent le **nom** de Soleil, Lune et Ascendant et le **signe en toutes lettres** (ou une limite explicite).
4. Aucun débordement de page à 320, 360, 393, 412, 768 et 1280 px; seule la rangée de widgets peut défiler latéralement.
5. Deux cents pour cent de taille de texte ne provoquent ni recouvrement des liens de navigation ni boutons tronqués.
6. Toute donnée incertaine est distinguée, aucun nombre astrologique fictif, aucun contenu médical ou psychologique généré automatiquement.
7. Navigation, journal, exports et calculs passent les tests Chromium, Android et un contrôle manuel sur téléphone réel.

**État de référence :** le sélecteur de semaine, le widget dominant, la rangée Lune/Journal/Mon ciel et la liste d'événements existent déjà. Certaines recommandations de cette spécification sont des **cibles UX à affiner**, non des fonctionnalités prouvées par test utilisateur.

### Tableau des planètes

Les positions natales partagent un tableau interactif à colonnes alignées : planète, R (rétrogradation géocentrique à la naissance), signe, degrés et minutes facultatifs, maison en chiffres romains si l’heure est connue. La préférence Paramètres → Astrologie → Degrés des planètes est désactivée par défaut et persistée. La roue reste sans degrés.


### Répartition et dignités natales

Sous la roue de Mon ciel, avant les actions de navigation, une seule section présente les éléments (anneau et légende en pourcentage) et les modalités (barres), calculés à partir des dix astres du thème actif, sans pondération ni angles. Si l'heure manque, les comptes sont indicatifs à midi. Les quatre dignités classiques par signe figurent uniquement dans la fiche de la planète sélectionnée (domicile, exaltation, exil, chute, éventuellement cumulés). Uranus, Neptune et Pluton n'ont pas de statut dans ce référentiel classique. Ces statuts sont symboliques et ne sont pas des scores.

La sélection d’une ligne de répartition affiche les astres et leurs signes ; un seul groupe par répartition reste ouvert. La sélection d’un astre ouvre sa fiche existante.

Les répartitions Éléments et Modalités se succèdent verticalement sur tous les écrans. Les boutons Explorer et Comparer sont placés tout en bas, après les répartitions, avec un espacement identique de 16 px, via le token global d’espacement.


### Paramètres — géométrie et gestes

Les cinq rubriques partagent une seule gouttière horizontale (en-tête, navigation, contenu), compatible avec les insets Android. Les panneaux sont des groupes de contenu et non des cartes imbriquées ; espacement vertical commun de 16 px. L’en-tête et les onglets restent ensemble pendant le défilement. Un balayage horizontal intentionnel dans le contenu ouvre la rubrique précédente ou suivante, sans boucle aux extrémités. Les gestes verticaux, multitouch, champs de saisie et tableaux défilants restent natifs. Les tests Chromium mesurent les limites du dialogue, les gouttières et la séparation entre palettes et options de 320 à 1280 px, et exercent les gestes tactiles.


### P3 — Contrat tactile commun

- Le balayage horizontal du semainier, du calendrier, du titre de la journée du journal et du corps des paramètres utilise les actions de navigation existantes, sans nouvelle route.
- Un seul doigt, verrouillage de l’axe après 12 px et déplacement final d’au moins 64 px. Les mouvements diagonaux, courts, annulés et multi-touch sont ignorés.
- Sur mobile, un geste descendant depuis l’en-tête d’une fiche ou d’une modale ferme celle-ci par son bouton existant. Les champs de formulaire, le contenu défilant des fiches, les tableaux et la roue ne sont pas détournés.
- Les boutons restent utilisables au clavier et à la souris. Le retour de focus d’un contact de transit cible le contact réellement sélectionné.
