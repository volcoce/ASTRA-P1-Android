# ASTRA P1 — Transits, rétrogradations et lunaisons exactes

**Livraison : source Android Studio, application Web embarquée et éphémérides 2026–2028. Ce ZIP n’est pas un APK compilé.**

## Nouveautés P1

- **8 427 fenêtres d’orbe** à 2° (4 213 tropicales, 4 214 sidérales Lahiri), avec entrées/sorties datées à la seconde UTC, et affichage local à la minute.
- **8 413 contacts exacts** de la v0.2 rattachés à une fenêtre (4 208 tropicaux, 4 205 sidéraux).
- **Passages rétrogrades multiples** : décompte des contacts exacts d’une fenêtre ; regroupements multi-fenêtres pour certains cycles rétrogrades (heuristique explicitée ci-dessous).
- **Phases lunaires exactes** : 149 nouvelles lunes, premiers quartiers, pleines lunes et derniers quartiers (instants géocentriques d’écart de longitude écliptique).
- **Stations planétaires** : 52 stations de Mercure à Pluton, début et fin de rétrogradation selon l’annulation de la vitesse apparente géocentrique tropicale.
- **Aspects à midi** : indication appliquant / séparant / exact / stationnaire à partir de la vitesse en longitude.
- **Filtres** : Tous, Contacts exacts, Transits lents, Transits rapides, Phases lunaires, Stations. Le choix est mémorisé localement.
- **Fiches déroulantes de périodes** : début, fin, nombre de contacts, heures exactes, indication de rétrogradation.

Les données sont **pré-calculées, hors ligne, pour un profil natal fixe** et le fuseau d’affichage `Europe/Paris`. Le moteur Swiss Ephemeris Python **n’est pas intégré à l’APK** et le changement de profil/orbe reste impossible sans reconstruire les données.

## Périmètre du moteur

- Plage : `2026-01-01 00:00:00 UTC` (inclus) à `2029-01-01 00:00:00 UTC` (exclu).
- Deux zodiaques : tropical, sidéral Lahiri ; précession de l’ayanamsa prise en compte séparément dans les transits.
- Orbital : 2° (fixe). Aspects : 0°, ±60°, ±90°, ±120°, 180° pour les dix corps Soleil à Pluton.
- Fenêtres obtenues par balayage de longitudes (pas de 90 minutes Lune, 6 h Soleil/Mercure/Vénus/Mars, 12 h Jupiter à Pluton) et raffinement des franchissements de seuil par bissection. Les contacts exacts proviennent du moteur v0.2 ; chaque contact a été rattaché à une fenêtre.
- Aux limites de 2026–2028, les fenêtres peuvent être **tronquées** et sont explicitement marquées « avant » ou « après » dans l'interface.
- Groupement de plusieurs fenêtres par boucle rétrograde : heuristique des écarts (Mercure 45 jours, Vénus 85, Mars 160, Jupiter 220, Saturne–Pluton 250) et exigence d'un passage rétrograde. **Ce n’est pas une classification astronomique canonique des boucles**.
- Positions géocentriques apparentes, éphémérides Swiss Ephemeris en mode analytique **Moshier**. Pas de fichiers JPL et pas de corrections topocentriques.
- Phase lunaire affichée dans la grande carte de l’accueil = catégorie simplifiée de l’élongation à midi (héritée v0.2). Les **instants exacts** P1 sont présentés séparément dans « Moments exacts » ou le calendrier.

La séparation entre calculs et interprétations est conservée. Les lectures astrologiques symboliques ne sont pas des prédictions causalement validées.

## Compilation Android 17

Identifiant de paquet : `org.astra.mobile.p0` (identique au projet P0 ; différent de l’ancien APK initial `org.astra.mobile`). `versionCode` 301 et `versionName` 0.3.0-p1.

