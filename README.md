# ASTRA Public — Preview 0.8.10

## Bande zodiacale visible et centre épuré — Preview 0.8.10

- Suppression des médaillons ASTRA / TROPICAL / SIDÉRAL / HEURE INCONNUE / NATAL / TRANSITS au centre des trois roues, sans cacher les aspects.
- Le signe zodiacal associé à la sélection est mis en évidence par **un secteur entier rempli d'ambre clair**, et plus seulement par un filet doré.
- Sans sélection, la roue natale montre le signe du **Soleil natal** et la roue double celui du **Soleil en transit** ; sélectionner une planète ou la cuspide d'une maison adapte la bande.
- Une légende sous la roue nomme précisément la planète ou la cuspide et son signe. Les degrés planétaires et la séparation natal/transit sont inchangés.
- Les exports SVG/PNG conservent la nouvelle bande. Tests de régression pour les trois variantes, le signe par défaut, les sélections et l'absence de cartouche central.
- Le test d'accessibilité du calendrier utilise une date de référence fixe pour ne plus échouer lorsqu'il n'est plus exécuté le 20 novembre 2026.



## Refonte graphique de la roue astrologique — Preview 0.8.9

- Trois vues harmonisées : thème natal avec maisons, naissance sans heure, et roue double natal/transits.
- Anneau zodiacal bleu-gris, alternance discrète des signes et maisons, séparateurs de maisons différenciés, graduations tous les 5° (accent tous les 30°).
- Les planètes ont désormais des pastilles contrastées, avec Soleil doré, Lune bleue et mise en évidence claire de la sélection ; la roue double conserve natal violet / transits bleu.
- L'accueil montre jusqu'à trois aspects natals parmi les plus serrés pour donner un repère visuel sans saturer la carte. Les vues détaillées continuent d'exposer les aspects filtrés.
- **Précision préservée** : les petits points restent sur les longitudes astronomiques réelles ; les symboles peuvent être déplacés pour éviter les collisions. Les maisons conservent leur géométrie calculée, sans inventer un Ascendant si l'heure manque.
- Palette SVG identique dans la roue interactive et les exports SVG/PNG ; aucune connexion réseau ou police externe ajoutée.
- Nouveaux tests de régression pour les trois SVG, les 72 graduations, les marqueurs de degré exact, les zones cliquables et les ressources de styles chargées en CI.
- Vérification visuelle et tactile réelle requise avant distribution ; les tests de source ne la remplacent pas.



**Référence UI/UX du projet :** [UI_ARCHITECTURE.md](UI_ARCHITECTURE.md) pour la hiérarchie, la navigation, les composants et l'accessibilité ; [DESIGN.md](DESIGN.md) pour l'identité visuelle. Les règles pour assistants de code sont dans [AGENTS.md](AGENTS.md).

## Calendrier compact — Correction visuelle (Preview 0.8.7)

Le problème visible sur mobile en 0.8.6 était un **conflit CSS**, pas un problème de calcul astronomique. L'icône SVG portait la classe `calendar` et héritait à tort du rembourrage, de la bordure et des dimensions du panneau calendrier, produisant des formes parasites et des chevauchements.

- Les classes des icônes SVG sont maintenant préfixées (`astra-phase-variant-cell`, `astra-phase-variant-hero`, etc.) pour empêcher toute collision avec les conteneurs.
- La grille garde sept colonnes de largeur égale. Chaque date dispose d'une case de 55 px de haut, avec numéro en haut, petite phase lunaire centrée, point d'événement discret en haut à droite et trait d'aspect solaire en dessous.
- La Nouvelle Lune violette et la Pleine Lune dorée conservent leurs fonds et leur signification, sans déborder sur les cases voisines.
- Vérification dans Chromium à 320 px sur la **vraie application 0.8.6 reproduite** : le correctif réduit les SVG de leur taille accidentelle (et supprime la bordure parasite) ; aucun débordement horizontal.
- Régression automatisée : vérifie que les SVG et les traits solaires restent contenus dans leurs cases, que l'icône n'a ni padding ni bordure de panneau, que les classes sont préfixées et que la grille ne dépasse pas 320 px.

