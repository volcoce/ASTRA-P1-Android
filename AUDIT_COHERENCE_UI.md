# ASTRA — Registre des incohérences d’implémentation UI

Date de l'audit : 22 novembre 2026.
Portée : code de la branche principale du dépôt `volcoce/ASTRA-P1-Android`.
Méthode : inspection statique des sources CSS/JS, de l'architecture UI et de la couverture de tests. Les défauts visibles précédemment sur captures sont rapprochés du code. Ce registre **ne constitue pas un test exhaustif sur appareil réel**.

## Classification

- **Confirmé** : comportement ou conflit établi par le code.
- **Risque vérifiable** : architecture propice à l'incohérence, effet précis à tester avant de le qualifier de bogue.
- **Choix à clarifier** : deux comportements possibles, l'intention UX n'est pas documentée ou pas évidente.

## P0 — Défauts et divergences prioritaires

| ID | Statut | Constat / impact | Origine | Critère de résolution |
| --- | --- | --- | --- | --- |
| UI-01 | **Confirmé** | La navigation principale est `fixed` en général, mais devient `static` à partir de **800 px uniquement sur les vues contenant `.natal-home` ou `.natal-explore`**. Ce jour, Ce mois, Calendrier et plusieurs autres sous-pages ne suivent donc pas la même règle. | `astra-p5-explore-responsive.css` (~239–251) ; `astra-p6-home-spacing.css` (~125–136) ; `style.css` (`.bottom-nav`) | Une seule règle de positionnement de la navigation, définie au niveau d’AppShell et testée sur toutes les pages. |
| UI-02 | **Confirmé (incohérence de structure)** | Les espacements de pied de page et les décalages des panneaux ont des règles contradictoires. La fiche natale conserve un décalage basé sur la hauteur d'une navigation fixe, tandis que celle-ci peut devenir statique sur PC. | `astra-p3-accessibility.css` (~255–270) ; `astra-p5-explore-responsive.css` ; `astra-p6-home-spacing.css` ; `atlas-ui.css` (padding de l’AppShell) | Un unique contrat `navigation/overlay/safe-area`; aucun panneau ne recouvre les contrôles, ni ne laisse un espace mort excessif. |
| UI-03 | **Confirmé (dette de cascade)** | La carte `.natal-home.card` a été rendue transparente, sans bordure et sans padding dans `atlas-ui.css`, puis restaurée par une feuille P6 dédiée. Une modification d'ordre des feuilles ou de spécificité peut réintroduire le défaut. | `atlas-ui.css` (~68), `astra-p1-screens.css` (~226), `astra-p6-home-spacing.css` (~15–31) | Une définition canonique du composant `NatalHomeCard` et des variantes explicites, sans corrections tardives contradictoires. |
| UI-04 | **Risque fonctionnel important** | Le sélecteur `Options d’affichage` n'a aucun état `open` conservé. Modifier le filtre ou le zodiaque appelle `render()`, qui reconstruit `#app` via `innerHTML` : le panneau se referme alors. Vérifier le geste réel dans Chromium. | `app.js` (~1046, 1925, 2253, 2396) | Les options restent ouvertes après une interaction de filtre, ou le changement se fait dans une interaction qui ne détruit pas l'accordéon. |
| UI-05 | **Choix à clarifier** | **Deux modes zodiacaux indépendants**, `state.mode` pour Ce jour/Ce mois/Calendrier et `state.natalZodiac` pour Mon ciel, sont enregistrés séparément. Passer une vue en sidéral ne change pas l'autre. C'est fonctionnellement distinct mais peut induire une impression d'incohérence si l'utilisateur croit définir un mode global. | `app.js` (~14, 411, 1535, 1887, 1990, 2170, 2253) | Soit un mode unique global ; soit deux réglages explicitement nommés `Zodiaque du ciel actuel` / `Zodiaque natal`, visibles et compréhensibles dans les deux contextes. |

