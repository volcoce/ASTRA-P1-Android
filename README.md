# ASTRA Public — Preview 0.5.7

## P1 — Compréhension et analyse (Preview 0.5.7)

**Dans Mon ciel :**

- Fiches pédagogiques interactives pour les dix corps astrologiques, les douze maisons et les aspects natals : **donnée calculée**, **lecture symbolique traditionnelle** et **question de réflexion** présentées séparément. Les significations des signes et des maisons sont liées à la position sélectionnée.
- Mode **Complet** : affichage des positions zodiacales à la seconde d'arc (`dd°mm′ss″`), avec arrondi normalisé aux frontières des signes. Ce format exprime une résolution d'affichage, **pas** une précision physique certifiée à la seconde d'arc.
- Filtres natals **Tous / Conjonctions / Sextiles / Carrés / Trigones / Oppositions**. Le même filtre agit sur les lignes de la roue, la liste des aspects et la fiche de la planète sélectionnée. La préférence reste locale et est préservée dans l'export JSON.
- **Heure de naissance inconnue** : une case à cocher accepte date + ville, même sans heure. ASTRA choisit **12 h locales comme référence informatique provisoire** : il ne prétend pas qu'il s'agit de l'heure de naissance. L'Ascendant, le Milieu du Ciel et les douze maisons sont supprimés ; une roue zodiacale sans maisons apparaît. Les planètes sont marquées **indicatives**, particulièrement la Lune, qui peut même changer de signe durant la journée.
- Les aspects natals associés à la **Lune natale** sont exclus lorsque l'heure manque. Dans Aujourd'hui et Calendrier, les aspects personnalisés actifs sont marqués indicatifs ; les **instants exacts des contacts personnels** sont supprimés. Les stations planétaires et les phases lunaires, indépendantes de l'heure natale, restent disponibles.
- Les profils et journaux déjà enregistrés conservent la clé `astra-public-v1`, avec `timeKnown` absent interprété comme **heure connue** pour rétrocompatibilité.
- L'application demande encore la **date et la ville**. Sans date ou sans lieu, le formulaire exige ces éléments plutôt que d'inventer un fuseau, des maisons ou une date de naissance.
- `tests/natal-learning.test.mjs` contrôle les frontières zodiacales, l'arrondi dms, les filtres et les fiches ; `tests/runtime.test.mjs` vérifie les naissances à heure inconnue ; `tests/ui-smoke.py` vérifie l'interaction des filtres, la lecture et la préservation du journal en navigateur.

**Limites :** le mode sidéral reste approximatif. Les conventions d'interprétation astrologiques ne sont pas des relations causales ou prédictions scientifiquement établies. Aucune donnée de naissance personnelle n'est intégrée au code ou à l'APK.

## P0 — Lisibilité et fiabilité de la roue (Preview 0.5.6)

- **Placement anti-collision** : les 10 glyphes sont distribués automatiquement sur un anneau avec un écart minimal de 14°, suivant une régression isotone circulaire déterministe. Aucun symbole planétaire ne chevauche un autre même lors de conjonctions très serrées. Le repère de degré de chaque planète **reste fixe à la longitude astronomique exacte** ; un trait relie le repère à son glyphe si ce dernier est décalé.
- **Anneaux distincts** : les 12 signes du zodiaque tropical occupent chacun exactement 30°, dans l'anneau extérieur. Les 12 maisons Placidus (largeurs variables) ont désormais un anneau intérieur distinct et une légende explicite. Le système de maisons indiqué par le moteur reste visible.
- **Mobile** : sur les écrans étroits, la roue garde au moins 320 px de largeur et peut défiler horizontalement dans son propre conteneur ; le reste de la page ne doit pas déborder.
- **Accessibilité** : couleurs des éléments essentiels renforcées et valeur de texte secondaire plus contrastée ; navigation clavier Entrée/Espace des planètes et maisons, avec restauration du focus après chaque re-rendu. Les boutons du niveau d'affichage et du zodiaque conservent aussi le focus lors d'une activation au clavier.
- **Vérification** : `tests/chart-layout.test.mjs` couvre un grand nombre de placements aléatoires, les conjonctions, la traversée 359°/0°, la conservation des repères astronomiques ; `tests/ui-smoke.py` vérifie la vraie disposition en Chrome, la légende, le focus et la largeur à 320 px.
- **Limites** : l'espacement des glyphes n'augmente pas l'exactitude des éphémérides ni celle des maisons ; la vérification complète des contrastes sur tous les écrans et la validation sur téléphone physique restent indépendantes des tests automatisés.