## Repères solaires et icônes de phase lunaire — Preview 0.8.6

Le calendrier conserve une grille **simple et lisible** en affichant les informations astronomiques par petits indicateurs plutôt qu'en colorant toutes les cases.

- **Huit phases lunaires illustrées** : chaque case du calendrier reçoit une petite Lune dessinée en SVG à partir de l'angle Soleil–Lune **à midi local**, calculé par le moteur pour la date concernée. Les icônes de la carte principale de « Ce jour » sont également calculées : aucun croissant générique.
- **Événements remarquables conservés** : les cases de Nouvelle Lune restent violettes et celles de Pleine Lune restent dorées. Ces événements astronomiques ont leur propre horaire et leur propre signe zodiacal, distincts de la position de midi.
- **Trait solaire doré** : une courte ligne apparaît sur un jour lorsqu'un **aspect exact du Soleil en transit avec une planète natale** est calculé pour cette date. L'indicateur ne prétend pas être un transit continu ni un autre type d'aspect ; toucher la date permet d'en voir le détail.
- **Légende accessible** : icône de phase à midi, Nouvelle Lune, Pleine Lune et trait d'aspect solaire exact. Les marqueurs sont aussi annoncés dans le libellé accessible de chaque date et persistent indépendamment des filtres d'événements.
- **Performance / confidentialité** : un seul angle lunaire de midi est stocké dans le résultat mensuel déjà calculé ; pas de requête réseau, pas de service tiers et aucune donnée supplémentaire sauvegardée dans le profil.
- **Tests** : vérification des angles lunaires par jour, des huit phases et de l'indépendance tropical/sidéral ; tests de la grille sur mobile, présence des traits solaires sur les bonnes dates et maintien des repères après filtrage.

## Une même journée, plusieurs positions lunaires — Preview 0.8.5

Dans « Ce jour », ASTRA distingue désormais clairement **la position de la Lune à midi** et **les événements à leur heure exacte**.

- **Entrée dans un signe** : le moteur calcule les limites de chaque journée civile dans le fuseau du profil, échantillonne la longitude lunaire puis affine les passages de signe par dichotomie. La chronologie indique l'heure et le nouveau signe. Elle ne prétend pas que la Lune conserve son signe de midi pendant 24 heures.
- **Pleine Lune / Nouvelle Lune** : les événements `calculateMonth` stockent maintenant la longitude lunaire **à l'instant réel de la phase** ; le signe affiché est celui de cet instant, dans le mode tropical ou sidéral choisi.
- **Ordre chronologique** : lors d'un changement de signe et d'une phase le même jour, ASTRA affiche les deux horaires successifs dans une section compacte sous la position de midi. Quand les signes diffèrent, un texte explique pourquoi.
- **Exemple de vérification** : le 24 novembre 2026 en zodiaque tropical, la Lune est en Taureau à 12 h, entre en Gémeaux ensuite, puis la Pleine Lune se produit dans ce dernier signe. Les horaires sont recalculés, non figés dans l'interface.
- **Ce mois et Calendrier** : les phases y comportent également leur signe **au moment exact**, sans confondre celui-ci avec la position de midi.
- **Fuseau cohérent** : les horaires de « Ce jour » utilisent le fuseau du profil de naissance, comme les événements du calendrier (affiché explicitement). Les données du journal et les réglages existants ne sont pas modifiés.
- **Tests** : calcul précis des transitions, passage Taureau → Gémeaux, Pleine Lune en Gémeaux le 24 novembre 2026, changement d'heure été/hiver, zodiaques, scénario UI à deux signes le même jour.

## La Lune du jour, avant les chiffres — Preview 0.8.4

« Ce jour » met désormais en avant une position astrologique concrète et lisible, et non uniquement un nombre abstrait d'événements.

