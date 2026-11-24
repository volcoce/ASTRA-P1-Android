# ASTRA

**Ton atlas céleste personnel.** Application d’astrologie pour Android et navigateur, en français. Calculs astronomiques sur l’appareil, sans compte utilisateur.

[![CI Android](https://github.com/volcoce/ASTRA-P1-Android/actions/workflows/android.yml/badge.svg?branch=main)](https://github.com/volcoce/ASTRA-P1-Android/actions/workflows/android.yml?query=branch%3Amain)

[**Télécharger l’APK Preview**](#android) · [Lancer sur ordinateur](#développement) · [Historique des versions](CHANGELOG.md)

## Fonctionnalités

| Espace | Fonction |
| --- | --- |
| Ce jour | Ciel quotidien, phases et changements de signe de la Lune, événements. |
| Calendrier | Vue mensuelle, phases lunaires, signes solaires et événements personnels. |
| Mon ciel | Thème natal, roue interactive, planètes, maisons, aspects et comparaison de dates. |
| Paramètres | Profil de naissance, préférences, système zodiacal et apparence. |

Le journal personnel est accessible depuis les écrans concernés. ASTRA prend en charge les zodiaques tropical et sidéral (Lahiri approximatif), ainsi que la sauvegarde JSON des données locales.

## Android

Version de développement : **0.8.17 Preview**.

1. Ouvrir [Android CI sur la branche main](https://github.com/volcoce/ASTRA-P1-Android/actions/workflows/android.yml?query=branch%3Amain).
2. Sélectionner une exécution réussie.
3. Télécharger l’artifact `ASTRA-PREVIEW-debug-Android17-stable-signature`, extraire le ZIP et installer l’APK.

Le dépôt est privé. L’APK Preview (`org.astra.publicapp.preview`) utilise une signature de test et n’est pas destiné à une distribution publique. Sauvegarder ses données avant toute désinstallation.

## Développement

Prérequis : Node.js **24.15 ou supérieur dans la série 24**, npm et un navigateur moderne.

```bash
git clone https://github.com/volcoce/ASTRA-P1-Android.git
cd ASTRA-P1-Android
npm install
npm run dev
```

Ouvrir [http://127.0.0.1:4173/](http://127.0.0.1:4173/). Le serveur construit les bundles JavaScript et CSS au démarrage. Relancer après une modification des sources du moteur.

### Commandes

| Commande | Fonction |
| --- | --- |
| `npm run dev` | Prévisualiser l’application. |
| `npm test` | Exécuter les tests Node.js. |
| `npm run check:css` | Contrôler et compiler les styles. |
| `npm run bundle` | Générer les bundles JavaScript et CSS. |
| `npm run test:ui` | Tester les parcours et composants dans le navigateur (Python, Playwright et Chromium requis). |

La CI exécute également les tests visuels et les contrôles Android. Pour compiler l’APK localement, utiliser JDK 17, Gradle 9.3.1 et le SDK Android 37 (build-tools 37.0.0), puis :

```bash
npm run bundle
base64 -d < ci/astra-preview-test-signing.p12.b64 > ci/astra-preview-test-signing.p12
gradle --no-daemon :app:assembleDebug :app:lintDebug :app:testDebugUnitTest
```

## Architecture

```text
astro/                  Moteur astronomique et interprétations
app/src/main/assets/    Interface web (HTML, CSS, JavaScript)
app/src/main/java/      Conteneur Android WebView
scripts/                Compilation et serveur local
tests/                  Tests et contrôles de régression
ci/                     Signature de test
.github/workflows/      Intégration continue et APK
```

L’interface utilise JavaScript natif, sans framework. Les sources CSS sont ordonnées dans `scripts/css-sources.mjs` et compilées dans une seule feuille `astra.bundle.css`. Les bundles générés ne sont pas versionnés.

## Documentation

- [Architecture UI](UI_ARCHITECTURE.md) — écrans, navigation et composants.
- [Design](DESIGN.md) — principes graphiques et ergonomiques.
- [Contribution](AGENTS.md) — règles techniques du projet.
- [Changelog](CHANGELOG.md) — historique des évolutions.

## Données et limites

Les profils, préférences, événements et journaux sont stockés localement (`astra-public-v1`). La recherche de villes utilise Open-Meteo Geocoding ; aucune synchronisation cloud n’est implémentée. Les exports JSON peuvent contenir des données personnelles.

Les calculs sidéraux et certains cas astronomiques ou de fuseaux historiques nécessitent encore une validation. Sans heure de naissance, les maisons et l’Ascendant ne sont pas calculés. Les interprétations astrologiques sont symboliques.

**Projet privé et expérimental**, sans licence open source déclarée. Avant toute publication, auditer l’historique Git, les conditions d’utilisation des services externes et la signature Android.