## Modes d'affichage du thème natal (0.5.5)

Dans **Mon ciel**, le thème est calculé à partir de la date, l'heure et la ville propres à l'utilisateur. Deux **modes de lecture** indépendants de l'astronomie sont disponibles :

- **Essentiel** (par défaut) : roue avec signes, planètes et maisons, sans réseau d'aspects au repos, plus quatre repères clés (Soleil, Lune, Ascendant et Milieu du Ciel). Sélectionner une planète révèle ses aspects.
- **Complet** : même roue avec les aspects affichés, tableau de toutes les positions, cuspides des douze maisons et liste complète des aspects natals retenus.
- **Interaction dans les deux modes** : cliquer ou activer au clavier une planète ou une maison sur la roue affiche ses valeurs calculées et ses relations. Les listes détaillées sont elles aussi sélectionnables.
- **Zodiaque séparé du niveau de détail** : tropical par défaut ; sidéral possible avec ayanamsa Lahiri **approximatif**. Les cuspides Placidus sidérales sont obtenues en décalant les cuspides tropicales. Le zodiaque choisi pour le thème natal ne modifie pas le mode choisi pour les transits.
- Les réglages `natalView` et `natalZodiac` sont mémorisés dans la sauvegarde existante `astra-public-v1`. Les anciens journaux sont conservés.
- Le niveau de détail ne change **aucune position astronomique**. Les aspects natals de la roue sont retenus à 5° d'orbe dans cette version, tandis que les transits conservent leur politique d'orbes automatiques.

Pour essayer sur PC, utiliser `npm install && npm run dev`, puis ouvrir http://127.0.0.1:4173/. Après validation, construire le debug Android signé avec la clé de test ASTRA Preview déjà utilisée dans les versions précédentes.


## Prévisualiser sur PC avant de générer un APK

Prérequis : **Node.js 22 ou plus récent**, npm et un navigateur moderne. Aucune installation d'Android Studio ni du SDK Android n'est requise.

Sur macOS (Terminal), Windows (PowerShell) ou Linux :

```bash
git clone --branch public-runtime https://github.com/volcoce/ASTRA-P1-Android.git
cd ASTRA-P1-Android
npm install
npm run dev
```

Ouvrir **http://127.0.0.1:4173/**. Pour arrêter le serveur, utiliser **Ctrl+C**.
Si le projet est déjà téléchargé, se placer dans son dossier puis lancer `npm install` et `npm run dev`. Une modification des fichiers nécessite de rafraîchir l'onglet du navigateur ; si les fichiers `astro/*.mjs` ont changé, relancer `npm run dev` pour reconstruire le moteur.

- Pour valider le code : `npm test` et `npm run test:desktop`.
- Tester **Mon ciel** (ville, date et heure), la roue natale tropicale, **Aujourd'hui**, **Calendrier**, **Journal**, tropical/sidéral, export/import.
- Le **calcul astronomique** s'effectue localement. La recherche initiale de ville exige Internet ; seule la ville recherchée est envoyée au fournisseur de géocodage.
- Les données saisies en navigateur sont conservées dans le **localStorage de localhost** et ne sont pas synchronisées avec l'APK Android. Utiliser **Exporter JSON / Importer JSON** pour transférer une sauvegarde si les deux versions le prennent en charge.
- Ce test reproduit le moteur HTML/CSS/JS, mais **pas** les autorisations, le cycle de vie ni les particularités de la WebView Android. Il ne remplace pas un dernier essai sur téléphone.

**Règle de publication : tester d'abord sur PC et corriger les anomalies, puis compiler l'APK Android expérimental.**


Application Android/WebView de suivi astrologique pour **tous les utilisateurs**. Les calculs astronomiques sont réalisés **à la demande** avec `astronomy-engine` dans le JavaScript local. Aucun profil natal ni aucune table personnelle pré-calculée n’est livrée dans l'APK. Aucun compte n’est obligatoire. La permission INTERNET sert **uniquement à la recherche volontaire de ville** ; les calculs de transits restent locaux et hors ligne.

## Installation Android — correctif P2.1 Preview (0.5.2)

Les APK debug 0.4, 0.5.0 et 0.5.1 ont été signés sur des runners GitHub différents, d'où des certificats distincts. Android refuse leur installation en mise à jour les uns des autres.

Pour préserver les journaux existants, **la version debug est désormais une application séparée** avec l'identifiant `org.astra.publicapp.preview` et le libellé **ASTRA Preview**. L'ancienne application `org.astra.publicapp` reste installée et ses données ne sont pas touchées. C'est un nouveau produit Android, et non une mise à jour in-place.