- **Carte principale** : « Lune en [signe] », phase lunaire du jour, puis nombre réel d'événements exacts en information secondaire.
- **Trois cartes secondaires** : Soleil du jour (signe et longitude calculés), Journal, Mon ciel. La phase de Lune n'est plus dupliquée sur deux cartes.
- **Calcul à midi local** : nouvelle fonction `dailySky(jour, fuseau, mode)` utilisant les éphémérides astronomiques. Fuseau du profil pour rester cohérent avec le calendrier (et affiché sur la carte). Le zodiaque tropical/sidéral suit le mode choisi.
- **Précision** : il s'agit de la position **à midi**, pas nécessairement de la position à chaque instant de la journée. Les textes précisent cette limite ; ASTRA n'invente pas de prédiction.
- **Robustesse** : échec de calcul signalé explicitement ; compte d'événements indépendant des filtres du calendrier ; calcul toujours en local.
- **Validation** : tests unitaires des longitudes à midi, fuseaux et modes zodiacaux ; tests UI sur 320–1280 px et vérification de la nouvelle hiérarchie.

## Cohérence temporelle — Preview 0.8.3

- **Ce jour** retrouve la date actuelle chaque fois qu’on ouvre son onglet, même après exploration d’un autre mois dans Calendrier. La sélection ponctuelle d’une autre date reste possible via la semaine affichée.
- **Ce mois** retrouve le mois courant chaque fois qu’on ouvre son onglet. Les flèches permettent de consulter d’autres mois dans cette même vue, sans modifier l'accueil quotidien à la prochaine visite.
- **Calendrier** reste l’espace d’exploration des dates : ses filtres d’événements **n’altèrent plus** les chiffres et les événements de « Ce jour ». Le résumé mensuel utilise toujours le total calculé, indépendamment du filtre.
- Pendant un nouveau calcul, « Ce jour » affiche un état de chargement, pas un faux « 0 événement ».
- Le Journal conserve les notes historiques à leur date : revenir à « Ce jour » n’affiche pas une note ancienne comme si elle concernait aujourd’hui.
- Tests de régression Chromium : retour d’un mois historique, respect de la date courante, absence d’interférence des filtres et conservation des notes.

## Navigation en quatre univers (Preview 0.8.2)

La navigation principale suit maintenant exactement cet ordre, dans la barre inférieure : **Ce jour / Ce mois / Calendrier / Mon ciel**.

- **Ce jour** : choix du jour, phase lunaire de cette journée, événements et raccourci vers le journal.
- **Ce mois** : synthèse du mois affiché (nombre réel d'événements exacts et de jours concernés), jours notés, Nouvelles Lunes et Pleines Lunes du mois et cinq premiers événements. Les raccourcis ouvrent la date correspondante dans le calendrier.
- **Calendrier** : grille complète des dates, repères lunaires colorés, tous les événements du jour et prochaines phases lunaires.
- **Mon ciel** : thème natal, lecture roue/planètes/aspects, transits et outils avancés.
- **Journal** : toujours accessible depuis la carte de « Ce jour », le bilan mensuel, les questions de journal et même sans profil natal ; un lien « Retour à Ce jour » remplace l'ancien onglet. Les données sauvegardées ne changent pas.

Le résumé mensuel n'affiche aucun chiffre de zéro inventé pendant le chargement. Les tests contrôlent le contenu et les transitions sur des résolutions mobiles, tablette et bureau.

## Phases lunaires au bon endroit (Preview 0.8.1)

- **Ce jour** se limite à la date choisie : la carte « Lune » affiche sa phase indicative, sans chronologie des phases futures.
- **Calendrier** présente le calendrier et les événements du jour, puis les quatre phases lunaires suivantes. Les jalons, calculés astronomiquement, ouvrent la date correspondante dans le calendrier.
- Les repères violet/doré de Nouvelle Lune et Pleine Lune restent dans les cases du mois.
- Un test navigateur empêche le retour des phases futures dans « Ce jour » et vérifie leur emplacement ainsi que le lien depuis le calendrier.

## Explorateur astrologique (Preview 0.8.0)

ASTRA reprend de TimePassages une **exploration à plusieurs niveaux**, sans reproduire son identité visuelle et sans ajouter de nouvelles sections à la navigation principale. L'accueil reste inspiré de l'organisation en widgets de Flo.

- **Mon ciel** : sélecteur `Roue / Planètes / Aspects` dans le même écran. Les signes et positions viennent du thème calculé ; chaque planète/aspect ouvre sa fiche de lecture. Glossaire de six notions accessible à la demande.
- **Cycle lunaire dans Dates** : les quatre prochaines phases majeures sont calculées avec `Astronomy.SearchMoonQuarter` / `NextMoonQuarter`, présentées sous le calendrier en jalons tactiles ; toucher un jalon ouvre sa date dans le calendrier.
- **Navigation temporelle inchangée** : le sélecteur de semaine de « Ce jour », le calendrier mensuel et les champs de date de comparaison/progressions restent disponibles. Aucun bouton « Suivant » supplémentaire n'est ajouté à l'application : la progression entre étapes se fait dans la conversation ChatGPT.
- **Transits** : filtre `Tous / Rapides / Lents` sur les contacts exacts du moment, avec sens `appliquant / séparant` estimé par comparaison d'écarts à une heure d'intervalle. Une fiche de contact montre la période approximative d'activité dans l'orbe automatique, calculée à la demande par balayage et dichotomie ; les retours rétrogrades ne doivent pas être interprétés comme une période unique parfaitement définie.
- **Outils avancés (repliés)** : progressions secondaires par convention `un jour d'éphéméride = une année écoulée` (longitudes planétaires uniquement) ; carte composite à partir d'une seconde date/heure/ville de naissance (milieux zodiacaux sur l'arc court). Les maisons, angles et interprétations prédictives non établies ne sont pas inventés.
- **Confidentialité** : les informations saisies pour le deuxième thème composite restent uniquement en mémoire de la page ; aucune seconde personne n'est ajoutée au profil, au journal ou à `localStorage`.
- **Précision** : les positions « progressées » et composites sont des **conventions astrologiques**, pas des corps célestes physiques à un instant donné. Leur signification n'est pas scientifiquement prédictive.

