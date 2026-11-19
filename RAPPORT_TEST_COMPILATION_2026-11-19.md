# ASTRA P1 — Tests et tentative de compilation

Date : **19 novembre 2026**. Projet analysé : `ASTRA-P1-Android`, `versionName=0.3.0-p1`, `compileSdk=37`, `targetSdk=37`, `applicationId=org.astra.mobile.p0`.

## Résultats confirmés

| Contrôle | Résultat | Portée |
|---|---|---|
| Contrôles Python `verify_sources.py` | **19/19 OK** | Configuration et présence des fichiers |
| Vérification de syntaxe Node `--check` sur les trois JS | **OK** | Syntaxe JavaScript uniquement |
| `test_assets.cjs` | **OK** | 72 mois-zodiaques et 8 413 contacts |
| `test_p1.cjs` | **OK** | 8 427 fenêtres, 149 phases lunaires et 52 stations |
| `test_ui_mock.cjs` | **OK** | Navigation et filtres simulés |
| `test_integrity_extended.cjs` | **OK** | Cohérence des 8 413 passages dans les fenêtres, fuseau Paris, phases et stations, aspects actifs à midi |
| `test_browser_inline.py` dans Chromium mobile simulé | **17/17 OK** | Interactions UI, changement de zodiaque, calendrier, affichage des fenêtres, filtre lunaire, sauvegarde et restauration, erreurs console |
| Test de débordement horizontal à 393 px | **OK** | Vue Chromium simulée |
| Test Android/WebView | **Non exécuté** | Absence d'émulateur et de téléphone |
| `gradle :app:assembleDebug :app:lintDebug` | **Impossible à exécuter ici** | Ni Gradle ni Android SDK présents ; téléchargement bloqué faute de résolution DNS |
| Signature APK P1 | **Non exécutée** | Aucun APK P1 n'a été produit |

## Observations

La vérification étendue **ne valide pas les éphémérides contre une source indépendante** : les contacts du JSON et les fenêtres reposent sur le même moteur Swiss Ephemeris/Moshier.

Pour le navigateur, les ressources ont été insérées dans une page `about:blank` et `localStorage` a été simulé, car la navigation locale/HTTP du navigateur de test était bloquée par l'environnement. Le test valide le code web et les interactions, **pas** le stockage réel du WebView Android.

Le projet n'a pas de Gradle Wrapper fourni ; la CI GitHub Actions (`.github/workflows/android.yml`) installe Gradle 9.3.1, JDK 17, SDK 37 et les dépendances Maven, puis exécute le build et le lint. Le paramétrage est cohérent avec les versions documentées, mais une vraie compilation reste nécessaire.

**Important :** l'archive et l'APK qui en résulterait contiennent des données natales personnelles non chiffrées. Ne pas déposer ces sources dans un dépôt GitHub public.

## Construire l'APK

### Méthode 1 — GitHub Actions (environnement connecté)

1. Créer un **dépôt privé** GitHub.
2. Décompresser l'archive et placer le contenu du dossier `ASTRA-P1-Android` **à la racine du dépôt**, y compris le dossier caché `.github/workflows`.
3. Dans GitHub, ouvrir **Actions > ASTRA Android P1 — Build > Run workflow**.
4. Une fois le job `debug` réussi, télécharger l'artefact `ASTRA-P1-debug-Android17`, puis le décompresser pour récupérer `app-debug.apk`.
5. Installer l'APK sur Android pour les tests matériels ; exporter les notes de toute version précédente avant changement de signature.

### Méthode 2 — Android Studio

Installer Android Studio récent, SDK Android 37, JDK 17 et Gradle 9.3.1. Ouvrir le dossier du projet, synchroniser Gradle et construire **Build APK(s)**. Ou dans un terminal où `gradle` est disponible :

```sh
./scripts/run_tests.sh
./scripts/build_android.sh
```

Le debug APK est signé automatiquement par une clé de débogage ; **ne pas publier comme version de production**. Une mise à jour d'un APK existant ne fonctionne qu'avec la même clé privée et le même `applicationId`.

### Limites actuelles

- Pas de validation du binaire APK, du manifeste final, de `apksigner verify`, de l'installation ni du lancement Android 17.
- Pas de tests sur la restauration réelle des fichiers dans WebView Android ; le stockage DOM navigateur a été simulé.
- Les calculs sont pré-générés 2026–2028, profil natal fixe, orbe fixe 2°.
