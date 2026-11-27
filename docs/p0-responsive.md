# P0.1 — Responsive 320–1920 CSS px

29 tailles × 11 états × 2 thèmes = 638 configurations. Le script utilise le bundle CSS de production, app.js et les données astronomiques synthétiques existantes. Il contrôle les seuils CSS adjacents, le paysage compact, les grands écrans, zéro débordement global, l'ancrage de la navigation, les limites des panneaux, la roue, les cibles principales et les erreurs JavaScript. Les tableaux volontairement défilants ne sont pas assimilés à un débordement de page. La CI publie les captures et le rapport même en cas d'échec. La matrice est un échantillonnage de tailles, pas une certification de chaque pixel intermédiaire ni de chaque moteur natif. P4 conserve son audit axe et la validation physique Android reste séparée.

Exécution : npm ci, npm run bundle, installation Playwright épinglée puis python tests/ui-responsive.py.