Les calculs natals, les exports, le journal et les informations astronomiques continuent à utiliser le moteur existant. Les tests de l'interface mobile, le moteur des phases et des orbes sont exercés par GitHub Actions.

## Calendrier — Nouvelle Lune et Pleine Lune (Preview 0.7.2)

- **Nouvelle Lune** : jour teinté de violet, symbole plein **●**.
- **Pleine Lune** : jour teinté de doré, symbole creux **○**.
- Une légende visible sous le calendrier et des noms explicites dans les descriptions accessibles des dates.
- Les couleurs proviennent des événements réels de `SearchMoonQuarter` dans le moteur astronomique, localisés à la date du calendrier. Aucune déduction approximative à partir d'une phase observée à midi.
- Les repères de phases lunaires restent visibles indépendamment du filtre d'événements ; la date sélectionnée, les notes de journal et les points d'événements conservent leurs propres indicateurs.
- Tests Chrome avec dates de Nouvelle Lune, Pleine Lune et jours sans repère ; vérification des deux couleurs et de l'accessibilité.

## Accueil en widgets — Inspiration Flo (Preview 0.7.1)

Cette version s'inspire de **l'organisation** des vues quotidiennes de [Flo](https://flo.health/fr), sans utiliser ses graphismes, couleurs ni contenus. La recherche publiée par l'équipe design de Flo privilégie un **écran quotidien défilable**, donnant les informations importantes en résumé avant les détails.

- **Sélecteur de semaine en haut** : sept jours de lundi à dimanche, semaine précédente/suivante, date sélectionnée clairement marquée. Les changements de mois continuent d'utiliser le moteur astronomique existant.
- **Un widget central unique** : nombre réel d'événements calculés pour la date et accès à la liste, sans prédire l'état émotionnel ou affirmer un événement non calculé.
- **Trois widgets secondaires sous le résumé** : phase de Lune approximative calculée à midi UTC, raccourci vers la note du jour (ou nouvelle note), accès à la carte de naissance. Défilement horizontal limité à cette seule rangée.
- **Contenu approfondi plus bas** : trois premiers événements détaillés et accès aux suivants par une ouverture explicite ; angles « en cours » dans une section secondaire.
- **Aucune perte de données** : le stockage `astra-public-v1`, la roue natal/transit, les outils techniques, l'export, les événements astronomiques et le journal restent présents.
- **Mobile** : tests de la semaine, des raccourcis, du résumé, de l'absence de débordement et captures aux largeurs 320, 360, 393 et 412 px.

Source de référence de la hiérarchie : [Flo Health — « How we evolved and enriched the main screen… Part 2 »](https://medium.com/flo-health/how-we-evolved-and-enriched-the-main-screen-of-the-flo-app-part-2-cycle-widgets-b73d5ccb948d).

## Nouvelle interface — Atlas clair (Preview 0.7.0)

Refonte de l'expérience de lecture, pas seulement une retouche des couleurs. Cette version remplace les titres et icônes répétitifs par une navigation explicite, des signes nommés et deux parcours clairs sur Mon ciel.

- **Identité** : en-tête bleu nuit avec repère solaire, fond papier froid, typographie sans empattement, contraste renforcé sur les boutons et l'information. Quatre icônes de navigation cohérentes remplacent les pictogrammes disparates. Le bouton Aujourd'hui du haut, redondant avec l'onglet bas, est supprimé.
- **Mon ciel** : Soleil, Lune et Ascendant affichent désormais leur **nom, symbole zodiacal et signe en toutes lettres**. La roue reste interactive et prend le premier plan. Deux actions expliquent leur utilité : **Comprendre mon thème** (planètes, signes, maisons) et **Comparer deux dates** (ciel d'un autre jour).
- **Compréhension** : un seul titre principal par page, suppression des doublons sur Explorer/Comparer, textes raccourcis et langage plus concret. La matrice est présentée comme un tableau de comparaison. Les événements indiquent les deux planètes et l'angle. La terminologie reste disponible dans les détails.
- **Calendrier** : mode tropical/sidéral et filtres regroupés sous « Options d’affichage », au lieu d'occuper l'écran avant le calendrier.
- **Journal** : demande « Comment tu te sens ? », indications sur les cinq choix d'humeur, énergie et notes plus explicites.
- **Technique conservée** : moteurs de calcul, heures incertaines, systèmes de maisons, export, sauvegarde locale `astra-public-v1`, zoom et comparaisons restent fonctionnels.

**Contrôles** : le test Chromium vérifie la lisibilité des signes en clair, les titres, les destinations et le responsive Android ; CI produit des captures. Les tests de compréhension réelle et la revue sur Galaxy A15 physique restent à effectuer. Les visuels ont été refaits de manière empirique, pas validés par des tests utilisateurs.

## Android — Mise en page adaptative (Preview 0.6.4)

Correction transversale de l'interface WebView pour le **Galaxy A15** et les autres téléphones Android : les écrans physiques de 1080 px sont souvent utilisés autour de 360 pixels CSS, selon le facteur d'affichage et de police.

- **Barres Android et clavier** : la WebView tient compte des encoches et barres système ainsi que de l'IME (clavier à l'écran). Le bas de la WebView est redimensionné avec `adjustResize` et `WindowInsets.Type.ime()`. Les marges CSS sont neutralisées lorsqu'elles sont déjà réservées par la fenêtre native, pour éviter de les compter deux fois.
- **Retour système** : le geste Retour ferme la fiche en cours, puis la lecture agrandie, puis une sous-page Mon ciel, ou revient à Aujourd'hui. Il ferme l'application uniquement depuis l'accueil sans panneau ouvert.
- **Largeur mobile** : la roue astrologique tient entièrement dans sa zone à **100 % de zoom** (y compris à 320–360 pixels CSS). Les zooms explicites restent accessibles avec défilement horizontal interne ; la roue n'est plus coupée par la largeur fixe de 320 px. Les tableaux d'aspects conservent leur défilement interne.
- **Navigation, champs et fiches** : tabulation basse adaptée aux petits écrans et masquée pendant la saisie ; formulaires, date/heure et coordonnées de positions passent sur une ou deux colonnes selon la largeur. Le panneau des planètes reste lisible au-dessus de la barre inférieure.
- **Mode lecture agrandie** : la fenêtre est désormais défilable verticalement sur les écrans très courts ou en paysage, afin de garder le bouton Fermer et les outils accessibles.
- **Tests** : simulation de résolutions CSS 320, 360, 375, 393, 412, 480, 768 et 1280 ; variations de hauteur, agrandissement des textes, ouverture de clavier simulée par focus, retour Android simulé côté JS et captures d'écran enregistrées en CI.

**Limites** : des tests de navigateur ne prouvent pas le résultat sur la WebView Samsung réelle ni avec le clavier natif, la navigation à trois boutons et les réglages de police. Il faut confirmer le rendu et les barres système sur un Galaxy A15 physique. Les calculs astronomiques, les exports et la base locale `astra-public-v1` restent inchangés.

## UX P1 — Design system et interactions cohérentes (Preview 0.6.3)

La charte [DESIGN.md](DESIGN.md) s'applique désormais aussi aux composants interactifs et aux styles partagés.

- **Tokens consolidés** : couleurs sémantiques (papier, surface, violet natal, bleu transit, focus et sélection), rayons de bordure, espacements et durée de transition définis une seule fois dans `:root`. Les anciennes variables de compatibilité restent disponibles.
- **États cohérents** : la matrice d'aspects et les contacts de transits marquent désormais la sélection par `aria-pressed` et un état visuel dédié. Les boutons disposent de règles de focus/hover communes. La navigation de fond est masquée en mode roue agrandie.
- **Lecture stable** : choisir une planète, une maison ou un aspect ne réinitialise plus le défilement interne de la roue. Le retour clavier est conservé après changement de système de maisons ou de disposition ; la date/heure des transits et la recherche du journal restaurent leur champ.
- **Micro-interaction discrète** : apparition du panneau de lecture en 150 ms uniquement lorsque l'utilisateur n'a pas demandé une réduction des mouvements. Aucune animation sur les positions astronomiques.
- **Régression visuelle** : les tests Chromium enregistrent des captures d'écrans à 320, 393, 768 et 1280 px ainsi que des vues Explorer, Comparer, Réglages, Calendrier et Journal, avec un profil purement synthétique. Les captures sont publiées comme artefact GitHub Actions.
- **Moteur intact** : aucune modification des calculs astronomiques, données natales, exports ou du stockage `astra-public-v1`.

**Limites :** les tests navigateur restent simulés pour les calculs. Une inspection visuelle des captures et des tests sur téléphone Android (gestes, TalkBack, grossissement système) sont nécessaires avant une publication publique.

## UX P0 — Lisibilité et sobriété visuelle (Preview 0.6.2)

La charte [DESIGN.md](DESIGN.md) s'applique à **Aujourd'hui, Calendrier, Journal et Mon ciel**. La palette astronomique demeure, mais les surfaces sont volontairement plus neutres.

- **Typographie** : les textes informatifs, aides de formulaire, légendes, dates et libellés de navigation sont désormais généralement à **12–15 px**, au lieu de 10–11 px. Les titres principaux restent plus grands.
- **Sobriété** : fond papier uni, cartes sans ombre décorative, roue sur fond blanc, dégradés superflus retirés des panneaux principaux, résumé Soleil–Lune–Ascendant simplement séparé par une ligne.
- **Aucune perte fonctionnelle** : calculs, modes de lecture, réglages, zoom, exports, journal et stockage local `astra-public-v1` inchangés.
- **Vérification** : tests de style calculé et de débordement horizontal à 320, 393, 768 et 1280 px, en complément des tests d'interaction. Tests physiques TalkBack et inspection de captures restent à faire avant distribution publique.

Pour mettre à jour localement : `git pull origin main && npm install && npm run dev`.

## UX P2.1 — Lecture agrandie de la roue (Preview 0.6.1)

La roue possède un **mode lecture agrandie**, accessible depuis Mon ciel, Explorer (roue déployée), Comparer et l'aperçu des Réglages. L'accueil n'expose aucun des réglages avancés avant demande explicite.

- **Contexte préservé** : natal depuis l'accueil ou Explorer ; roue double depuis Comparer ; disposition active depuis les Réglages.
- **Lecture sans distraction** : carte centrée, légende, zoom de 100 à 200 %, réinitialisation et export SVG/PNG. Les longitudes et cuspides sont calculées par le moteur actuel.
- **Navigation** : bouton Fermer ou Échap, retour au contexte précédent et au bouton d'ouverture ; Tab et Maj+Tab restent dans la fenêtre de lecture. Les fiches de planète s'ouvrent toujours par sélection du symbole.
- **Zoom contextualisé** : préservation du centre du défilement au changement de zoom. Le stockage `astra-public-v1` n'est pas modifié.
- **Tests** : le contrôle navigateur simule la vue agrandie, le zoom, le retour clavier et la roue double. Validation complémentaire sur téléphone Android et TalkBack nécessaire.

**Mise à jour locale** : `git pull origin main && npm install && npm run dev`.

## UX P1 — Explorer, comparer et lire sans encombrement (Preview 0.6.0)

La page **Mon ciel** utilise désormais un bandeau zodiacal compact **☼ ♌︎ | ☽ ♓︎ | ↑ ♋︎** à titre d'exemple de format : les signes affichés viennent **exclusivement des longitudes du profil**, dans le zodiaque tropical ou sidéral sélectionné. Chaque paire symbole + signe reste un bouton accessible avec son nom complet. En l'absence d'heure natale, l'Ascendant est absent et la Lune est signalée comme indicative.

- **Explorer mon thème** affiche une seule des trois rubriques **Planètes / Maisons / Aspects**, sans déployer les autres listes. Les maisons ne sont proposées que si l'heure natale est connue. La matrice des aspects et la roue détaillée sont ouvertes sur demande ; les filtres d'aspects n'apparaissent que dans leur rubrique.
- **Fiche contextuelle** : sélectionner une planète, une maison ou un aspect ouvre un panneau de lecture. Sur petit écran, il apparaît au-dessus de la navigation basse, avec un bouton Fermer et la touche Échap ; sur grand écran, il s'affiche sur le côté. Il ne prétend pas remplacer le calcul natal ni produire des interprétations scientifiques.
- **Comparer avec les transits** est une destination distincte de l'exploration natale : une seule roue double, des champs date et heure directement accessibles, et la liste des contacts à l'instant choisi. Les outils professionnels (zodiaque, systèmes de maisons, niveaux de détail, zoom et export SVG/PNG) restent dans **Réglages**.
- Les écrans avancés conservent le moteur, les calculs et les sauvegardes introduits en P0–P2. Les nouvelles rubriques et l'ouverture des fiches sont des états d'interface temporaires, sans modifier le contenu du profil `astra-public-v1`.
- Les tests `tests/ui-smoke.py` contrôlent les pictogrammes zodiacaux calculés, la séparation des rubriques, la fermeture des fiches au clavier, la roue double indépendante, les exports, les maisons sans heure connue, le journal et l'affichage à 320 px.

**Essai local :** `git pull origin main`, puis `npm install && npm run dev` et ouvrir http://127.0.0.1:4173/.

**Limites :** les tests Chrome utilisent un moteur astrologique simulé pour l'interface. Le rendu tactile sur un appareil Android physique et l'accessibilité TalkBack restent à vérifier.


## UX P0 — Mon ciel sans cockpit (Preview 0.5.9)

**Objectif :** le thème astral et la compréhension passent en premier, les réglages sont disponibles sans dominer l'écran.

- L'écran **Mon ciel** d'un profil enregistré présente immédiatement **Soleil, Lune, Ascendant (quand l'heure est connue)**, puis une roue interactive épurée et une fiche de lecture contextuelle.
- Deux parcours compréhensibles : **Explorer mon thème** pour les positions, maisons, aspects, filtres et matrice ; **Comparer avec les transits** pour la roue double et la date de comparaison.
- Les vingt commandes techniques initialement placées **au-dessus de la roue** sont déplacées dans **Réglages** : zodiaque, système de maisons, niveaux de détail, roue double, zoom, export SVG/PNG.
- Les **données de naissance** et les **sauvegardes JSON** sont visibles dans **Réglages**, et uniquement sur cet écran lorsque le profil existe. Le premier lancement sans profil affiche directement le formulaire de création.
- Sur mobile, les cartes principales, les boutons d'action et les fiches sont plus grands et mieux séparés. La roue conserve au moins 320 px de largeur, avec défilement interne si nécessaire.
- Une naissance à heure inconnue montre uniquement Soleil et Lune (Lune indiquée comme approximative), sans Ascendant inventé.
- L'écran de réglages conserve l'ouverture de l'aperçu SVG entre les changements de paramètres. Sur Android, l'export des images utilise toujours le sélecteur de documents créé dans P2.
- Les choix actuels de calcul, les préférences et le journal existant restent sous la même clé de stockage `astra-public-v1` ; la navigation entre aperçu, exploration et réglages est une préférence d'interface **non persistée**.
- Les tests Chrome contrôlent explicitement la hiérarchie Soleil/Lune/Ascendant avant la roue, l'absence de paramètres sur l'accueil, la navigation vers l'exploration et les réglages, les tailles tactiles, la vue 320 px et les fonctionnalités P1–P2.

Tester sur PC : `npm install && npm run dev`, puis ouvrir `http://127.0.0.1:4173/`.
Tester sur Android : compiler l'APK de test signé ASTRA Preview via GitHub Actions. L'ergonomie avec TalkBack et sur téléphone physique reste à vérifier.


## P2 — Expérience avancée (Preview 0.5.8)

La page **Mon ciel** ajoute les outils avancés aux modes Essentiel et Complet, sans altérer les valeurs astronomiques.

- **Direction artistique** : fond ivoire, détails améthyste et or ancien, typographie éditoriale, contrastes renforcés et mise en page à deux colonnes dès 800 px. La roue et les fiches restent empilées sur mobile.
- **Export SVG/PNG** : boutons dédiés, SVG autonome avec glyphes et styles intégrés ; PNG haute résolution (1600 × 1600 px). Sur PC, téléchargement navigateur. Sur Android, un pont natif **limité à l'écriture d'une nouvelle image SVG/PNG** ouvre le sélecteur de documents système et n'offre aucune lecture de fichiers ni connexion réseau. Ne stocke aucun thème sur un serveur.
- **Zoom** : commandes −/+, de 100 à 200 % par pas de 25 %, mémorisées sur l'appareil ; défilement horizontal à fort grossissement.
- **Matrice des aspects** : tableau interactif des dix corps, qui respecte les filtres P1 et ouvre la fiche de l'aspect choisi en mode Complet.
- **Systèmes de maisons** : Placidus, **maisons égales depuis l'Ascendant** et **signes entiers** (maison I commence au degré 0 du signe de l'Ascendant). ASC et MC restent des angles astronomiques indépendants des cuspides. Le réglage est propre à la roue de Mon ciel ; le calendrier continue à calculer ses positions natales avec son réglage interne. Les latitudes où Placidus est impossible affichent toujours la solution de repli.
- **Roue double natal/transits** : roue interne violette pour les positions natales, anneau externe bleu pour les positions des dix corps au jour et à l'heure locale sélectionnés. Conversion de fuseau IANA, puis calcul à l'instant UTC exact ; sélection des planètes extérieures pour consulter les contacts dans les orbes automatiques. Les contacts sont des instantanés d'écarts angulaires, **pas** des prédictions d'événements ni des fenêtres d'orbes complètes.
- **Données partielles** : une date sans heure n'invente toujours pas de maisons ni d'Ascendant. Dans la roue double, les contacts à la Lune natale restent exclus et les positions natales sont indiquées comme indicatives.
- **Sauvegarde** : les préférences `houseSystem`, `wheelLayout`, `natalZoom`, `transitDay` et `transitTime` utilisent l'ancienne clé `astra-public-v1`, sans suppression des données préexistantes.

**Vérification** : `npm test` contrôle la géométrie des maisons Equal/Whole et les instantanés astronomiques ; `tests/ui-smoke.py` passe dans Chrome et télécharge réellement un SVG et un PNG, en plus d'essayer les contrôles P2. L'ouverture du sélecteur Android nécessite une validation sur un téléphone physique.

**Limites** : ayanamsa Lahiri sidéral toujours approximatif, conventions astrologiques symboliques, qualité des glyphes SVG liée aux polices disponibles lors de l'export et règles de fuseau à vérifier pour les heures historiques ambiguës.


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
