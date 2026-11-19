# ASTRA Public — P2.1 (0.5.1-city-alpha)

Application Android/WebView de suivi astrologique pour **tous les utilisateurs**. Les calculs astronomiques sont réalisés **à la demande** avec `astronomy-engine` dans le JavaScript local. Aucun profil natal ni aucune table personnelle pré-calculée n’est livrée dans l'APK. Aucun compte n’est obligatoire. La permission INTERNET sert **uniquement à la recherche volontaire de ville** ; les calculs de transits restent locaux et hors ligne.

## Installation Android — correctif P2.1 Preview (0.5.2)

Les APK debug 0.4, 0.5.0 et 0.5.1 ont été signés sur des runners GitHub différents, d'où des certificats distincts. Android refuse leur installation en mise à jour les uns des autres.

Pour préserver les journaux existants, **la version debug est désormais une application séparée** avec l'identifiant `org.astra.publicapp.preview` et le libellé **ASTRA Preview**. L'ancienne application `org.astra.publicapp` reste installée et ses données ne sont pas touchées. C'est un nouveau produit Android, et non une mise à jour in-place.

Les futurs APK Preview partagent une **clé de test fixe** enregistrée en base64 dans `ci/astra-preview-test-signing.p12.b64`. Cette clé est volontairement non secrète, réservée à des essais et ne doit **jamais** être utilisée pour une publication sur Google Play ni pour signer une application officielle. Une version stable publique devra avoir son propre identifiant et une clé privée sécurisée (secrets CI ou service de signature).

Pour migrer des données, exporter le journal depuis l'ancienne application, vérifier que le fichier JSON existe et contient bien les notes, puis l'importer dans ASTRA Preview. L'import/export Android n'ayant pas encore été testé sur tous les téléphones, ne pas désinstaller l'ancienne application tant que le transfert n'est pas vérifié.

## Installation ASTRA Preview (0.5.2)

Les APK de test précédents utilisaient des clés de signature aléatoires. Leurs certificats ne correspondent pas : Android refuse une mise à jour directe. Cette version est donc installée **à côté** de l'ancienne application, avec un identifiant distinct `org.astra.publicapp.preview` et le nom **ASTRA Preview**. Ne désinstallez pas l'ancienne application avant d'avoir sauvegardé les notes et vérifié leur import dans la Preview.

Les builds Preview utilisent maintenant une clé de test stable stockée dans `ci/astra-preview-test-signing.p12.b64`. Elle est non secrète, uniquement destinée au développement. Ne jamais utiliser cette signature pour une version officielle destinée au public ; un keystore sécurisé et un identifiant de distribution seront nécessaires. Le dépôt doit rester privé en raison de son historique contenant d'anciennes données natales.

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