Les futurs APK Preview partagent une **clé de test fixe** enregistrée en base64 dans `ci/astra-preview-test-signing.p12.b64`. Cette clé est volontairement non secrète, réservée à des essais et ne doit **jamais** être utilisée pour une publication sur Google Play ni pour signer une application officielle. Une version stable publique devra avoir son propre identifiant et une clé privée sécurisée (secrets CI ou service de signature).

Pour migrer des données, exporter le journal depuis l'ancienne application, vérifier que le fichier JSON existe et contient bien les notes, puis l'importer dans ASTRA Preview. L'import/export Android n'ayant pas encore été testé sur tous les téléphones, ne pas désinstaller l'ancienne application tant que le transfert n'est pas vérifié.

## Installation ASTRA Preview (0.5.2)

Les APK de test précédents utilisaient des clés de signature aléatoires. Leurs certificats ne correspondent pas : Android refuse une mise à jour directe. Cette version est donc installée **à côté** de l'ancienne application, avec un identifiant distinct `org.astra.publicapp.preview` et le nom **ASTRA Preview**. Ne désinstallez pas l'ancienne application avant d'avoir sauvegardé les notes et vérifié leur import dans la Preview.

Les builds Preview utilisent maintenant une clé de test stable stockée dans `ci/astra-preview-test-signing.p12.b64`. Elle est non secrète, uniquement destinée au développement. Ne jamais utiliser cette signature pour une version officielle destinée au public ; un keystore sécurisé et un identifiant de distribution seront nécessaires. Le dépôt doit rester privé en raison de son historique contenant d'anciennes données natales.

## Thème natal tropical — P2.2 (0.5.3)

L’onglet « Mon ciel » montre une roue natale **tropicale** calculée localement depuis la date, l’heure de naissance et les coordonnées de la ville choisie. Elle ne contient aucun thème personnel préchargé. Elle affiche les longitudes des dix corps, l’Ascendant, le Milieu du Ciel, les douze maisons Placidus et les aspects natals jusqu’à 5° d’orbe.

Les maisons Placidus sont obtenues numériquement par trissection des arcs diurnes et nocturnes à partir du temps sidéral apparent Greenwich d’Astronomy Engine. Les tests tests/natal.test.mjs comparent quatre thèmes fictifs de référence à Swiss Ephemeris (tolérance 0,05°). Aux latitudes où Placidus n’est pas défini, ASTRA utilise et affiche explicitement les maisons égales. Aux pôles géographiques exacts, l’Ascendant est indéfini.

Les transits utilisent désormais des orbes automatiques selon la planète et l'aspect, sans saisie manuelle. Le calendrier indique séparément les passages exacts. La roue natale conserve son seuil d'aspects de 5°.

La version Preview augmente à versionCode=540 en conservant l’identifiant org.astra.publicapp.preview et la signature expérimentale précédente. La signature de débogage publique reste impropre à une distribution de production.

## Résolution automatique du lieu de naissance (P2.1)

- Le formulaire demande **date, heure locale et ville**. Les champs techniques latitude, longitude et fuseau ont disparu.
- La ville est recherchée par l'utilisateur avec le service Open-Meteo Geocoding, alimenté par GeoNames. ASTRA présente les homonymes avec région et pays pour éviter les erreurs. L'utilisateur choisit un résultat.
- Chaque résultat comprend les coordonnées et un nom de fuseau **IANA** ; ASTRA utilise ce fuseau avec `Intl.DateTimeFormat` pour les règles calendaires correspondant à la date de naissance. L'heure d'été/hiver n'est pas un réglage manuel.
- **Cas limite réel** : au retour à l'heure d'hiver, certaines heures ont eu lieu deux fois. La ville et l'heure seules ne peuvent pas les départager : l'utilisateur doit choisir entre la première et la seconde occurrence. Une heure locale inexistante est rejetée.
- Seule la **requête de ville** est envoyée à Open-Meteo : jamais la date/heure de naissance ni le journal. Après sélection, le profil est conservé localement ; le thème et les transits sont calculés sans Internet.
- Les anciens profils sans `place` restent lisibles, mais doivent refaire une sélection de ville pour valider un nouveau profil.
- **Licence** : l'API publique gratuite Open-Meteo est réservée aux usages non commerciaux, avec attribution. Pour une distribution commerciale, souscrire à une offre autorisant cet usage ou remplacer le fournisseur. Voir https://open-meteo.com/en/pricing et https://github.com/open-meteo/geocoding-api.
- **Limite historique** : l'API déduit un fuseau contemporain à partir d'une ville moderne. Pour des lieux ayant changé de frontière ou de réglementation, et pour des dates anciennes, des règles supplémentaires vérifiées peuvent être nécessaires. La qualité des conversions IANA/ICU varie selon la version Android.

