# ASTRA P1 — Résultats de validation

## Génération des éphémérides

| Contrôle | Résultat |
|---|---:|
| Fenêtres tropicales | 4 213 |
| Fenêtres sidérales | 4 214 |
| Total fenêtres | 8 427 |
| Contacts exacts tropicaux | 4 208 |
| Contacts exacts sidéraux | 4 205 |
| Contacts exacts non rattachés | **0** |
| Phases lunaires principales | 149 |
| Stations planétaires | 52 |
| Groupes multi-fenêtres rétrogrades (trop./sid.) | 57 / 56 |
| Jours par zodiaque | 1 096 |
| Période | 2026–2028 |

### Vérification externe des deux lunaisons de novembre 2026

- Nouvelle Lune : ASTRA **9 nov. 2026 07:02:07 UTC** ; US Naval Observatory **07:02 UTC**.
- Pleine Lune : ASTRA **24 nov. 2026 14:53:36 UTC** ; US Naval Observatory **14:53 UTC**.

Référence : https://aa.usno.navy.mil/calculated/moon/phases?date=2026-08-12&format=p&nump=50&submit=Get+Data

L'écart à la minute publiée est inférieur à une minute (instants arrondis par USNO). L'exhaustivité des autres événements et la fiabilité des fenêtres nécessitent davantage de recoupements indépendants.

### Tests réalisés

- Analyse syntaxique JavaScript : PASS.
- `tests/test_assets.cjs` : PASS.
- `tests/test_p1.cjs` : PASS.
- `tests/test_ui_mock.cjs` : PASS (navigation et filtres simulés).
- `scripts/verify_sources.py` : PASS.
- Compilation/installation APK Android 17 : **NON RÉALISÉE** (SDK Android et Gradle absents).
- Tests tactiles/visuels Android : **NON RÉALISÉS**.
- Navigateur Chromium local : **BLOQUÉ PAR L'ENVIRONNEMENT** ; pas de conclusion sur la qualité du rendu visuel.

### Limites à surveiller

- Algorithme de franchissement d'orbe par échantillonnage, pas exhaustivité mathématique stricte près des minima tangents.
- Groupements rétrogrades heuristiques, pas méthode de dynamique orbitale publiée.
- Profil et orbe fixés, sauvegarde du journal uniquement par JSON texte.
- Variables natales en clair dans les actifs ; fichier et dépôt doivent rester privés.
- Mise à jour sur Android exige conservation de la clé de signature P0.
