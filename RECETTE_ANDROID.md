# ASTRA P0 — Recette Android, à effectuer sur appareil / émulateur

Date : 19 novembre 2026. **Aucun test sur appareil n'a été exécuté dans l'environnement de création.**

| ID | Essai Android 17 / API 37 | Attendu | État |
|---|---|---|---|
| A01 | Compiler `assembleDebug` avec Android SDK 37 | APK généré | NON EXÉCUTÉ |
| A02 | Vérifier manifeste (permissions, version API) via `apkanalyzer` | Aucune permission Internet, target 37 | NON EXÉCUTÉ |
| A03 | Installer sur Android 17 et lancer | Aucun crash | NON EXÉCUTÉ |
| A04 | Utiliser le calendrier en mode avion | Jan 2026–déc 2028 consultable | NON EXÉCUTÉ |
| A05 | Basculer tropical / sidéral | Événements distincts | NON EXÉCUTÉ |
| A06 | Renseigner une note puis fermer / relancer | Note conservée | NON EXÉCUTÉ |
| A07 | Copier sauvegarde, restaurer dans nouvelle installation | Notes préservées | NON EXÉCUTÉ |
| A08 | Vérifier absence de navigation Internet | Aucun accès autorisé | NON EXÉCUTÉ |
| A09 | Tester barre de navigation / découpe d'écran | Aucun bouton sous les barres système | NON EXÉCUTÉ |
| A10 | Installer 2 builds signés avec la même clé release | Mise à jour sans perte de notes | NON EXÉCUTÉ |
| A11 | Tester petite/grande police + TalkBack | UI lisible et utilisable | NON EXÉCUTÉ |
| A12 | Vérifier signature `apksigner verify --verbose` | v2 et v3 valides | NON EXÉCUTÉ |
| A13 | Tester côte à côte avec l'ancien APK | Ancien journal intact | NON EXÉCUTÉ |
| A14 | Restaurer une sauvegarde ancienne `astra-offline-v1` | Notes réimportées | NON EXÉCUTÉ |

La recette n'est VALIDÉE que lorsque les étapes A01–A14 sont réellement passées et documentées.
