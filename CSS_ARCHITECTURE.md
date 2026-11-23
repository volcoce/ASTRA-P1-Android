# ASTRA — Contrat CSS (architecture)

Le code de production utilise **une seule navigation globale**, sans exceptions CSS par route. Les différences d'apparence sont des variantes de composants ; le positionnement de l'AppShell et du menu principal n'en fait pas partie.

## Cascade CSS

Chaque feuille est placée dans une couche CSS native. L'ordre, déclaré une seule fois en tête de `style.css`, est le suivant.

```css
@layer legacy, tokens, components, features, layout;
```

- `legacy` contient les sept feuilles historiques, sans priorité sur les nouveaux composants. Les anciens blocs `:root` de couleurs de `style.css`, `atlas-ui.css` et `theme.css` ont été retirés.
- `tokens` contient **toutes les couleurs sémantiques**, les rôles du calendrier, des phases lunaires, des légendes et les variantes sombre / contraste renforcé.
- `components` contient les états et surfaces réutilisables.
- `features` contient la présentation des écrans, du calendrier et des roues sans modifier la géométrie commune.
- `layout` possède la colonne, les gouttières, l'AppShell et la navigation fixe.

Les couches ne sont **pas** des feuilles de surcharges supplémentaires. La priorité se détermine par cette hiérarchie, avant la spécificité du sélecteur. Attention : `!important` inverse la priorité des couches. Son emploi est limité à la dissimulation d'accessibilité, aux adaptations de mouvement réduit et aux éléments dont le focus est tronqué.

## Catégories standardisées

ASTRA a **un seul CSS livré dans l’APK** : `astra.bundle.css`, compilé à partir des 16 sources. Les sources sont réparties par responsabilité, jamais par route. Le système partagé de composants est `astra-components.css`, et non une feuille de correctifs ajoutée à la fin.

| Catégorie | Propriétaire | Convention |
| --- | --- | --- |
| Tokens et thèmes | `astra-tokens.css` | `--astra-*`, clair/sombre, espacement, rayons, états |
| Base et boutons | `astra-components.css` | Couleurs de texte, typographie, `.primary`, `.ghost`, focus |
| Formulaires | `astra-components.css` | Champs, validation, surfaces et états |
| Cartes et panneaux | `astra-components.css` | `.card` et `.astra-reading-card` |
| Disclosure (bloc dépliant) | `astra-components.css` | `<details class="astra-disclosure"><summary>…</summary><div class="astra-disclosure-body">…</div></details>` |
| Actions de disclosure | `astra-components.css` | `.astra-disclosure-actions` sur le corps |
| Grille et navigation | `astra-layout.css` | `.main`, `.app-shell`, `.bottom-nav` |
| Variantes métier | `astra-natal.css`, `astra-p4-calendar.css`, etc. | Seulement le contenu propre aux fonctionnalités |
| Legacy | `style.css`, `atlas-ui.css`, etc. | Compatibilité à supprimer progressivement, **pas de nouvelle géométrie commune** |

### Contrat obligatoire des disclosures

- Le titre est un enfant direct `summary` de `details.astra-disclosure`.
- Le contenu est **un unique enfant direct** `.astra-disclosure-body` contenant textes, cartes, formulaires, etc.
- L’en-tête et le corps ont chacun une gouttière horizontale définie par `--astra-component-inset` (16 px actuellement).
- La hauteur minimale, les marges internes verticales, le marqueur +/−, le focus et les couleurs relèvent du composant global.
- L’écran peut contrôler uniquement la mise en page **à l’intérieur** du corps (grille, typographie du contenu, etc.). Il ne peut pas réinitialiser le padding du conteneur ou du titre.
- Les cas nécessitant un comportement différent doivent introduire une variante **documentée dans le composant global**, pas un sélecteur plus spécifique dans un CSS local.

`tests/css-ownership.test.mjs` analyse **les 16 fichiers CSS avec PostCSS** et refuse les redéfinitions de padding ou min-height sur les titres/corps de disclosure hors du propriétaire global. Les tests Chromium contrôlent les valeurs calculées dans les pages de naissance, d’exploration, de réglages, de calendrier et d’événements, y compris sous plusieurs largeurs d’écran. Les garde-fous existants empêchent aussi le retour de géométries séparées pour la colonne, les cartes et la navigation.

