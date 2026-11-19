# ASTRA — version publique, calcul dynamique (alpha)

## Décisions de produit

- Application ouverte à tous les profils. **Aucune date de naissance, aucun thème natal ni aucune éphéméride personnelle pré-calculée dans le code.**
- Entrée par date, heure, fuseau IANA, latitude, longitude. Conversions des changements d'heure et choix de l'occurrence ambiguë.
- Calcul astronomique **à la demande sur le téléphone**, sans serveur ni accès Internet pendant l'utilisation.
- Thème géocentrique natal, transits quotidiens, contacts exacts interpolés à la minute, stations planétaires approximées puis affinées, lunaisons calculées par l'algorithme Astronomy Engine.
- Tropical et sidéral : Lahiri est une approximation polynomiale identifiée (pas encore validée pour la diffusion commerciale).
- Calendrier, filtres et journal local. Les interprétations sont présentées comme symboliques, pas comme des prédictions scientifiques.

## Propriété intellectuelle

Astronomy Engine v2.1.19 est sous licence MIT (https://github.com/cosinekitty/astronomy). Le paquet est installé pendant la compilation et empaqueté dans la WebView. Avant distribution, intégrer les avis de copyright de dépendance dans les ressources de l'APK. **Ne pas intégrer Swiss Ephemeris sans traitement de sa licence AGPL/professionnelle.**

## Développement

```sh
npm install
npm run bundle
npm test
node --check app/src/main/assets/app.js
```

Pour ouvrir sur ordinateur, servir `app/src/main/assets/` depuis un serveur local HTTP après le bundle.

Android SDK 37.0 et JDK 17 requis :

```sh
gradle --no-daemon :app:assembleDebug :app:lintDebug
```

Le workflow GitHub Actions construit un APK **debug expérimental**, non une version Google Play.

## Confidentialité / sécurité

Pas de compte ni de permission INTERNET, aucune géolocalisation automatique, stockage local WebView. L'utilisateur exporte ses données pour les sauvegarder, mais les flux d'import/export Android doivent encore être validés sur appareil. Aucun préchargement personnel. L'ancien dépôt P1 est **privé** et son historique contient les anciennes données personnelles : **ne jamais le rendre public**. Avant publication, créer un dépôt neuf depuis cet arbre nettoyé, sans reprendre l'historique Git.

## Limites MVP

- Sidéral Lahiri via interpolation analytique ~1900–2100, à remplacer/valider contre une éphéméride indépendante.
- Les maisons et l'ascendant ne sont pas calculés par cette version ; les coordonnées sont collectées pour une implémentation future.
- Pour les passages très rapides et les stations, l'échantillonnage (6h) ne garantit pas tous les contacts tangents. Un moteur de recherche d'intervalles certifié sera nécessaire.
- Calcul mensuel synchrone pouvant bloquer temporairement l'interface sur téléphones modestes. Déporter dans Web Worker avant déploiement public.
- Journal non synchronisé, stockage WebView local non chiffré de bout en bout, pas de comptes multi-appareils.
- Validation des heures de naissance historiques et appareils réels encore requise.
- Le mode debug utilise une clé de signature non pérenne ; une signature de diffusion durable doit être configurée.
