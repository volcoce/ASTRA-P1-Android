# ASTRA Public — P2 (0.5.0 alpha)

Application Android/WebView de suivi astrologique pour **tous les utilisateurs**. Les calculs astronomiques sont réalisés **à la demande** avec `astronomy-engine` dans le JavaScript local. Aucun profil natal ni aucune table personnelle pré-calculée n’est livrée dans l'APK. Aucun compte ni permission INTERNET.

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
- `astro/core.mjs` : conversions d'heures et conventions zodiacales.
- `astro/interpretations.mjs` : descriptions éditoriales indépendantes du moteur astronomique et des profils.
- `app/src/main/assets/app.js` : interface, journal local et sauvegardes.
- `tests/interpretations.test.mjs` : couverture des combinaisons planète/aspect, lunaisons et stations.

## Limites connues

1. Sidéral Lahiri dérivé d'une approximation, **non suffisamment validé** pour une diffusion commerciale.
2. Ascendant et maisons absents ; fenêtres d'orbe complètes et passages rétrogrades multiples non encore calculés.
3. Les aspects actifs sont des relevés à midi local, pas des intervalles continus. Certains contacts rapides ou tangents peuvent échapper à un échantillonnage de 6 h.
4. Le calcul mensuel se déroule toujours sur le thread principal de la WebView ; il faudra un Web Worker pour assurer la fluidité sur tous les téléphones.
5. Le stockage journal est local et non chiffré de bout en bout. Import/export doivent être testés sur de vrais téléphones.
6. Le dépôt GitHub historique contient d'anciennes données personnelles. **Ne jamais rendre ce dépôt public** : utiliser un dépôt neuf avec un historique nettoyé pour la diffusion.

La lecture astrologique est une pratique interprétative : elle n’établit pas de lien causal démontré avec l’humeur ou les événements du journal.