## Répartition des responsabilités

- `astra-tokens.css` : couleurs, typographies et valeurs sémantiques, ainsi que `--astra-reading-width`, `--astra-card-gutter`, `--astra-nav-width` et `--astra-nav-clearance`.
- `astra-components.css` : présentation de base des cartes `.card` via `--astra-card-padding`, boutons, champs, états, divulgations et **états/icônes de BottomNavigation**. Ni position ni largeur de la barre elle-même.
- `astra-layout.css` : **unique propriétaire** de l'AppShell, du gabarit `.main>*`, des introductions, des cartes de lecture et de la barre principale fixe avec sa réserve d'espace.
- `astra-natal.css` : contenus métier natals (roue, aperçu, explorateur, listes, outils). Les surfaces/paddings des cartes restent à `astra-reading-card`. Aucun style de navigation principale ni sélection de page via `:has()`.
- `astra-p4-calendar.css` : propriétaire de la géométrie et de la présentation du calendrier (grille, cellules, options, légendes, états).
- `solar-ribbon.css` : propriétaire exclusif des couleurs et de la continuité du ruban solaire, sans padding du calendrier.
- `astra-p1-screens.css`, `astra-p2-navigation.css`, `astra-p3-accessibility.css`, `astra-p4-wheel.css` : modules historiques / fonctionnels, sans nouvelle feuille `hotfix` ou `override`.
- `style.css`, `atlas-ui.css`, `theme.css`, `wheel-ui.css`, `solar-ribbon.css`, `calendar-p0.css`, `personal-calendar.css` : anciens styles encore nécessaires au fonctionnement des contrôles existants. Les nouvelles règles ne doivent pas y introduire de divergences de layout.

## Règles de contribution

1. Ne pas ajouter de sélecteur de type `body:has(.natal-home) .bottom-nav` ni de correctif visuel ciblant une route.
2. Ne pas introduire de propriété `position`, `bottom`, `left`, `width`, `max-width` ou `transform` sur `.bottom-nav` en dehors du propriétaire global.
3. Les composants de lecture prennent la classe réutilisable `astra-reading-card` ; les `screen-intro` et les cartes utilisent la même colonne de lecture.
4. Les couleurs utilisent les tokens sémantiques dans les deux thèmes. Les quatre `--astra-zodiac-*` alimentent roue, ruban diurne et export SVG/PNG via résolution des tokens CSS ; `--solar-*-bg` gère la variante de ruban sombre. Ne pas recopier des valeurs hexadécimales dans les fonctionnalités.
5. Les exceptions liées à la **fonction**, et non à la route (mode focus plein écran, clavier Android, orientation paysage, contraste renforcé), sont admises et documentées.
6. Après une correction, tester les quatre onglets, le Journal, l'explorateur, les réglages, les fiches et la comparaison en clair/sombre à 320, 360, 393, 768, 799, 800 et 1280 px.
7. Une nouvelle correction d'espacement doit changer un token ou un composant source. **Pas de feuille ajoutée à la fin de la cascade comme rustine.**

## Matrice responsive commune

- Jusqu’à 360 px : mobile très compact (libellés et contrôles).
- Jusqu’à 400 px : mobile compact (rangées et colonnes réduites).
- Jusqu’à 480 px : mobile (empilement des formulaires et des fiches).
- 481 à 799 px : lecture fluide dans la même colonne, sans navigation parallèle.
- Dès 800 px : tablette et bureau (zones lunaires et calendrier élargis).
- Dès 1100 px : grand bureau (respiration de l’en-tête uniquement).
- 799 px est le complément exact de la règle min-width:800px.
- Exception fonctionnelle : les seuils de hauteur 500 px (paysage) et 650 px avec largeur 600 px (clavier/vue courte).

Ne pas réintroduire de breakpoints locaux à 350, 370, 375, 380, 390, 420 ou 700 px. Toute nouvelle borne doit être justifiée et couverte par un test.

## Point de migration

Cette itération retire les deux feuilles P5/P6, retire les exceptions de navigation fixes/statiques et définit l'interface natale dans un module métier. Les anciennes couches générales n'ont pas encore été entièrement réécrites ; elles constituent une dette technique documentée, pas une autorisation de multiplier les overrides.