Exigences (sur ordinateur compatible) : Android Studio récent, JDK 17, SDK Android 37, Gradle 9.3.1 et réseau pour récupérer les dépendances Gradle et AndroidX lors du premier build.

```sh
gradle --no-daemon :app:assembleDebug :app:lintDebug
```

Sans SDK local, le workflow `.github/workflows/android.yml` permet de construire un APK de débogage via GitHub Actions. **Un APK de debug signé avec une autre clé que le P0 déjà installé ne peut pas remplacer celui-ci.** Pour une mise à jour par-dessus P0, utiliser **la même clé de signature et le même applicationId**. Le projet P0 ne contient pas la clé privée de l'ancien APK. Toujours exporter le journal avant toute migration ou désinstallation.

Le Gradle Wrapper n’est pas livré (distribution Gradle non disponible dans l’environnement de création). Le workflow cloud télécharge Gradle 9.3.1 directement.

## Vérifications sans SDK

```sh
python3 scripts/verify_sources.py
node --check app/src/main/assets/app.js
node --check app/src/main/assets/data.js
node --check app/src/main/assets/p1-data.js
node tests/test_assets.cjs
node tests/test_p1.cjs
node tests/test_ui_mock.cjs
```

Les tests vérifient la présence des données, la couverture des contacts, les extrema lunaires documentés de novembre 2026, la syntaxe des scripts et le rendu dans un DOM simulé. **Aucun appareil Android réel, émulateur ni rendu Chromium n’a été validé.** Un essai de navigateur dans cet environnement a échoué à cause des restrictions d’accès locales.

## Régénération astronomique

Environnement Python avec Swiss Ephemeris :

```sh
python3 -m pip install -r tools/requirements.txt
python3 tools/generate_p1.py
```

Les ressources natives sont `app/src/main/assets/data.js` et `app/src/main/assets/p1-data.js`. Le script est reproductible à partir des données de la v0.2 intégrées. Il **inclut des données natales personnelles non chiffrées** : garder le dépôt privé et éviter de diffuser l'APK sans les enlever.

**Licence** : la distribution de code ou dérivés utilisant Swiss Ephemeris nécessite une vérification de la double licence AGPL/commerciale auprès de son fournisseur.

## Limites restantes

Le P1 n'est pas P2 (interprétations détaillées, suivi de cycles éditorial, UX finie), ni P3 (moteur Android natif hors ligne, profil modifiable, sauvegardes natives). Les fenêtres très brèves proches d'un simple effleurement d'orbe pourraient échapper au pas d'échantillonnage, et les tests ne constituent pas une validation exhaustive indépendante. L’application P1 est expérimentale.

## Tests et compilation — audit du 19 novembre 2026

Voir [`RAPPORT_TEST_COMPILATION_2026-11-19.md`](RAPPORT_TEST_COMPILATION_2026-11-19.md) pour le périmètre réellement testé. Ajouts : tests d'intégrité `tests/test_integrity_extended.cjs`, tests Chromium mobile `scripts/test_browser_inline.py`, vérification globale `scripts/run_tests.sh`, script de compilation `scripts/build_android.sh`.

**Attention : l'exécution locale n'a pas pu compiler l'APK P1 :** absence du SDK Android/Gradle et impossibilité d'accéder aux téléchargements requis. La CI GitHub Actions présente dans les sources reste la procédure conseillée de fabrication du binaire, à exécuter dans un dépôt GitHub privé.


## Décompression des données volumineuses (dépôt GitHub)

Les jeux d'éphémérides embarqués `data.js` et `p1-data.js` sont archivés sans perte
respectivement dans `data.js.gz` et `p1-data.js.gz` pour faciliter le transfert
par GitHub. Le workflow CI les restaure avant les tests et la compilation.
Pour utiliser les sources en local, lancer `python3 scripts/inflate_assets.py`
avant les tests ou Gradle. Les sources contiennent un profil natal personnel :
**garder le dépôt privé**.
