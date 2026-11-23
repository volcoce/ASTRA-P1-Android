# ASTRA — Qualité visuelle, contrastes et compilation CSS

## Génération et contrôle CSS

La liste canonique des 16 sources se trouve dans `scripts/css-sources.mjs`. La compilation utilise esbuild et produit `app/src/main/assets/astra.bundle.css` : **seul ce fichier est référencé dans `index.html` et chargé par Android**. Les sources restent indépendantes et appartiennent aux couches `legacy → tokens → components → features → layout`.

- `npm install` — installe les outils.
- `npm run lint:css` — Stylelint sur les feuilles sources (les CSS générés sont exclus).
- `npm run build:css` — contrôle le manifeste, compile/minifie et vérifie la présence des composants critiques.
- `npm run bundle` — compile le moteur JavaScript **et** le CSS de production.
- `npm test` — teste aussi les propriétaires CSS, les tokens, le budget `!important` et l'ordre des couches.

Ajouter une feuille exige son inscription **dans le manifeste** ainsi qu'un propriétaire clair ; la compilation échoue si des sources sont absentes ou non déclarées. Il n'y a pas de deuxième liste à maintenir dans le HTML.

## Tests visuels

`tests/ui-smoke.py` utilise Chromium, les routes fonctionnelles et un moteur astronomique simulé. Il charge **le CSS compilé** et enregistre les vues aux tailles 320, 393, 360/1280 selon les scénarios, y compris le sombre, les fiches natales et le calendrier. Les captures sont conservées en artefact CI.

`tests/visual-regression.py` examine des **pixels de ces PNG**, l'absence d'écran vide, la largeur exacte et les régions de couleur attendues pour Ce jour, Ce mois, Calendrier, Journal et Mon ciel, en clair/sombre. Il génère `tests/artifacts/visual-report.json` qui est publié séparément. Les seuils sont volontairement tolérants aux petits changements de police ou d'anticrénelage.

Les tests ne sont **pas des comparaisons intégrales à des images de référence approuvées**. La validation esthétique finale reste humaine ; modifier la palette autorisée nécessite d'actualiser les tokens, les références du test et de relire les captures.

## Contrastes WCAG

Le navigateur mesure les couleurs *calculées* pour cinq éléments de lecture/interaction, dans les deux thèmes, au seuil **4,5:1** du texte normal. Le contrôle complémentaire du flux d'événements vérifie aussi les textes et les icônes en sombre. Les couples de couleurs du calendrier et des éléments zodiacaux restent testés par `tests/design-p3.test.mjs`.

## Pipeline CI

`npm install → npm run bundle → npm run lint:css → npm test → Chromium → tests visuels (Pillow) → Android lint/assemble → artefacts`.

Le projet ne vérifie pas les performances sur téléphone réel, le rendu TalkBack ni la parité de toutes les WebView Android. Ces points restent des contrôles de livraison physique.

### Régression des blocs dépliants

Les fiches d'événements réutilisent les paddings du composant commun (16 px pour les en-têtes et le contenu). Aucun padding nul ne doit être réintroduit dans une variante métier. Chromium vérifie l'espacement réellement calculé à 320, 393 et 1280 px, l'absence de débordement et produit des captures des blocs ouverts à 320 et 1280 px.