## Fonctions P2

- Fiches de lecture ouvrables dans **Aujourd'hui** et le **Calendrier**, couvrant 10 planètes, cinq aspects, les stations et les quatre phases lunaires principales.
- Trois niveaux distincts : **calcul astronomique**, **lecture symbolique** et **question de journal**. Les textes ne prétendent ni prédire ni expliquer causalement le vécu.
- Journal local : humeur, énergie, six thèmes facultatifs, note libre, historique recherchable, statistiques descriptives sur 30 jours. Compatible avec les journaux de v0.4 (champs `mood` / `note`).
- Export/import JSON compatibles avec `astra-public-v1`. L'export contient des données sensibles saisies par l'utilisateur et doit être conservé en lieu sûr.
- Zodiaque tropical et sidéral Lahiri **approximatif** ; natal et transits calculés pour chaque profil lors de la consultation.

## Lancer les tests et compiler

```bash
npm install --no-audit --no-fund
npm run bundle
npm test
node --check app/src/main/assets/app.js
# SDK Android 37.0, JDK 17 et Gradle 9.3.1 requis
# gradle --no-daemon :app:assembleDebug :app:lintDebug
```

Un build GitHub Actions se déclenche sur la branche `public-runtime`. Les APK debug sont expérimentaux, signés avec la clé temporaire CI et **non destinés à la distribution publique**. Les tests de navigateur ne valent pas test sur téléphone réel.

## Architecture

- `astro/runtime.mjs` : éphémérides dynamiques, transits, stations et phases lunaires.
- `astro/places.mjs` : recherche de villes, validation des coordonnées et fuseaux IANA.
- `astro/core.mjs` : conversions d'heures et conventions zodiacales.
- `astro/interpretations.mjs` : descriptions éditoriales indépendantes du moteur astronomique et des profils.
- `app/src/main/assets/app.js` : interface, journal local et sauvegardes.
- `tests/interpretations.test.mjs` : couverture des combinaisons planète/aspect, lunaisons et stations.

## Limites connues

1. La recherche de ville nécessite Internet et dépend de la disponibilité et des conditions de licence de l'API de géocodage.
2. Sidéral Lahiri dérivé d'une approximation, **non suffisamment validé** pour une diffusion commerciale.
2. Ascendant et maisons absents ; fenêtres d'orbe complètes et passages rétrogrades multiples non encore calculés.
3. Les aspects actifs sont des relevés à midi local, pas des intervalles continus. Certains contacts rapides ou tangents peuvent échapper à un échantillonnage de 6 h.
4. Le calcul mensuel se déroule toujours sur le thread principal de la WebView ; il faudra un Web Worker pour assurer la fluidité sur tous les téléphones.
5. Le stockage journal est local et non chiffré de bout en bout. Import/export doivent être testés sur de vrais téléphones.
6. Le dépôt GitHub historique contient d'anciennes données personnelles. **Ne jamais rendre ce dépôt public** : utiliser un dépôt neuf avec un historique nettoyé pour la diffusion.

La lecture astrologique est une pratique interprétative : elle n’établit pas de lien causal démontré avec l’humeur ou les événements du journal.
## P2.3 — Orbes automatiques et passages exacts

- Le champ manuel « Orbe des transits » est retiré de « Mon ciel ».
- Les transits actifs à midi utilisent une convention automatique selon la planète et l'aspect (voir `TRANSIT_ORB_POLICY` et `ASPECT_ORB_FACTOR`). Le seuil et l'écart mesuré sont affichés.
- Les **passages exacts** sont calculés par recherche de racine temporelle, indépendamment des orbes ; le filtre « Aspects exacts » reste disponible dans le calendrier.
- Les anciens profils et journaux sont conservés ; toute ancienne valeur d'orbe est automatiquement remplacée par `auto`.
- Les aspects actifs restent des relevés à midi, **pas encore des fenêtres continues d'entrée/sortie d'orbe**. L'échantillonnage temporel de six heures peut manquer des contacts tangents ou très rapides.
- Ces orbes sont des conventions astrologiques, pas des constantes astronomiques ni des mesures prédictives démontrées.