## P1 — Incohérences transversales de design et de composants

| ID | Statut | Constat / impact | Origine | Critère de résolution |
| --- | --- | --- | --- | --- |
| UI-06 | **Confirmé** | Le mode sombre dépend de correctifs locaux successifs (liste d'événements, fiche natale, calendrier, panneau du jour) en plus de `theme.css`. Les mêmes types de texte/surfaces ne sont pas tous gouvernés par un composant commun. | `theme.css`, `astra-p3-accessibility.css` (~160–255), `astra-p4-calendar.css`, `astra-p5-explore-responsive.css` | Couleurs de surfaces et de textes via tokens sémantiques globaux ; contraste contrôlé sur chaque composant et chaque page. |
| UI-07 | **Confirmé** | Les styles s'accumulent dans **16 feuilles CSS** (environ 4 200 lignes). Inspection textuelle : `.bottom-nav` apparaît 56 fois dans 8 fichiers ; `.natal-position` 54 fois dans 4 ; `.natal-context-sheet` 32 fois dans 6. Ce sont des occurrences textuelles, **pas** un compte de règles contradictoires, mais la dispersion rend les régressions probables. | `index.html` (~11–27) + feuilles chargées | Regrouper progressivement par tokens, shell, navigation, formulaires, événements, thème natal ; supprimer les anciennes déclarations après comparaison visuelle. |
| UI-08 | **Confirmé** | Des `max-width` différents sont codés en dur selon l'écran et la feuille (650 / 680 / 720 / 750 / 760 / 840 / 1 000 px). Certains écarts sont légitimes, mais sans contrat documenté de largeur de page / contenu / panneau. | `atlas-ui.css` (~744–757), `astra-p1-screens.css` (~230–265), `astra-p5-explore-responsive.css`, `astra-p6-home-spacing.css` | Définir `--page-max`, `--reading-max`, `--page-gutter`, `--card-padding`; appliquer aux introductions, cartes et CTA. |
| UI-09 | **Confirmé** | `ScreenIntro` est généré par un helper commun, mais une règle `:has(>.natal-home)` spécifique réajuste l'introduction uniquement sur la vue natale. Les autres sous-vues ne bénéficient pas du même système. | `app.js` (~410, 1878–1905) et `astra-p6-home-spacing.css` (~10–37) | Un gabarit de page commun ; variante uniquement si justifiée. |
| UI-10 | **Confirmé** | Les mêmes familles de contenus (planètes, aspects, maisons) utilisent des styles distincts entre l'aperçu `natal-home` et l'explorateur `natal-explore`, avec sélecteurs en doublon. Les informations sont liées mais le traitement des bordures, lignes, tailles et états n'a pas un seul propriétaire. | `style.css`, `atlas-ui.css`, `astra-p5-explore-responsive.css` (~78–170, 224–237) | Composant `PlanetRow/AspectRow` unique avec variantes `compact`/`détaillé`, testé dans les deux vues. |
| UI-11 | **Confirmé (structure) / risque (état)** | Les accordéons sont implémentés au moyen de nombreuses classes et règles visuelles indépendantes : `calendar-help`, `calendar-options`, `astra-event-disclosure`, `natal-glossary`, `natal-extras`, `natal-more-options`, `natal-matrix-disclosure`… Certains `open` sont mémorisés, d'autres non. | `app.js` (~576, 664, 682, 788–791, 1046, 1685–1715, 1815–1836) ; feuilles CSS des sous-vues | Un `Disclosure` cohérent, avec règles d'ouverture et de re-rendu explicitement définies. |
| UI-12 | **Confirmé** | L'information détaillée est rendue via au moins trois formats distincts : événement du jour (`astra-event-detail`), lecture natale (`natal-context-sheet`) et roue immersive (`natal-focus`). Les fonds, la taille, la fermeture, les marges de navigation et la progression de lecture sont traités séparément. | `app.js` (~635–690, 1570–1700) ; `astra-p2-navigation.css`, `astra-p3-accessibility.css` | Contrat commun `ContextSheet/Dialog` (fond, hauteurs, focus, fermeture, gestion clavier, safe areas), contenu spécifique à chaque type de lecture. |
| UI-13 | **Risque vérifiable** | La multiplication des points de rupture et des sélecteurs `:has()` produit des comportements différents au voisinage de 700, 800 et 1 100 px, ainsi que sur les petits écrans (350–390 px). Vérifier les transitions à 799/800 et 1 099/1 100 px. | `atlas-ui.css`, `style.css`, `astra-p5-explore-responsive.css`, `astra-p6-home-spacing.css` | Matrice de breakpoints partagée, sans changement de fonction au passage d'une page à l'autre à largeur identique. |
| UI-14 | **Confirmé (dette de styles)** | Plusieurs composants conservent des couleurs claires codées en dur dans les feuilles historiques, puis dépendent d'overrides sombres. Le thème clair est souvent la valeur par défaut tandis que le sombre est correctif ; risque de texte clair sur fond clair lors de nouvelles vues. | `style.css` (nombreux `background:#fff`) ; `atlas-ui.css` ; `theme.css` | Chaque composant prend `--astra-surface`, `--astra-ink`, `--astra-muted`, `--astra-divider`; réserver les couleurs fixes à la roue elle-même lorsqu'elles sont voulues. |

## P2 — Qualité de validation et documentation

| ID | Statut | Constat / impact | Critère de résolution |
| --- | --- | --- | --- |
| UI-15 | **Confirmé** | Les tests Chromium couvrent de nombreuses largeurs pour `Mon ciel`, quelques largeurs pour l'exploration, mais n'exercent pas **toutes les pages et sous-pages dans tous les thèmes et breakpoints**. Les captures et assertions restent ciblées par défaut. | Matrice automatisée Ce jour / Ce mois / Calendrier / Mon ciel + sous-vues / Journal × 320, 360, 393, 768, 799, 800, 1024, 1280 × clair/sombre, avec test de débordement, contraste, focus, navigation et clavier. |
| UI-16 | **Confirmé (documentation partielle)** | `UI_ARCHITECTURE.md` prévoit une navigation principale toujours accessible et une barre basse jusqu'à 1 023 px, mais les CSS P5/P6 basculent la navigation de certaines vues à 800 px. L'architecture cible et le code divergent. | Documenter une décision unique pour la navigation et la faire respecter par les tests. |

## Ce qui n'est **pas** automatiquement un défaut

- Les panneaux `Ce jour`, `Ce mois` et `Calendrier` ont des rôles différents : montrer une même donnée astronomique avec un niveau de détail propre n'est pas une duplication indésirable.
- L'utilisation de la même fonction de calcul dans deux écrans est **bonne** ; la duplication de règles CSS ou d'état de navigation est le problème ici.
- Un filtre réservé au Calendrier est légitime si son périmètre est clair. L'écran `Ce jour` utilise les événements bruts plutôt que les filtres du Calendrier (`app.js` ~694–705).

## Ordre de remédiation proposé

1. **Unifier la navigation et le modèle de safe-area** (UI-01, UI-02, UI-16).
2. **Stabiliser le shell, les largeurs, les bordures et les marges** (UI-03, UI-08, UI-09, UI-13).
3. **Centraliser tokens et composants partagés**, réduire les overrides et corriger sombre/clair (UI-06, UI-07, UI-10, UI-12, UI-14).
4. **Normaliser les accordéons et le maintien de l'état** (UI-04, UI-11).
5. **Clarifier les deux réglages zodiacaux** (UI-05).
6. **Renforcer la matrice de tests multi-pages** (UI-15).

> Aucun comportement applicatif n'est modifié par cet audit. Chaque point exige une correction ciblée et une vérification sur web / Android avant d'être marqué résolu.
