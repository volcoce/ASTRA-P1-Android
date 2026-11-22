# ASTRA — Contrat CSS (architecture)

Le code de production utilise **une seule navigation globale**, sans exceptions CSS par route. Les différences d'apparence sont des variantes de composants ; le positionnement de l'AppShell et du menu principal n'en fait pas partie.

## Répartition des responsabilités

- `astra-tokens.css` : couleurs, typographies et valeurs sémantiques, ainsi que `--astra-reading-width`, `--astra-card-gutter`, `--astra-nav-width` et `--astra-nav-clearance`.
- `astra-components.css` : boutons, cartes, champs, états et composants de divulgation réutilisables.
- `astra-layout.css` : **unique propriétaire** de la largeur de l'AppShell, des introductions de page, des cartes de lecture, de la barre de navigation principale fixe et de la réserve d'espace pour celle-ci.
- `astra-natal.css` : composants du thème natal (roue, aperçu, explorateur, listes, champs et outils). Aucun style de navigation principale ni sélection de page via `:has()`.
- `astra-p1-screens.css`, `astra-p2-navigation.css`, `astra-p3-accessibility.css`, `astra-p4-calendar.css`, `astra-p4-wheel.css` : autres éléments historiques à migrer progressivement, sans créer de nouvelle feuille `p7`, `hotfix` ou `override`.
- `style.css`, `atlas-ui.css`, `theme.css`, `wheel-ui.css`, `solar-ribbon.css`, `calendar-p0.css`, `personal-calendar.css` : anciens styles encore nécessaires au fonctionnement des contrôles existants. Les nouvelles règles ne doivent pas y introduire de divergences de layout.

## Règles de contribution

1. Ne pas ajouter de sélecteur de type `body:has(.natal-home) .bottom-nav` ni de correctif visuel ciblant une route.
2. Ne pas introduire de propriété `position`, `bottom`, `left`, `width`, `max-width` ou `transform` sur `.bottom-nav` en dehors du propriétaire global.
3. Les composants de lecture prennent la classe réutilisable `astra-reading-card` ; les `screen-intro` et les cartes utilisent la même colonne de lecture.
4. Les couleurs doivent utiliser les tokens sémantiques dans les deux thèmes. Les teintes propres aux schémas astronomiques restent dans les composants de roue.
5. Les exceptions liées à la **fonction**, et non à la route (mode focus plein écran, clavier Android, orientation paysage, contraste renforcé), sont admises et documentées.
6. Après une correction, tester les quatre onglets, le Journal, l'explorateur, les réglages, les fiches et la comparaison en clair/sombre à 320, 360, 393, 768, 799, 800 et 1280 px.
7. Une nouvelle correction d'espacement doit changer un token ou un composant source. **Pas de feuille ajoutée à la fin de la cascade comme rustine.**

## Point de migration

Cette itération retire les deux feuilles P5/P6, retire les exceptions de navigation fixes/statiques et définit l'interface natale dans un module métier. Les anciennes couches générales n'ont pas encore été entièrement réécrites ; elles constituent une dette technique documentée, pas une autorisation de multiplier les overrides.
