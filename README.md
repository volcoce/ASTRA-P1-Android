# ASTRA

**Atlas céleste personnel** — application d’astrologie pour navigateur et Android (WebView), avec calculs astronomiques locaux, thème natal, transits, calendrier et journal.

**État du projet :** `0.8.17-preview` · développement expérimental · interface en français · dépôt privé.

[![Android CI](https://github.com/volcoce/ASTRA-P1-Android/actions/workflows/android.yml/badge.svg)](https://github.com/volcoce/ASTRA-P1-Android/actions/workflows/android.yml)

> La lecture astrologique est symbolique et ne constitue pas une méthode scientifiquement démontrée de prédiction d'événements ou d'humeurs.

## Fonctionnalités

| Espace | Utilisation |
| --- | --- |
| **Ce jour** | Ciel à la date sélectionnée, Lune et phase à midi local, changements lunaires horodatés, événements et accès au journal. |
| **Ce mois** | Synthèse mensuelle, phases et événements du mois. |
| **Calendrier** | Grille mensuelle, nouvelles et pleines lunes, rubans continus sur plusieurs jours colorés selon l'élément (Feu, Terre, Air, Eau), partagés 50/50 aux dates de transition, événements personnels sur plusieurs jours et consultation d'une date. |
| **Mon ciel** | Thème natal, roue interactive, positions et aspects, exploration, transits en double roue, systèmes de maisons et export d'images. |

En complément : modes **tropical** et **sidéral** (Lahiri approximatif), fiches pédagogiques, journal local, import/export JSON, thèmes visuels et adaptation aux petits écrans.

**À noter :** le jour d'un changement de signe solaire, le calendrier partage la bande en deux moitiés pour la lisibilité ; cela ne signifie pas que le Soleil a passé douze heures dans chaque signe. La fonction distincte « Aspect solaire exact » a été retirée ; les autres événements astronomiques et les aspects disponibles restent accessibles.

## Essayer sur ordinateur

**Prérequis :** Node.js 22+, npm et un navigateur moderne.

```bash
git clone https://github.com/volcoce/ASTRA-P1-Android.git
cd ASTRA-P1-Android
npm install
npm run dev
```

Ouvrir **http://127.0.0.1:4173/**. Le serveur de développement reconstruit d'abord le moteur astronomique. Après modification de `astro/*.mjs`, le relancer pour générer un nouveau bundle.

Le dépôt est privé : le clonage nécessite d'y avoir accès. Les données locales du navigateur ne se synchronisent pas automatiquement avec celles de l'application Android.

## Tester le projet

```bash
npm test
npm run test:desktop
node --check app/src/main/assets/app.js
npm run bundle
```

Les tests d'interface sous Chromium sont exécutés dans le pipeline CI avec `python tests/ui-smoke.py` et Playwright. Les tests automatisés ne remplacent pas la vérification de l'APK sur un appareil physique.

## APK Android Preview

Dans l'onglet [Actions → Android CI](https://github.com/volcoce/ASTRA-P1-Android/actions/workflows/android.yml), ouvrir une exécution réussie et récupérer l'artifact **ASTRA-PREVIEW-debug-Android17-stable-signature**. Une connexion GitHub autorisée à consulter ce dépôt privé peut être nécessaire.

Pour compiler localement, préparer **JDK 17**, **Gradle 9.3.1**, le SDK Android requis par `app/build.gradle.kts` (API 37 et build-tools 37.0.0), puis construire le bundle JavaScript avant Gradle :

```bash
npm install
npm run bundle
gradle --no-daemon :app:assembleDebug :app:lintDebug
```

La build de débogage utilise une **signature de test connue**, réservée à ASTRA Preview. Elle ne convient pas à une distribution publique. Le paquet Android Preview est `org.astra.publicapp.preview`, distinct de `org.astra.publicapp`. Sauvegarder puis contrôler l'import des données avant toute désinstallation d'une ancienne version.

## Données et confidentialité

- Profil, journal, événements personnels et préférences sont enregistrés **localement**, sous la clé `astra-public-v1`.
- Les calculs du ciel et du thème s'effectuent sur l'appareil avec `astronomy-engine`.
- La recherche volontaire d'une ville utilise **Open-Meteo Geocoding** et nécessite une connexion. La requête porte sur la ville, pas sur la date de naissance ou les notes du journal.
- Aucune connexion à Google Agenda, aucun compte utilisateur et aucune synchronisation cloud des événements personnels ne sont actuellement implémentés.
- Un export JSON peut contenir des informations personnelles : le conserver de manière sécurisée.
- **Ne pas rendre ce dépôt public sans audit complet de son historique Git**, qui a pu contenir d'anciennes données personnelles. Une publication nécessiterait un historique nettoyé et une signature de production distincte.

## Architecture

```text
astro/                     Moteur astronomique, natal, lieux et interprétations
app/src/main/assets/       Interface HTML, CSS, JavaScript et bundle généré
app/src/main/java/         Conteneur Android WebView
tests/                     Tests de calcul, régression et interface
scripts/dev-server.mjs     Prévisualisation locale
.github/workflows/         Tests, compilation et artifact APK
```

Le moteur généré `runtime.bundle.js` est ignoré par Git et reconstruit avec `npm run bundle`. Le projet n'emploie pas de framework d'interface.

## Limites connues

- Le mode sidéral Lahiri est approximatif ; les conversions de fuseaux historiques et certains cas astronomiques nécessitent une validation supplémentaire.
- En l'absence d'heure de naissance, l'Ascendant et les maisons ne sont pas inventés et certains contacts natals ne peuvent pas être datés précisément.
- Les aspects actifs sont des instantanés et non des périodes d'orbe complètes ; l'échantillonnage peut manquer certains contacts.
- Les performances et l'accessibilité Android doivent être contrôlées sur des appareils réels.
- Les conditions d'utilisation d'Open-Meteo Geocoding sont à vérifier avant tout usage commercial.

## Documentation

- [Architecture de l'interface](UI_ARCHITECTURE.md) — écrans, navigation, composants et accessibilité.
- [Direction artistique](DESIGN.md) — principes visuels et critères de qualité.
- [Instructions de contribution au code](AGENTS.md) — règles techniques pour les assistants et contributeurs.
- [Historique des versions](CHANGELOG.md) — évolution du projet, sans confondre anciens comportements et fonctions actuelles.

## Statut

Projet expérimental, sans version Android de production annoncée. Les builds CI et les APK Preview servent au développement et aux essais. Aucune licence open source n'est déclarée dans ce dépôt.
