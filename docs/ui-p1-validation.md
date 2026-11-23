# Contrôles P1 du référentiel UI

- `npm run lint:css` vérifie Stylelint, les propriétaires des composants et le budget historique CSS par fichier.
- `npm test` vérifie les contrats fonctionnels et CSS.
- `npm run bundle`, puis `npm run test:ui` (Python Playwright + Pillow, Chromium installé) lancent les tests de parcours existants et l'audit P1.
- L'audit P1 couvre 4 routes, 6 largeurs, 2 thèmes, la géométrie des cibles, le contraste des libellés solaires et axe-core. Les violations sérieuses/critiques bloquent la CI ; les autres restent dans le rapport. Les captures sont des preuves de rendu à inspecter, pas des références pixel-par-pixel.
- Le fichier `tests/css-debt-baseline.json` est un plafond historique, non une autorisation d'ajouter de nouvelles couleurs. Réduire les compteurs après migration ; ne jamais augmenter le plafond pour masquer un échec. Le scanner lexical couvre les hexadécimaux et rgb/hsl et les !important ; il ne remplace pas les contrôles AST et visuels.
- La CI se déclenche désormais aussi sur les PR. Le lockfile npm manque encore : générer et vérifier un lockfile depuis un registre accessible avant de rendre npm ci obligatoire. Aucun APK n'est validé avant résultat CI vert et vérification sur Galaxy A15.
