# ASTRA — P0.1-B / Rapport de clôture B6

**Statut : prêt pour une PR de revue, fusion non autorisée à ce stade.**

## Périmètre et preuves

- Référence P0.1-A : `1f3790d`; B1 : `c5d2735`; B2 : `666a85e`; B5 : `8191a4b`; protocole : `b1dd61a`.
- Sources : archive astra-b6-audit.tar.gz (summary, visual, residual, deltas), résultats locaux fournis, audit des sélecteurs et extraits du moteur app.js.
- Le contrôle PostCSS 16/16 est confirmé par la sortie terminal transmise. Les règles compilées sont évaluées par règle et non par branche ou déclaration.

## Résultats

| Indicateur | Avant | Après |
|---|---:|---:|
| Règles éligibles | 1798 | 1576 |
| Règles observées | 1405 | 1404 |
| Non observées | 393 | 172 |
| Couverture | 78,14 % | 89,09 % |
| Longueur du bundle (unités JS, pas octets mesurés) | 200658 | 178243 |
| Tests CSS | 24/24 | 24/24 |
| Tests généraux | 186/186 | 186/186 |
| Captures avant/après identiques | — | 103/103 |

104 classes, 223 blocs et 368 branches retirés selon les audits B1–B5. Le delta compilé est de 222 règles éligibles. La baisse de couverture absolue de 1 règle observée en B2 est expliquée par la fusion esbuild de `.natal-control-stack` et `.natal-advanced-top` sous `@media (min-width:800px)` : même déclaration `grid-template-columns:repeat(2,minmax(0,1fr))`, même spécificité (0,1,0), même couche legacy. Le différentiel de signatures exactes B2 contient 44 anciennes et 43 nouvelles signatures ; ce n’est pas une perte d’une branche active.

## Instabilité des captures

| Capture | Pixels | Dimensions image | Zone |
|---|---:|---|---|
| overview-1280x800.png | 232 | 1280×1804 | (391,1123)–(443,1137) |
| overview-768x1024.png | 232 | 768×1798 | (128,1124)–(180,1138) |

Les masques recadrés sont identiques bit à bit. Les anciennes captures du 25 novembre placent le mot « astres » du diagramme dans cette zone ; hypothèse forte mais non preuve sur les images B6 originales. Le masque montre une forme textuelle. Une variation de rastérisation SVG/typographique est plausible. Baseline vs baseline-repeat : 101/103 ; B5 vs B5-repeat : 103/103 ; baseline vs B5 : 103/103. Le gate strict visual_pass reste false : ne pas modifier le seuil ni masquer la zone sans justification. Obtenir les quatre PNG originaux B6, comparer les recadrages et les valeurs RGBA ; reproduire sur le même navigateur et vérifier document.fonts.ready et les coordonnées SVG avant de conclure. Ne pas toucher au CSS de production.

## Analyse des 172 règles

Chaque règle est examinée individuellement ci-dessous, selon son sélecteur, son contexte et sa fonction apparente. 152 sont conservées par justification fonctionnelle ou de compatibilité ; 20 sont conservées par prudence avec une vérification ciblée à reporter. Cette classification ne démontre pas que chaque sélecteur correspond à un DOM atteignable. Aucun retrait additionnel n’est proposé. Les variantes génériques et les structures historiques ne sont pas déclarées mortes sur la seule base du CDP.

| Famille | Nombre |
|---|---:|
| Focus clavier | 29 |
| Générique à confirmer | 19 |
| Événements | 19 |
| Sélection et lecture natale | 13 |
| Lecture des angles | 13 |
| Phases et ingresses lunaires | 12 |
| Mouvements réduits | 11 |
| Diagnostics | 11 |
| Contraste renforcé | 8 |
| Erreur et état vide | 7 |
| Paysage compact | 5 |
| Ruban solaire | 5 |
| Couleur personnelle | 5 |
| Journal calendrier | 4 |
| SVG roue double | 3 |
| Calendrier personnel sombre | 3 |
| Survol | 2 |
| Interaction tactile | 1 |
| Compatibilité navigateur | 1 |
| Réglages à confirmer | 1 |

### Inventaire individuel

Chaque entrée conserve son offset UTF-16 et le contexte compilé. La source candidate n’est pas un source map.

#### 001 — Générique à confirmer
- Sélecteur : `.tag`
- Contexte : `@layer legacy` ; offset 632.
- Décision : **Conserver — vérification ciblée**. Classe ou structure historique ; présence exacte dans le DOM et éventuelle surcharge à vérifier avant toute suppression.
- Sources candidates : style.css:6

```css
.tag{background:#f0eafd;color:#654b97;padding:5px 10px;border-radius:100px;font-size:10.5px;font-weight:700;white-space:nowrap}
```

#### 002 — Générique à confirmer
- Sélecteur : `.event-body p`
- Contexte : `@layer legacy` ; offset 1692.
- Décision : **Conserver — vérification ciblée**. Classe ou structure historique ; présence exacte dans le DOM et éventuelle surcharge à vérifier avant toute suppression.
- Sources candidates : style.css:6

```css
.event-body p{font-size:11px;line-height:1.5;margin:3px 0;color:var(--secondary)}
```

#### 003 — Erreur et état vide
- Sélecteur : `.notice`
- Contexte : `@layer legacy` ; offset 1881.
- Décision : **Conserver — justification fonctionnelle**. Affichage de secours, erreur ou absence de données ; conserver pour les états non exercés.
- Sources candidates : style.css:6

```css
.notice{background:#fff7f5;border:1px solid #f4e4e0;padding:14px 16px;border-radius:var(--astra-radius-lg);color:#7a6673;font-size:12px;line-height:1.6;margin-top:15px}
```

#### 004 — Journal calendrier
- Sélecteur : `.day .pinhole`
- Contexte : `@layer legacy` ; offset 3176.
- Décision : **Conserver — justification fonctionnelle**. Indicateur de note personnelle, y compris sélection et lunaison ; conserver la famille conditionnelle.
- Sources candidates : style.css:6, atlas-ui.css:93

```css
.day .pinhole{position:absolute;width:5px;height:5px;border-radius:100%;background:#e2989d;right:5px;top:5px}
```

#### 005 — Générique à confirmer
- Sélecteur : `.planet`
- Contexte : `@layer legacy` ; offset 4464.
- Décision : **Conserver — vérification ciblée**. Classe ou structure historique ; présence exacte dans le DOM et éventuelle surcharge à vérifier avant toute suppression.
- Sources candidates : style.css:6

```css
.planet{border:1px solid var(--border);border-radius:var(--astra-radius-md);padding:10px;display:flex;flex-direction:column}
```

#### 006 — Générique à confirmer
- Sélecteur : `.planet b`
- Contexte : `@layer legacy` ; offset 4588.
- Décision : **Conserver — vérification ciblée**. Classe ou structure historique ; présence exacte dans le DOM et éventuelle surcharge à vérifier avant toute suppression.
- Sources candidates : style.css:6

```css
.planet b{font-size:12px}
```

#### 007 — Générique à confirmer
- Sélecteur : `.planet small`
- Contexte : `@layer legacy` ; offset 4613.
- Décision : **Conserver — vérification ciblée**. Classe ou structure historique ; présence exacte dans le DOM et éventuelle surcharge à vérifier avant toute suppression.
- Sources candidates : style.css:6

```css
.planet small{font-size:11px;color:var(--secondary)}
```

#### 008 — Journal calendrier
- Sélecteur : `.day.selected .pinhole`
- Contexte : `@layer legacy` ; offset 5474.
- Décision : **Conserver — justification fonctionnelle**. Indicateur de note personnelle, y compris sélection et lunaison ; conserver la famille conditionnelle.
- Sources candidates : style.css:9

```css
.day.selected .pinhole{background:#fff}
```

#### 009 — Événements
- Sélecteur : `.sky-event .event-glyph`
- Contexte : `@layer legacy` ; offset 5513.
- Décision : **Conserver — justification fonctionnelle**. Présentation conditionnelle des événements du ciel et des fiches de détail ; conserver pour les catégories et données rares.
- Sources candidates : style.css:9

```css
.sky-event .event-glyph{background:#fdebee;color:#986b83}
```

#### 010 — Focus clavier
- Sélecteur : `.event-button:focus-visible`
- Contexte : `@layer legacy` ; offset 6140.
- Décision : **Conserver — justification fonctionnelle**. Indicateur de focus ou géométrie du focus ; conserver pour navigation clavier et états interactifs.
- Sources candidates : style.css:13

```css
.event-button:focus-visible{outline:3px solid var(--astra-focus-ring);outline-offset:1px;border-radius:9px}
```

#### 011 — Générique à confirmer
- Sélecteur : `.detail-group button`
- Contexte : `@layer legacy` ; offset 6736.
- Décision : **Conserver — vérification ciblée**. Classe ou structure historique ; présence exacte dans le DOM et éventuelle surcharge à vérifier avant toute suppression.
- Sources candidates : style.css:13

```css
.detail-group button{margin-bottom:5px}
```

#### 012 — Générique à confirmer
- Sélecteur : `.natal-card>.tiny`
- Contexte : `@layer legacy` ; offset 8047.
- Décision : **Conserver — vérification ciblée**. Classe ou structure historique ; présence exacte dans le DOM et éventuelle surcharge à vérifier avant toute suppression.
- Sources candidates : style.css:20

```css
.natal-card>.tiny{margin:7px 6px}
```

#### 013 — Erreur et état vide
- Sélecteur : `.natal-selected-empty`
- Contexte : `@layer legacy` ; offset 10678.
- Décision : **Conserver — justification fonctionnelle**. Affichage de secours, erreur ou absence de données ; conserver pour les états non exercés.
- Sources candidates : style.css:35, style.css:78

```css
.natal-selected-empty{color:var(--secondary);font-size:12px;line-height:1.65}
```

#### 014 — Sélection et lecture natale
- Sélecteur : `.natal-highlight`
- Contexte : `@layer legacy` ; offset 11034.
- Décision : **Conserver — justification fonctionnelle**. Styles de sélection, résumé ou comparaison natale ; garder, vérifier les chemins de rendu rares.
- Sources candidates : style.css:39

```css
.natal-highlight{background:#fbf9fd;border:1px solid #eee6f4;border-radius:var(--astra-radius-md);padding:11px 8px;display:flex;flex-direction:column;text-align:left;gap:5px;min-height:65px;color:var(--ink);cursor:pointer}
```

#### 015 — Sélection et lecture natale
- Sélecteur : `.natal-highlight span`
- Contexte : `@layer legacy` ; offset 11256.
- Décision : **Conserver — justification fonctionnelle**. Styles de sélection, résumé ou comparaison natale ; garder, vérifier les chemins de rendu rares.
- Sources candidates : style.css:40, style.css:76, style.css:413

```css
.natal-highlight span{font-size:10px;color:var(--secondary)}
```

#### 016 — Sélection et lecture natale
- Sélecteur : `.natal-highlight b`
- Contexte : `@layer legacy` ; offset 11316.
- Décision : **Conserver — justification fonctionnelle**. Styles de sélection, résumé ou comparaison natale ; garder, vérifier les chemins de rendu rares.
- Sources candidates : style.css:41

```css
.natal-highlight b{font-size:12px;color:var(--deep);line-height:1.4}
```

#### 017 — Focus clavier
- Sélecteur : `.natal-highlight:focus-visible,.natal-position:focus-visible,.natal-house-chip:focus-visible,.natal-segments>button:focus-visible`
- Contexte : `@layer legacy` ; offset 11384.
- Décision : **Conserver — justification fonctionnelle**. Indicateur de focus ou géométrie du focus ; conserver pour navigation clavier et états interactifs.
- Sources candidates : style.css:42

```css
.natal-highlight:focus-visible,.natal-position:focus-visible,.natal-house-chip:focus-visible,.natal-segments>button:focus-visible{outline:3px solid var(--astra-focus-ring);outline-offset:2px}
```

#### 018 — Sélection et lecture natale
- Sélecteur : `.natal-position[aria-pressed=true],.natal-house-chip[aria-pressed=true]`
- Contexte : `@layer legacy` ; offset 11720.
- Décision : **Conserver — justification fonctionnelle**. Styles de sélection, résumé ou comparaison natale ; garder, vérifier les chemins de rendu rares.
- Sources candidates : style.css:44

```css
.natal-position[aria-pressed=true],.natal-house-chip[aria-pressed=true]{background:#f0e7fa}
```

#### 019 — Focus clavier
- Sélecteur : `.natal-wheel-viewport:focus-visible`
- Contexte : `@layer legacy` ; offset 13196.
- Décision : **Conserver — justification fonctionnelle**. Indicateur de focus ou géométrie du focus ; conserver pour navigation clavier et états interactifs.
- Sources candidates : style.css:66

```css
.natal-wheel-viewport:focus-visible{outline:3px solid var(--astra-focus-ring);outline-offset:1px;border-radius:var(--astra-radius-sm)}
```

#### 020 — Sélection et lecture natale
- Sélecteur : `.natal-highlight span`
- Contexte : `@layer legacy` ; offset 13851.
- Décision : **Conserver — justification fonctionnelle**. Styles de sélection, résumé ou comparaison natale ; garder, vérifier les chemins de rendu rares.
- Sources candidates : style.css:40, style.css:76, style.css:413

```css
.natal-highlight span{color:#5b506b;font-size:11.5px}
```

#### 021 — Erreur et état vide
- Sélecteur : `.natal-selected-empty`
- Contexte : `@layer legacy` ; offset 13942.
- Décision : **Conserver — justification fonctionnelle**. Affichage de secours, erreur ou absence de données ; conserver pour les états non exercés.
- Sources candidates : style.css:35, style.css:78

```css
.natal-selected-empty{color:#5c4c6d}
```

#### 022 — Focus clavier
- Sélecteur : `.natal-filter-items button:focus-visible,.natal-related button:focus-visible,.natal-aspects button:focus-visible`
- Contexte : `@layer legacy` ; offset 14845.
- Décision : **Conserver — justification fonctionnelle**. Indicateur de focus ou géométrie du focus ; conserver pour navigation clavier et états interactifs.
- Sources candidates : style.css:100

```css
.natal-filter-items button:focus-visible,.natal-related button:focus-visible,.natal-aspects button:focus-visible{outline:3px solid var(--astra-focus-ring);outline-offset:2px}
```

#### 023 — Focus clavier
- Sélecteur : `.unknown-time-toggle input:focus-visible`
- Contexte : `@layer legacy` ; offset 16615.
- Décision : **Conserver — justification fonctionnelle**. Indicateur de focus ou géométrie du focus ; conserver pour navigation clavier et états interactifs.
- Sources candidates : style.css:127

```css
.unknown-time-toggle input:focus-visible{outline:3px solid var(--astra-focus-ring);outline-offset:3px}
```

#### 024 — Focus clavier
- Sélecteur : `.natal-advanced-buttons button:focus-visible,.natal-zoom button:focus-visible`
- Contexte : `@layer legacy` ; offset 17651.
- Décision : **Conserver — justification fonctionnelle**. Indicateur de focus ou géométrie du focus ; conserver pour navigation clavier et états interactifs.
- Sources candidates : style.css:158

```css
.natal-advanced-buttons button:focus-visible,.natal-zoom button:focus-visible{outline:3px solid var(--astra-focus-ring);outline-offset:2px}
```

#### 025 — Focus clavier
- Sélecteur : `.natal-double-wheel .natal-transit-hit:focus-visible>circle`
- Contexte : `@layer legacy` ; offset 19047.
- Décision : **Conserver — justification fonctionnelle**. Indicateur de focus ou géométrie du focus ; conserver pour navigation clavier et états interactifs.
- Sources candidates : style.css:175

```css
.natal-double-wheel .natal-transit-hit:focus-visible>circle{stroke:#396a83;stroke-width:3;fill:#d8e9f1}
```

#### 026 — Focus clavier
- Sélecteur : `.natal-matrix-scroll:focus-visible`
- Contexte : `@layer legacy` ; offset 19549.
- Décision : **Conserver — justification fonctionnelle**. Indicateur de focus ou géométrie du focus ; conserver pour navigation clavier et états interactifs.
- Sources candidates : style.css:182

```css
.natal-matrix-scroll:focus-visible{outline:3px solid var(--astra-focus-ring)}
```

#### 027 — Focus clavier
- Sélecteur : `.natal-matrix td button:focus-visible`
- Contexte : `@layer legacy` ; offset 20404.
- Décision : **Conserver — justification fonctionnelle**. Indicateur de focus ou géométrie du focus ; conserver pour navigation clavier et états interactifs.
- Sources candidates : style.css:193

```css
.natal-matrix td button:focus-visible{outline:2px solid var(--astra-focus-ring);outline-offset:-2px}
```

#### 028 — Focus clavier
- Sélecteur : `.natal-summary-item:focus-visible,.natal-home-actions button:focus-visible,.natal-back:focus-visible,.natal-preview-disclosure summary:focus-visible`
- Contexte : `@layer legacy` ; offset 23378.
- Décision : **Conserver — justification fonctionnelle**. Indicateur de focus ou géométrie du focus ; conserver pour navigation clavier et états interactifs.
- Sources candidates : style.css:252

```css
.natal-summary-item:focus-visible,.natal-home-actions button:focus-visible,.natal-back:focus-visible,.natal-preview-disclosure summary:focus-visible{outline:3px solid var(--astra-focus-ring);outline-offset:3px}
```

#### 029 — Sélection et lecture natale
- Sélecteur : `.natal-compare .natal-wheel-viewport`
- Contexte : `@layer legacy / @media (min-width:800px)` ; offset 29692.
- Décision : **Conserver — justification fonctionnelle**. Styles de sélection, résumé ou comparaison natale ; garder, vérifier les chemins de rendu rares.
- Sources candidates : style.css:357, style.css:374

```css
.natal-compare .natal-wheel-viewport{max-width:650px;margin:18px auto 0}
```

#### 030 — Générique à confirmer
- Sélecteur : `.natal-highlight span`
- Contexte : `@layer legacy` ; offset 30735.
- Décision : **Conserver — vérification ciblée**. Classe ou structure historique ; présence exacte dans le DOM et éventuelle surcharge à vérifier avant toute suppression.
- Sources candidates : style.css:40, style.css:76, style.css:413

```css
.natal-highlight span{font-size:13px}
```

#### 031 — Mouvements réduits
- Sélecteur : `.natal-context-sheet`
- Contexte : `@layer legacy / @media (prefers-reduced-motion:reduce)` ; offset 32450.
- Décision : **Conserver — justification fonctionnelle**. Respect de la préférence système ; non-observation normale lorsque cette préférence est désactivée.
- Sources candidates : style.css:311, style.css:367, style.css:372, style.css:453, style.css:461, style.css:499, style.css:518, style.css:521, astra-components.css:649, astra-p3-accessibility.css:172, astra-layout.css:71

```css
.natal-context-sheet{animation:none!important;transform:none!important}
```

#### 032 — Paysage compact
- Sélecteur : `.natal-context-sheet`
- Contexte : `@layer legacy / @media (orientation:landscape)and (max-height:500px)` ; offset 34649.
- Décision : **Conserver — justification fonctionnelle**. Mise en page conditionnelle paysage/faible hauteur ; conserver pour les écrans compatibles.
- Sources candidates : style.css:311, style.css:367, style.css:372, style.css:453, style.css:461, style.css:499, style.css:518, style.css:521, astra-components.css:649, astra-p3-accessibility.css:172, astra-layout.css:71

```css
.natal-context-sheet{max-height:62dvh}
```

#### 033 — Focus clavier
- Sélecteur : `.field input[aria-invalid=true]:focus-visible,.field select[aria-invalid=true]:focus-visible`
- Contexte : `@layer legacy` ; offset 34891.
- Décision : **Conserver — justification fonctionnelle**. Indicateur de focus ou géométrie du focus ; conserver pour navigation clavier et états interactifs.
- Sources candidates : style.css:529

```css
.field input[aria-invalid=true]:focus-visible,.field select[aria-invalid=true]:focus-visible{outline:3px solid var(--astra-focus-ring);outline-offset:2px}
```

#### 034 — Journal calendrier
- Sélecteur : `.day .pinhole`
- Contexte : `@layer legacy` ; offset 38808.
- Décision : **Conserver — justification fonctionnelle**. Indicateur de note personnelle, y compris sélection et lunaison ; conserver la famille conditionnelle.
- Sources candidates : style.css:6, atlas-ui.css:93

```css
.day .pinhole{background:#d99965}
```

#### 035 — Générique à confirmer
- Sélecteur : `.calendar .tiny`
- Contexte : `@layer legacy` ; offset 38841.
- Décision : **Conserver — vérification ciblée**. Classe ou structure historique ; présence exacte dans le DOM et éventuelle surcharge à vérifier avant toute suppression.
- Sources candidates : atlas-ui.css:94

```css
.calendar .tiny{font-size:12px;color:#687988;margin:11px 0 0}
```

#### 036 — Mouvements réduits
- Sélecteur : `.primary:active,.natal-main-action:active`
- Contexte : `@layer legacy / @media (prefers-reduced-motion:reduce)` ; offset 41126.
- Décision : **Conserver — justification fonctionnelle**. Respect de la préférence système ; non-observation normale lorsque cette préférence est désactivée.
- Sources candidates : atlas-ui.css:22, atlas-ui.css:158

```css
.primary:active,.natal-main-action:active{transform:none}
```

#### 037 — Focus clavier
- Sélecteur : `.astra-week-day:focus-visible`
- Contexte : `@layer legacy` ; offset 42930.
- Décision : **Conserver — justification fonctionnelle**. Indicateur de focus ou géométrie du focus ; conserver pour navigation clavier et états interactifs.
- Sources candidates : atlas-ui.css:202

```css
.astra-week-day:focus-visible{outline:3px solid var(--astra-focus);outline-offset:2px}
```

#### 038 — Journal calendrier
- Sélecteur : `.calendar .day.moon-new .pinhole,.calendar .day.moon-full .pinhole`
- Contexte : `@layer legacy` ; offset 46327.
- Décision : **Conserver — justification fonctionnelle**. Indicateur de note personnelle, y compris sélection et lunaison ; conserver la famille conditionnelle.
- Sources candidates : atlas-ui.css:307

```css
.calendar .day.moon-new .pinhole,.calendar .day.moon-full .pinhole{left:4px;top:4px;right:auto}
```

#### 039 — Générique à confirmer
- Sélecteur : `.astra-month-hero>p:last-child`
- Contexte : `@layer legacy` ; offset 48909.
- Décision : **Conserver — vérification ciblée**. Classe ou structure historique ; présence exacte dans le DOM et éventuelle surcharge à vérifier avant toute suppression.
- Sources candidates : atlas-ui.css:387

```css
.astra-month-hero>p:last-child{color:#cddce7;font-size:13px;line-height:1.5;margin:9px 0 0;position:relative;z-index:1}
```

#### 040 — Mouvements réduits
- Sélecteur : `.natal-context-sheet,.astra-week-day`
- Contexte : `@layer legacy / @media (prefers-reduced-motion:reduce)` ; offset 52953.
- Décision : **Conserver — justification fonctionnelle**. Respect de la préférence système ; non-observation normale lorsque cette préférence est désactivée.
- Sources candidates : atlas-ui.css:497

```css
.natal-context-sheet,.astra-week-day{animation:none!important;transition:none!important}
```

#### 041 — Diagnostics
- Sélecteur : `.astra-performance-scroll`
- Contexte : `@layer legacy` ; offset 53809.
- Décision : **Conserver — justification fonctionnelle**. Tableau de mesures et thème sombre du module de diagnostics opt-in (app.js 1818–1826).
- Sources candidates : theme.css:12, astra-p2-navigation.css:113

```css
.astra-performance-scroll{max-width:100%;overflow-x:auto;scrollbar-gutter:stable;margin:12px 0;border:1px solid var(--astra-rule);border-radius:12px}
```

#### 042 — Focus clavier
- Sélecteur : `.astra-performance-scroll:focus-visible`
- Contexte : `@layer legacy` ; offset 53958.
- Décision : **Conserver — justification fonctionnelle**. Indicateur de focus ou géométrie du focus ; conserver pour navigation clavier et états interactifs.
- Sources candidates : theme.css:14

```css
.astra-performance-scroll:focus-visible{outline:3px solid var(--astra-focus-ring);outline-offset:2px}
```

#### 043 — Diagnostics
- Sélecteur : `.astra-performance table`
- Contexte : `@layer legacy` ; offset 54059.
- Décision : **Conserver — justification fonctionnelle**. Tableau de mesures et thème sombre du module de diagnostics opt-in (app.js 1818–1826).
- Sources candidates : theme.css:15

```css
.astra-performance table{width:100%;min-width:490px;border-collapse:collapse;font:500 .8125rem/1.4 system-ui,sans-serif;font-variant-numeric:tabular-nums}
```

#### 044 — Diagnostics
- Sélecteur : `.astra-performance th,.astra-performance td`
- Contexte : `@layer legacy` ; offset 54213.
- Décision : **Conserver — justification fonctionnelle**. Tableau de mesures et thème sombre du module de diagnostics opt-in (app.js 1818–1826).
- Sources candidates : theme.css:17

```css
.astra-performance th,.astra-performance td{padding:10px 9px;border-bottom:1px solid var(--astra-rule);text-align:right}
```

#### 045 — Diagnostics
- Sélecteur : `.astra-performance th:first-child`
- Contexte : `@layer legacy` ; offset 54333.
- Décision : **Conserver — justification fonctionnelle**. Tableau de mesures et thème sombre du module de diagnostics opt-in (app.js 1818–1826).
- Sources candidates : theme.css:18

```css
.astra-performance th:first-child{text-align:left}
```

#### 046 — Diagnostics
- Sélecteur : `.astra-performance thead th`
- Contexte : `@layer legacy` ; offset 54383.
- Décision : **Conserver — justification fonctionnelle**. Tableau de mesures et thème sombre du module de diagnostics opt-in (app.js 1818–1826).
- Sources candidates : theme.css:19, astra-p2-navigation.css:114

```css
.astra-performance thead th{background:var(--astra-secondary-surface);font-weight:750}
```

#### 047 — Diagnostics
- Sélecteur : `.astra-performance tbody th`
- Contexte : `@layer legacy` ; offset 54469.
- Décision : **Conserver — justification fonctionnelle**. Tableau de mesures et thème sombre du module de diagnostics opt-in (app.js 1818–1826).
- Sources candidates : theme.css:20

```css
.astra-performance tbody th{font-weight:650}
```

#### 048 — Diagnostics
- Sélecteur : `.astra-performance tr:last-child th,.astra-performance tr:last-child td`
- Contexte : `@layer legacy` ; offset 54513.
- Décision : **Conserver — justification fonctionnelle**. Tableau de mesures et thème sombre du module de diagnostics opt-in (app.js 1818–1826).
- Sources candidates : theme.css:21

```css
.astra-performance tr:last-child th,.astra-performance tr:last-child td{border-bottom:0}
```

#### 049 — Générique à confirmer
- Sélecteur : `:root[data-astra-theme=dark] :is(.mood span:last-child,.tag-button,.natal-aspect>span:last-child)`
- Contexte : `@layer legacy` ; offset 58844.
- Décision : **Conserver — vérification ciblée**. Classe ou structure historique ; présence exacte dans le DOM et éventuelle surcharge à vérifier avant toute suppression.
- Sources candidates : theme.css:113

```css
:root[data-astra-theme=dark] :is(.mood span:last-child,.tag-button,.natal-aspect>span:last-child){color:#c1d1dc}
```

#### 050 — Erreur et état vide
- Sélecteur : `:root[data-astra-theme=dark] .notice,:root[data-astra-theme=dark] .natal-warning`
- Contexte : `@layer legacy` ; offset 61286.
- Décision : **Conserver — justification fonctionnelle**. Affichage de secours, erreur ou absence de données ; conserver pour les états non exercés.
- Sources candidates : theme.css:161

```css
:root[data-astra-theme=dark] .notice,:root[data-astra-theme=dark] .natal-warning{background:#3a2e3e;color:#ffe1e5;border-color:#755368}
```

#### 051 — Diagnostics
- Sélecteur : `:root[data-astra-theme=dark] .astra-performance thead th`
- Contexte : `@layer legacy` ; offset 61667.
- Décision : **Conserver — justification fonctionnelle**. Tableau de mesures et thème sombre du module de diagnostics opt-in (app.js 1818–1826).
- Sources candidates : theme.css:174

```css
:root[data-astra-theme=dark] .astra-performance thead th{background:var(--astra-secondary-surface)}
```

#### 052 — Diagnostics
- Sélecteur : `:root[data-astra-theme=dark] .astra-performance tr`
- Contexte : `@layer legacy` ; offset 61766.
- Décision : **Conserver — justification fonctionnelle**. Tableau de mesures et thème sombre du module de diagnostics opt-in (app.js 1818–1826).
- Sources candidates : theme.css:177

```css
:root[data-astra-theme=dark] .astra-performance tr{border-color:var(--astra-rule)}
```

#### 053 — SVG roue double
- Sélecteur : `.natal-double-wheel.wheel-modern .natal-transit-hit .wheel-true-anchor`
- Contexte : `@layer legacy` ; offset 66101.
- Décision : **Conserver — justification fonctionnelle**. Ancrages et traits des glyphes ; conserver pour les configurations de roue et collisions.
- Sources candidates : wheel-ui.css:179, astra-p4-wheel.css:129

```css
.natal-double-wheel.wheel-modern .natal-transit-hit .wheel-true-anchor{fill:#3d89a6}
```

#### 054 — SVG roue double
- Sélecteur : `.natal-double-wheel.wheel-modern .natal-planet-hit .wheel-true-anchor`
- Contexte : `@layer legacy` ; offset 66185.
- Décision : **Conserver — justification fonctionnelle**. Ancrages et traits des glyphes ; conserver pour les configurations de roue et collisions.
- Sources candidates : wheel-ui.css:182, astra-p4-wheel.css:130

```css
.natal-double-wheel.wheel-modern .natal-planet-hit .wheel-true-anchor{fill:#735a8f}
```

#### 055 — Focus clavier
- Sélecteur : `.natal-double-wheel.wheel-modern :is(.natal-planet-hit,.natal-transit-hit):focus-visible .wheel-planet-disc`
- Contexte : `@layer legacy` ; offset 66524.
- Décision : **Conserver — justification fonctionnelle**. Indicateur de focus ou géométrie du focus ; conserver pour navigation clavier et états interactifs.
- Sources candidates : wheel-ui.css:191

```css
.natal-double-wheel.wheel-modern :is(.natal-planet-hit,.natal-transit-hit):focus-visible .wheel-planet-disc{fill:#d9edf8;stroke:#183f5b;stroke-width:3}
```

#### 056 — Focus clavier
- Sélecteur : `.wheel-modern:focus-visible`
- Contexte : `@layer legacy` ; offset 66770.
- Décision : **Conserver — justification fonctionnelle**. Indicateur de focus ou géométrie du focus ; conserver pour navigation clavier et états interactifs.
- Sources candidates : wheel-ui.css:201

```css
.wheel-modern:focus-visible{outline:none}
```

#### 057 — Ruban solaire
- Sélecteur : `.solar-sign-1,.solar-sign-5,.solar-sign-9`
- Contexte : `@layer legacy` ; offset 67279.
- Décision : **Conserver — justification fonctionnelle**. Classes générées dynamiquement ou état solaire inconnu ; conserver pour signes et données variables.
- Sources candidates : solar-ribbon.css:5

```css
.solar-sign-1,.solar-sign-5,.solar-sign-9{--solar-bg:var(--solar-earth-bg);--solar-ink:var(--solar-earth-ink)}
```

#### 058 — Ruban solaire
- Sélecteur : `.solar-sign-2,.solar-sign-6,.solar-sign-10`
- Contexte : `@layer legacy` ; offset 67389.
- Décision : **Conserver — justification fonctionnelle**. Classes générées dynamiquement ou état solaire inconnu ; conserver pour signes et données variables.
- Sources candidates : solar-ribbon.css:6

```css
.solar-sign-2,.solar-sign-6,.solar-sign-10{--solar-bg:var(--solar-air-bg);--solar-ink:var(--solar-air-ink)}
```

#### 059 — Ruban solaire
- Sélecteur : `.solar-element-air`
- Contexte : `@layer legacy` ; offset 67865.
- Décision : **Conserver — justification fonctionnelle**. Classes générées dynamiquement ou état solaire inconnu ; conserver pour signes et données variables.
- Sources candidates : solar-ribbon.css:13

```css
.solar-element-air{--solar-bg:var(--solar-air-bg);--solar-muted-bg:var(--solar-air-muted);--solar-ink:var(--solar-air-ink)}
```

#### 060 — Ruban solaire
- Sélecteur : `.solar-element-unknown`
- Contexte : `@layer legacy` ; offset 68119.
- Décision : **Conserver — justification fonctionnelle**. Classes générées dynamiquement ou état solaire inconnu ; conserver pour signes et données variables.
- Sources candidates : solar-ribbon.css:15

```css
.solar-element-unknown{--solar-bg:transparent}
```

#### 061 — Focus clavier
- Sélecteur : `.calendar .astra-calendar-date-week .day:focus-visible`
- Contexte : `@layer legacy` ; offset 69587.
- Décision : **Conserver — justification fonctionnelle**. Indicateur de focus ou géométrie du focus ; conserver pour navigation clavier et états interactifs.
- Sources candidates : solar-ribbon.css:61

```css
.calendar .astra-calendar-date-week .day:focus-visible{outline:3px solid #235e81;outline-offset:-3px;z-index:2}
```

#### 062 — Générique à confirmer
- Sélecteur : `.astra-calendar-solar-note b`
- Contexte : `@layer legacy` ; offset 70207.
- Décision : **Conserver — vérification ciblée**. Classe ou structure historique ; présence exacte dans le DOM et éventuelle surcharge à vérifier avant toute suppression.
- Sources candidates : solar-ribbon.css:77

```css
.astra-calendar-solar-note b{font-weight:800}
```

#### 063 — Ruban solaire
- Sélecteur : `.astra-solar-daily-band.is-unknown`
- Contexte : `@layer legacy` ; offset 70952.
- Décision : **Conserver — justification fonctionnelle**. Classes générées dynamiquement ou état solaire inconnu ; conserver pour signes et données variables.
- Sources candidates : solar-ribbon.css:90

```css
.astra-solar-daily-band.is-unknown{background:#e8edf1;color:#405566}
```

#### 064 — Erreur et état vide
- Sélecteur : `.astra-calendar-empty`
- Contexte : `@layer legacy` ; offset 71081.
- Décision : **Conserver — justification fonctionnelle**. Affichage de secours, erreur ou absence de données ; conserver pour les états non exercés.
- Sources candidates : calendar-p0.css:4

```css
.astra-calendar-empty{margin:13px 2px;color:#657887;font-size:13px;line-height:1.6}
```

#### 065 — Focus clavier
- Sélecteur : `.astra-day-journal-link:focus-visible`
- Contexte : `@layer legacy` ; offset 71164.
- Décision : **Conserver — justification fonctionnelle**. Indicateur de focus ou géométrie du focus ; conserver pour navigation clavier et états interactifs.
- Sources candidates : calendar-p0.css:5

```css
.astra-day-journal-link:focus-visible{outline:3px solid #3b82a2;outline-offset:2px}
```

#### 066 — Événements
- Sélecteur : `.event-kind-moon-quarter`
- Contexte : `@layer legacy` ; offset 71842.
- Décision : **Conserver — justification fonctionnelle**. Présentation conditionnelle des événements du ciel et des fiches de détail ; conserver pour les catégories et données rares.
- Sources candidates : calendar-p0.css:21

```css
.event-kind-moon-quarter{--event-bg:#e8eefb;--event-ink:#4b6596;--event-edge:#94aad5}
```

#### 067 — Événements
- Sélecteur : `.event-kind-station`
- Contexte : `@layer legacy` ; offset 71927.
- Décision : **Conserver — justification fonctionnelle**. Présentation conditionnelle des événements du ciel et des fiches de détail ; conserver pour les catégories et données rares.
- Sources candidates : calendar-p0.css:22

```css
.event-kind-station{--event-bg:#e2f2ef;--event-ink:#306e65;--event-edge:#84c1b4}
```

#### 068 — Focus clavier
- Sélecteur : `.event-button[class*=event-kind-]:focus-visible`
- Contexte : `@layer legacy` ; offset 72620.
- Décision : **Conserver — justification fonctionnelle**. Indicateur de focus ou géométrie du focus ; conserver pour navigation clavier et états interactifs.
- Sources candidates : calendar-p0.css:36

```css
.event-button[class*=event-kind-]:focus-visible{outline:2px solid #3f7b9b;outline-offset:-2px;background:#f2f8fb}
```

#### 069 — Générique à confirmer
- Sélecteur : `.astra-event-detail .detail-head .tag`
- Contexte : `@layer legacy` ; offset 72801.
- Décision : **Conserver — vérification ciblée**. Classe ou structure historique ; présence exacte dans le DOM et éventuelle surcharge à vérifier avant toute suppression.
- Sources candidates : calendar-p0.css:42

```css
.astra-event-detail .detail-head .tag{background:var(--event-bg,#eaf1f4);color:var(--event-ink,#31586c)}
```

#### 070 — Erreur et état vide
- Sélecteur : `:root[data-astra-theme=dark] .astra-calendar-empty`
- Contexte : `@layer legacy` ; offset 73497.
- Décision : **Conserver — justification fonctionnelle**. Affichage de secours, erreur ou absence de données ; conserver pour les états non exercés.
- Sources candidates : calendar-p0.css:65

```css
:root[data-astra-theme=dark] .astra-calendar-empty{color:#c0d8e5}
```

#### 071 — Événements
- Sélecteur : `:root[data-astra-theme=dark] .astra-event-facts>div`
- Contexte : `@layer legacy` ; offset 73669.
- Décision : **Conserver — justification fonctionnelle**. Présentation conditionnelle des événements du ciel et des fiches de détail ; conserver pour les catégories et données rares.
- Sources candidates : calendar-p0.css:69

```css
:root[data-astra-theme=dark] .astra-event-facts>div{background:#223d4e;border-color:#56788b}
```

#### 072 — Événements
- Sélecteur : `:root[data-astra-theme=dark] .astra-event-facts span,:root[data-astra-theme=dark] .astra-event-facts strong`
- Contexte : `@layer legacy` ; offset 73761.
- Décision : **Conserver — justification fonctionnelle**. Présentation conditionnelle des événements du ciel et des fiches de détail ; conserver pour les catégories et données rares.
- Sources candidates : calendar-p0.css:72

```css
:root[data-astra-theme=dark] .astra-event-facts span,:root[data-astra-theme=dark] .astra-event-facts strong{color:#e0edf5}
```

#### 073 — Survol
- Sélecteur : `:root[data-astra-theme=dark] .event-button[class*=event-kind-]:hover`
- Contexte : `@layer legacy` ; offset 73883.
- Décision : **Conserver — justification fonctionnelle**. Retour visuel lors du survol ; conserver pour souris/pointeur.
- Sources candidates : calendar-p0.css:74

```css
:root[data-astra-theme=dark] .event-button[class*=event-kind-]:hover{background:#264759}
```

#### 074 — Focus clavier
- Sélecteur : `.astra-personal-calendar-event:focus-visible,.astra-calendar-inspector-event:focus-visible`
- Contexte : `@layer legacy` ; offset 74107.
- Décision : **Conserver — justification fonctionnelle**. Indicateur de focus ou géométrie du focus ; conserver pour navigation clavier et états interactifs.
- Sources candidates : personal-calendar.css:5

```css
.astra-personal-calendar-event:focus-visible,.astra-calendar-inspector-event:focus-visible{outline:3px solid #3982a5;outline-offset:2px;position:relative;z-index:2}
```

#### 075 — Couleur personnelle
- Sélecteur : `.event-color-purple`
- Contexte : `@layer legacy` ; offset 75342.
- Décision : **Conserver — justification fonctionnelle**. Variantes dynamiques de couleur des événements ; conserver toutes les options.
- Sources candidates : personal-calendar.css:39

```css
.event-color-purple{--personal-bg:#ebdef7;--personal-ink:#5f3b7d;--personal-border:#b29acb}
```

#### 076 — Couleur personnelle
- Sélecteur : `.event-color-green`
- Contexte : `@layer legacy` ; offset 75433.
- Décision : **Conserver — justification fonctionnelle**. Variantes dynamiques de couleur des événements ; conserver toutes les options.
- Sources candidates : personal-calendar.css:40

```css
.event-color-green{--personal-bg:#ddefe5;--personal-ink:#2f624b;--personal-border:#95c6ad}
```

#### 077 — Couleur personnelle
- Sélecteur : `.event-color-orange`
- Contexte : `@layer legacy` ; offset 75523.
- Décision : **Conserver — justification fonctionnelle**. Variantes dynamiques de couleur des événements ; conserver toutes les options.
- Sources candidates : personal-calendar.css:41

```css
.event-color-orange{--personal-bg:#fae7cd;--personal-ink:#795023;--personal-border:#d8b384}
```

#### 078 — Couleur personnelle
- Sélecteur : `.event-color-rose`
- Contexte : `@layer legacy` ; offset 75614.
- Décision : **Conserver — justification fonctionnelle**. Variantes dynamiques de couleur des événements ; conserver toutes les options.
- Sources candidates : personal-calendar.css:42

```css
.event-color-rose{--personal-bg:#f7e0e8;--personal-ink:#833d5c;--personal-border:#d8a4b8}
```

#### 079 — Couleur personnelle
- Sélecteur : `.event-color-slate`
- Contexte : `@layer legacy` ; offset 75703.
- Décision : **Conserver — justification fonctionnelle**. Variantes dynamiques de couleur des événements ; conserver toutes les options.
- Sources candidates : personal-calendar.css:43

```css
.event-color-slate{--personal-bg:#e4ebee;--personal-ink:#405663;--personal-border:#a7b8c0}
```

#### 080 — Calendrier personnel sombre
- Sélecteur : `:root[data-astra-theme=dark] .astra-calendar-inspector-event`
- Contexte : `@layer legacy` ; offset 76562.
- Décision : **Conserver — justification fonctionnelle**. Styles du détail et inspecteur en thème sombre ; conserver pour combinaisons de thème et données.
- Sources candidates : personal-calendar.css:66

```css
:root[data-astra-theme=dark] .astra-calendar-inspector-event{background:#203c4c;border-bottom-color:#597b8f}
```

#### 081 — Calendrier personnel sombre
- Sélecteur : `:root[data-astra-theme=dark] .astra-calendar-inspector-event span`
- Contexte : `@layer legacy` ; offset 76670.
- Décision : **Conserver — justification fonctionnelle**. Styles du détail et inspecteur en thème sombre ; conserver pour combinaisons de thème et données.
- Sources candidates : personal-calendar.css:69

```css
:root[data-astra-theme=dark] .astra-calendar-inspector-event span{color:#d0e1eb}
```

#### 082 — Calendrier personnel sombre
- Sélecteur : `:root[data-astra-theme=dark] .astra-calendar-sheet-solar`
- Contexte : `@layer legacy` ; offset 76750.
- Décision : **Conserver — justification fonctionnelle**. Styles du détail et inspecteur en thème sombre ; conserver pour combinaisons de thème et données.
- Sources candidates : personal-calendar.css:70

```css
:root[data-astra-theme=dark] .astra-calendar-sheet-solar{background:#2a485a;color:#e2edf5}
```

#### 083 — Contraste renforcé
- Sélecteur : `:root`
- Contexte : `@layer tokens / @media (prefers-contrast:more)` ; offset 85006.
- Décision : **Conserver — justification fonctionnelle**. Préférence système de contraste ; conserver, indépendamment de la couverture courante.
- Sources candidates : astra-tokens.css:4, astra-tokens.css:284, astra-p2-navigation.css:4, astra-layout.css:81

```css
:root{--astra-border:var(--color-deep-ocean);--astra-muted:#294C57;--astra-focus:var(--color-retro-red)}
```

#### 084 — Contraste renforcé
- Sélecteur : `:root[data-astra-theme=dark]`
- Contexte : `@layer tokens / @media (prefers-contrast:more)` ; offset 85110.
- Décision : **Conserver — justification fonctionnelle**. Préférence système de contraste ; conserver, indépendamment de la couverture courante.
- Sources candidates : astra-tokens.css:172, astra-tokens.css:285, astra-p2-navigation.css:9

```css
:root[data-astra-theme=dark]{--astra-border:var(--color-cream);--astra-muted:var(--color-cream);--astra-focus:var(--color-dandelion) }
```

#### 085 — Focus clavier
- Sélecteur : `.astra-city-option:focus-visible`
- Contexte : `@layer components` ; offset 91547.
- Décision : **Conserver — justification fonctionnelle**. Indicateur de focus ou géométrie du focus ; conserver pour navigation clavier et états interactifs.
- Sources candidates : astra-components.css:148

```css
.astra-city-option:focus-visible{outline:3px solid var(--astra-focus);outline-offset:-3px}
```

#### 086 — Paysage compact
- Sélecteur : `.bottom-nav .nav`
- Contexte : `@layer components / @media (orientation:landscape)and (max-height:500px)` ; offset 93979.
- Décision : **Conserver — justification fonctionnelle**. Mise en page conditionnelle paysage/faible hauteur ; conserver pour les écrans compatibles.
- Sources candidates : astra-components.css:75, astra-components.css:195, astra-components.css:198, astra-components.css:209

```css
.bottom-nav .nav{min-height:var(--astra-control-min);gap:2px;padding-block:3px}
```

#### 087 — Paysage compact
- Sélecteur : `.bottom-nav .nav-ico,.bottom-nav .nav-ico svg`
- Contexte : `@layer components / @media (orientation:landscape)and (max-height:500px)` ; offset 94058.
- Décision : **Conserver — justification fonctionnelle**. Mise en page conditionnelle paysage/faible hauteur ; conserver pour les écrans compatibles.
- Sources candidates : astra-components.css:199

```css
.bottom-nav .nav-ico,.bottom-nav .nav-ico svg{width:19px;height:19px}
```

#### 088 — Interaction tactile
- Sélecteur : `:is(.bottom-nav .nav,.arrow,.astra-settings-choice,.ghost,.primary,.natal-zoom button,.natal-filter-items button,.astra-week-day,.calendar .day):active:not(:disabled)`
- Contexte : `@layer components / @media (hover:none)` ; offset 94147.
- Décision : **Conserver — justification fonctionnelle**. Retour visuel sous media hover:none ; conserver pour les appareils tactiles.
- Sources candidates : astra-components.css:203

```css
:is(.bottom-nav .nav,.arrow,.astra-settings-choice,.ghost,.primary,.natal-zoom button,.natal-filter-items button,.astra-week-day,.calendar .day):active:not(:disabled){filter:brightness(.94)}
```

#### 089 — Mouvements réduits
- Sélecteur : `:is(.primary,.natal-main-action,.astra-personal-save):hover`
- Contexte : `@layer components / @media (prefers-reduced-motion:reduce)` ; offset 94499.
- Décision : **Conserver — justification fonctionnelle**. Respect de la préférence système ; non-observation normale lorsque cette préférence est désactivée.
- Sources candidates : astra-components.css:211

```css
:is(.primary,.natal-main-action,.astra-personal-save):hover{transform:none}
```

#### 090 — Compatibilité navigateur
- Sélecteur : `.astra-disclosure>summary::-webkit-details-marker`
- Contexte : `@layer components` ; offset 95049.
- Décision : **Conserver — justification fonctionnelle**. Pseudo-élément WebKit natif de details ; préserver pour WebView/Safari.
- Sources candidates : astra-components.css:230

```css
.astra-disclosure>summary::-webkit-details-marker{display:none}
```

#### 091 — Focus clavier
- Sélecteur : `.astra-event-list-toggle:focus-visible`
- Contexte : `@layer components` ; offset 98304.
- Décision : **Conserver — justification fonctionnelle**. Indicateur de focus ou géométrie du focus ; conserver pour navigation clavier et états interactifs.
- Sources candidates : astra-components.css:326

```css
.astra-event-list-toggle:focus-visible{outline-offset:-2px}
```

#### 092 — Focus clavier
- Sélecteur : `.astra-event-day-row:focus-visible`
- Contexte : `@layer components` ; offset 99055.
- Décision : **Conserver — justification fonctionnelle**. Indicateur de focus ou géométrie du focus ; conserver pour navigation clavier et états interactifs.
- Sources candidates : astra-components.css:346

```css
.astra-event-day-row:focus-visible{outline-offset:-3px}
```

#### 093 — Réglages à confirmer
- Sélecteur : `.astra-settings-field>.ghost`
- Contexte : `@layer components` ; offset 107116.
- Décision : **Conserver — vérification ciblée**. Style de bouton secondaire dans un champ de réglage ; vérifier la structure exacte avant suppression.
- Sources candidates : astra-components.css:523

```css
.astra-settings-field>.ghost{justify-self:start;min-height:var(--astra-control-min);padding:10px 12px}
```

#### 094 — Focus clavier
- Sélecteur : `.astra-table-scroll:focus-visible`
- Contexte : `@layer components` ; offset 111130.
- Décision : **Conserver — justification fonctionnelle**. Indicateur de focus ou géométrie du focus ; conserver pour navigation clavier et états interactifs.
- Sources candidates : astra-components.css:614

```css
.astra-table-scroll:focus-visible{outline:3px solid var(--astra-focus);outline-offset:-3px}
```

#### 095 — Paysage compact
- Sélecteur : `.astra-personal-dialog,.astra-settings-dialog`
- Contexte : `@layer components / @media (orientation:landscape)and (max-height:500px)` ; offset 111816.
- Décision : **Conserver — justification fonctionnelle**. Mise en page conditionnelle paysage/faible hauteur ; conserver pour les écrans compatibles.
- Sources candidates : astra-components.css:628

```css
.astra-personal-dialog,.astra-settings-dialog{max-height:min(95dvh,calc(100dvh - var(--astra-safe-top)))}
```

#### 096 — Phases et ingresses lunaires
- Sélecteur : `.astra-lunar-additional-ingress`
- Contexte : `@layer features` ; offset 115367.
- Décision : **Conserver — justification fonctionnelle**. Affichage dépendant des phases, changements multiples de signe ou thème sombre ; conserver les variantes.
- Sources candidates : astra-p1-screens.css:58

```css
.astra-lunar-additional-ingress{margin:10px 0 0;color:var(--color-deep-ocean);font-size:.875rem;line-height:1.45}
```

#### 097 — Phases et ingresses lunaires
- Sélecteur : `.astra-lunar-highlight.is-new`
- Contexte : `@layer features` ; offset 115856.
- Décision : **Conserver — justification fonctionnelle**. Affichage dépendant des phases, changements multiples de signe ou thème sombre ; conserver les variantes.
- Sources candidates : astra-p1-screens.css:72

```css
.astra-lunar-highlight.is-new{background:var(--astra-lunar-new-bg);border-color:var(--astra-lunar-new-border)}
```

#### 098 — Phases et ingresses lunaires
- Sélecteur : `.astra-lunar-highlight.is-quarter`
- Contexte : `@layer features` ; offset 115966.
- Décision : **Conserver — justification fonctionnelle**. Affichage dépendant des phases, changements multiples de signe ou thème sombre ; conserver les variantes.
- Sources candidates : astra-p1-screens.css:75

```css
.astra-lunar-highlight.is-quarter{background:var(--astra-lunar-quarter-bg);border-color:var(--astra-lunar-quarter-border)}
```

#### 099 — Phases et ingresses lunaires
- Sélecteur : `.astra-lunar-highlight.is-new .astra-lunar-highlight-icon`
- Contexte : `@layer features` ; offset 116239.
- Décision : **Conserver — justification fonctionnelle**. Affichage dépendant des phases, changements multiples de signe ou thème sombre ; conserver les variantes.
- Sources candidates : astra-p1-screens.css:82

```css
.astra-lunar-highlight.is-new .astra-lunar-highlight-icon{background:var(--astra-lunar-new-icon)}
```

#### 100 — Phases et ingresses lunaires
- Sélecteur : `.astra-lunar-highlight.is-quarter .astra-lunar-highlight-icon`
- Contexte : `@layer features` ; offset 116336.
- Décision : **Conserver — justification fonctionnelle**. Affichage dépendant des phases, changements multiples de signe ou thème sombre ; conserver les variantes.
- Sources candidates : astra-p1-screens.css:83

```css
.astra-lunar-highlight.is-quarter .astra-lunar-highlight-icon{background:var(--astra-lunar-quarter-icon)}
```

#### 101 — Phases et ingresses lunaires
- Sélecteur : `.astra-lunar-highlight.is-new .astra-lunar-highlight-kicker`
- Contexte : `@layer features` ; offset 116709.
- Décision : **Conserver — justification fonctionnelle**. Affichage dépendant des phases, changements multiples de signe ou thème sombre ; conserver les variantes.
- Sources candidates : astra-p1-screens.css:90

```css
.astra-lunar-highlight.is-new .astra-lunar-highlight-kicker{color:var(--astra-lunar-new-caption)}
```

#### 102 — Phases et ingresses lunaires
- Sélecteur : `.astra-lunar-highlight.is-quarter .astra-lunar-highlight-kicker`
- Contexte : `@layer features` ; offset 116806.
- Décision : **Conserver — justification fonctionnelle**. Affichage dépendant des phases, changements multiples de signe ou thème sombre ; conserver les variantes.
- Sources candidates : astra-p1-screens.css:91

```css
.astra-lunar-highlight.is-quarter .astra-lunar-highlight-kicker{color:var(--astra-lunar-quarter-caption)}
```

#### 103 — Phases et ingresses lunaires
- Sélecteur : `:root[data-astra-theme=dark] .astra-day-hero .astra-lunar-arrow,:root[data-astra-theme=dark] .astra-day-hero .astra-lunar-additional-ingress`
- Contexte : `@layer features` ; offset 117220.
- Décision : **Conserver — justification fonctionnelle**. Affichage dépendant des phases, changements multiples de signe ou thème sombre ; conserver les variantes.
- Sources candidates : astra-p1-screens.css:101

```css
:root[data-astra-theme=dark] .astra-day-hero .astra-lunar-arrow,:root[data-astra-theme=dark] .astra-day-hero .astra-lunar-additional-ingress{color:var(--color-cream)}
```

#### 104 — Phases et ingresses lunaires
- Sélecteur : `:root[data-astra-theme=dark] .astra-lunar-highlight`
- Contexte : `@layer features` ; offset 117386.
- Décision : **Conserver — justification fonctionnelle**. Affichage dépendant des phases, changements multiples de signe ou thème sombre ; conserver les variantes.
- Sources candidates : astra-p1-screens.css:105

```css
:root[data-astra-theme=dark] .astra-lunar-highlight{background:var(--astra-lunar-full-bg);border-color:var(--astra-lunar-full-border)}
```

#### 105 — Phases et ingresses lunaires
- Sélecteur : `:root[data-astra-theme=dark] .astra-lunar-highlight.is-new`
- Contexte : `@layer features` ; offset 117520.
- Décision : **Conserver — justification fonctionnelle**. Affichage dépendant des phases, changements multiples de signe ou thème sombre ; conserver les variantes.
- Sources candidates : astra-p1-screens.css:108

```css
:root[data-astra-theme=dark] .astra-lunar-highlight.is-new{background:var(--astra-lunar-new-bg);border-color:var(--astra-lunar-new-border)}
```

#### 106 — Phases et ingresses lunaires
- Sélecteur : `:root[data-astra-theme=dark] .astra-lunar-highlight.is-quarter`
- Contexte : `@layer features` ; offset 117659.
- Décision : **Conserver — justification fonctionnelle**. Affichage dépendant des phases, changements multiples de signe ou thème sombre ; conserver les variantes.
- Sources candidates : astra-p1-screens.css:111

```css
:root[data-astra-theme=dark] .astra-lunar-highlight.is-quarter{background:var(--astra-lunar-quarter-bg);border-color:var(--astra-lunar-quarter-border)}
```

#### 107 — Phases et ingresses lunaires
- Sélecteur : `:root[data-astra-theme=dark] .astra-lunar-highlight :is(.astra-lunar-highlight-title,.astra-lunar-highlight-time,.astra-lunar-highlight-kicker)`
- Contexte : `@layer features` ; offset 117810.
- Décision : **Conserver — justification fonctionnelle**. Affichage dépendant des phases, changements multiples de signe ou thème sombre ; conserver les variantes.
- Sources candidates : astra-p1-screens.css:114

```css
:root[data-astra-theme=dark] .astra-lunar-highlight :is(.astra-lunar-highlight-title,.astra-lunar-highlight-time,.astra-lunar-highlight-kicker){color:var(--color-cream)}
```

#### 108 — Générique à confirmer
- Sélecteur : `:root[data-astra-theme=dark] .astra-month-hero>p:last-child`
- Contexte : `@layer features` ; offset 120683.
- Décision : **Conserver — vérification ciblée**. Classe ou structure historique ; présence exacte dans le DOM et éventuelle surcharge à vérifier avant toute suppression.
- Sources candidates : astra-p1-screens.css:173

```css
:root[data-astra-theme=dark] .astra-month-hero>p:last-child{color:var(--color-cream)}
```

#### 109 — Mouvements réduits
- Sélecteur : `.astra-day-hero,.astra-month-hero`
- Contexte : `@layer features / @media (prefers-reduced-motion:reduce)` ; offset 121659.
- Décision : **Conserver — justification fonctionnelle**. Respect de la préférence système ; non-observation normale lorsque cette préférence est désactivée.
- Sources candidates : astra-p1-screens.css:195

```css
.astra-day-hero,.astra-month-hero{transition:none!important}
```

#### 110 — Focus clavier
- Sélecteur : `.astra-event-feed .event-button:focus-visible`
- Contexte : `@layer features` ; offset 125091.
- Décision : **Conserver — justification fonctionnelle**. Indicateur de focus ou géométrie du focus ; conserver pour navigation clavier et états interactifs.
- Sources candidates : astra-p2-navigation.css:78

```css
.astra-event-feed .event-button:focus-visible{outline-offset:-1px}
```

#### 111 — Diagnostics
- Sélecteur : `.astra-performance-scroll`
- Contexte : `@layer features` ; offset 126743.
- Décision : **Conserver — justification fonctionnelle**. Tableau de mesures et thème sombre du module de diagnostics opt-in (app.js 1818–1826).
- Sources candidates : theme.css:12, astra-p2-navigation.css:113

```css
.astra-performance-scroll{border-color:var(--astra-divider)}
```

#### 112 — Diagnostics
- Sélecteur : `.astra-performance thead th`
- Contexte : `@layer features` ; offset 126803.
- Décision : **Conserver — justification fonctionnelle**. Tableau de mesures et thème sombre du module de diagnostics opt-in (app.js 1818–1826).
- Sources candidates : theme.css:19, astra-p2-navigation.css:114

```css
.astra-performance thead th{background:var(--astra-secondary-surface)}
```

#### 113 — Mouvements réduits
- Sélecteur : `.astra-event-detail`
- Contexte : `@layer features / @media (prefers-reduced-motion:reduce)` ; offset 127516.
- Décision : **Conserver — justification fonctionnelle**. Respect de la préférence système ; non-observation normale lorsque cette préférence est désactivée.
- Sources candidates : calendar-p0.css:39, astra-p2-navigation.css:79, astra-p2-navigation.css:130, astra-p2-navigation.css:134, astra-p3-accessibility.css:113

```css
.astra-event-detail{animation:none!important}
```

#### 114 — Mouvements réduits
- Sélecteur : `.astra-journal-editor .mood,.astra-event-feed .event-button`
- Contexte : `@layer features / @media (prefers-reduced-motion:reduce)` ; offset 127561.
- Décision : **Conserver — justification fonctionnelle**. Respect de la préférence système ; non-observation normale lorsque cette préférence est désactivée.
- Sources candidates : astra-p2-navigation.css:135, astra-p3-accessibility.css:114

```css
.astra-journal-editor .mood,.astra-event-feed .event-button{transition:none!important}
```

#### 115 — Lecture des angles
- Sélecteur : `.astra-angle-reading`
- Contexte : `@layer features` ; offset 127832.
- Décision : **Conserver — justification fonctionnelle**. Géométrie et texte de lecture des angles, rendu app.js 33 ; préserver variantes et structure.
- Sources candidates : astra-p2-navigation.css:148

```css
.astra-angle-reading{display:grid;gap:12px;margin-top:12px;min-width:0;color:var(--astra-ink);font-size:15px;line-height:1.5}
```

#### 116 — Lecture des angles
- Sélecteur : `.astra-angle-reading p`
- Contexte : `@layer features` ; offset 127957.
- Décision : **Conserver — justification fonctionnelle**. Géométrie et texte de lecture des angles, rendu app.js 33 ; préserver variantes et structure.
- Sources candidates : astra-p2-navigation.css:152

```css
.astra-angle-reading p{margin:0;font-size:15px;line-height:1.5;color:var(--astra-ink)}
```

#### 117 — Lecture des angles
- Sélecteur : `.astra-angle-intro strong`
- Contexte : `@layer features` ; offset 128043.
- Décision : **Conserver — justification fonctionnelle**. Géométrie et texte de lecture des angles, rendu app.js 33 ; préserver variantes et structure.
- Sources candidates : astra-p2-navigation.css:153

```css
.astra-angle-intro strong{display:block;font-size:17px;line-height:1.35;color:var(--astra-ink)}
```

#### 118 — Lecture des angles
- Sélecteur : `.astra-angle-intro span`
- Contexte : `@layer features` ; offset 128138.
- Décision : **Conserver — justification fonctionnelle**. Géométrie et texte de lecture des angles, rendu app.js 33 ; préserver variantes et structure.
- Sources candidates : astra-p2-navigation.css:154

```css
.astra-angle-intro span{display:block;margin-top:6px}
```

#### 119 — Lecture des angles
- Sélecteur : `.astra-angle-roles`
- Contexte : `@layer features` ; offset 128191.
- Décision : **Conserver — justification fonctionnelle**. Géométrie et texte de lecture des angles, rendu app.js 33 ; préserver variantes et structure.
- Sources candidates : astra-p2-navigation.css:155, astra-p2-navigation.css:170

```css
.astra-angle-roles{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:0}
```

#### 120 — Lecture des angles
- Sélecteur : `.astra-angle-roles>div`
- Contexte : `@layer features` ; offset 128286.
- Décision : **Conserver — justification fonctionnelle**. Géométrie et texte de lecture des angles, rendu app.js 33 ; préserver variantes et structure.
- Sources candidates : astra-p2-navigation.css:158, astra-p2-navigation.css:173

```css
.astra-angle-roles>div{padding:11px 12px;background:var(--astra-secondary-surface);border:1px solid var(--astra-divider);border-radius:var(--astra-radius-md);min-width:0}
```

#### 121 — Lecture des angles
- Sélecteur : `.astra-angle-roles dt`
- Contexte : `@layer features` ; offset 128456.
- Décision : **Conserver — justification fonctionnelle**. Géométrie et texte de lecture des angles, rendu app.js 33 ; préserver variantes et structure.
- Sources candidates : astra-p2-navigation.css:162

```css
.astra-angle-roles dt{font-size:14px;font-weight:800;color:var(--astra-ink)}
```

#### 122 — Lecture des angles
- Sélecteur : `.astra-angle-roles dd`
- Contexte : `@layer features` ; offset 128532.
- Décision : **Conserver — justification fonctionnelle**. Géométrie et texte de lecture des angles, rendu app.js 33 ; préserver variantes et structure.
- Sources candidates : astra-p2-navigation.css:163

```css
.astra-angle-roles dd{margin:5px 0 0;font-size:14px;color:var(--astra-muted);line-height:1.45}
```

#### 123 — Lecture des angles
- Sélecteur : `.astra-angle-reading .astra-angle-measure`
- Contexte : `@layer features` ; offset 128626.
- Décision : **Conserver — justification fonctionnelle**. Géométrie et texte de lecture des angles, rendu app.js 33 ; préserver variantes et structure.
- Sources candidates : astra-p2-navigation.css:164

```css
.astra-angle-reading .astra-angle-measure{padding-top:10px;border-top:1px solid var(--astra-divider);font-variant-numeric:tabular-nums}
```

#### 124 — Lecture des angles
- Sélecteur : `.astra-angle-roles`
- Contexte : `@layer features / @media (max-width:400px)` ; offset 128785.
- Décision : **Conserver — justification fonctionnelle**. Géométrie et texte de lecture des angles, rendu app.js 33 ; préserver variantes et structure.
- Sources candidates : astra-p2-navigation.css:155, astra-p2-navigation.css:170

```css
.astra-angle-roles{grid-template-columns:1fr}
```

#### 125 — Contraste renforcé
- Sélecteur : `.astra-angle-roles>div`
- Contexte : `@layer features / @media (prefers-contrast:more)` ; offset 128861.
- Décision : **Conserver — justification fonctionnelle**. Préférence système de contraste ; conserver, indépendamment de la couverture courante.
- Sources candidates : astra-p2-navigation.css:158, astra-p2-navigation.css:173

```css
.astra-angle-roles>div{border-width:2px}
```

#### 126 — Événements
- Sélecteur : `.astra-event-detail--compact .astra-event-geometry`
- Contexte : `@layer features` ; offset 129623.
- Décision : **Conserver — justification fonctionnelle**. Présentation conditionnelle des événements du ciel et des fiches de détail ; conserver pour les catégories et données rares.
- Sources candidates : astra-p2-navigation.css:193

```css
.astra-event-detail--compact .astra-event-geometry{display:inline-flex;align-items:center;gap:4px;font-variant-numeric:tabular-nums;font-weight:750;color:var(--astra-brand-strong)}
```

#### 127 — Événements
- Sélecteur : `.astra-event-detail--compact .astra-event-axis`
- Contexte : `@layer features` ; offset 130140.
- Décision : **Conserver — justification fonctionnelle**. Présentation conditionnelle des événements du ciel et des fiches de détail ; conserver pour les catégories et données rares.
- Sources candidates : astra-p2-navigation.css:206, astra-p2-navigation.css:275

```css
.astra-event-detail--compact .astra-event-axis{color:var(--astra-ink);font-size:20px;line-height:1.32;font-weight:800;margin:0 0 9px}
```

#### 128 — Événements
- Sélecteur : `.astra-event-role-list`
- Contexte : `@layer features` ; offset 130387.
- Décision : **Conserver — justification fonctionnelle**. Présentation conditionnelle des événements du ciel et des fiches de détail ; conserver pour les catégories et données rares.
- Sources candidates : astra-p2-navigation.css:214

```css
.astra-event-role-list{margin:16px 0 0;display:grid;gap:0;border-top:1px solid var(--astra-divider)}
```

#### 129 — Événements
- Sélecteur : `.astra-event-role-list>div`
- Contexte : `@layer features` ; offset 130487.
- Décision : **Conserver — justification fonctionnelle**. Présentation conditionnelle des événements du ciel et des fiches de détail ; conserver pour les catégories et données rares.
- Sources candidates : astra-p2-navigation.css:218, astra-p2-navigation.css:274

```css
.astra-event-role-list>div{display:grid;grid-template-columns:minmax(105px,36%) minmax(0,1fr);align-items:baseline;gap:8px;padding:11px 0;border-bottom:1px solid var(--astra-divider);min-width:0;font-size:14px;line-height:1.4}
```

#### 130 — Événements
- Sélecteur : `.astra-event-role-list .astra-event-role-name`
- Contexte : `@layer features` ; offset 130713.
- Décision : **Conserver — justification fonctionnelle**. Présentation conditionnelle des événements du ciel et des fiches de détail ; conserver pour les catégories et données rares.
- Sources candidates : astra-p2-navigation.css:224

```css
.astra-event-role-list .astra-event-role-name{font-weight:800;color:var(--astra-ink);min-width:0}
```

#### 131 — Événements
- Sélecteur : `.astra-event-role-list .astra-event-role-name small`
- Contexte : `@layer features` ; offset 130810.
- Décision : **Conserver — justification fonctionnelle**. Présentation conditionnelle des événements du ciel et des fiches de détail ; conserver pour les catégories et données rares.
- Sources candidates : astra-p2-navigation.css:227

```css
.astra-event-role-list .astra-event-role-name small{display:block;font-size:12px;font-weight:500;color:var(--astra-muted)}
```

#### 132 — Événements
- Sélecteur : `.astra-event-role-list>div>span:last-child`
- Contexte : `@layer features` ; offset 130932.
- Décision : **Conserver — justification fonctionnelle**. Présentation conditionnelle des événements du ciel et des fiches de détail ; conserver pour les catégories et données rares.
- Sources candidates : astra-p2-navigation.css:230

```css
.astra-event-role-list>div>span:last-child{color:var(--astra-muted)}
```

#### 133 — Focus clavier
- Sélecteur : `.astra-event-detail--compact .astra-event-disclosure>summary:focus-visible`
- Contexte : `@layer features` ; offset 131162.
- Décision : **Conserver — justification fonctionnelle**. Indicateur de focus ou géométrie du focus ; conserver pour navigation clavier et états interactifs.
- Sources candidates : astra-p2-navigation.css:235

```css
.astra-event-detail--compact .astra-event-disclosure>summary:focus-visible{outline:3px solid var(--astra-focus);outline-offset:2px;border-radius:var(--astra-radius-sm)}
```

#### 134 — Lecture des angles
- Sélecteur : `.astra-angle-reading .astra-angle-roles`
- Contexte : `@layer features` ; offset 132259.
- Décision : **Conserver — justification fonctionnelle**. Géométrie et texte de lecture des angles, rendu app.js 33 ; préserver variantes et structure.
- Sources candidates : astra-p2-navigation.css:263

```css
.astra-angle-reading .astra-angle-roles{display:block;margin:4px 0;border-top:1px solid var(--astra-divider)}
```

#### 135 — Lecture des angles
- Sélecteur : `.astra-angle-reading .astra-angle-roles>div`
- Contexte : `@layer features` ; offset 132368.
- Décision : **Conserver — justification fonctionnelle**. Géométrie et texte de lecture des angles, rendu app.js 33 ; préserver variantes et structure.
- Sources candidates : astra-p2-navigation.css:266

```css
.astra-angle-reading .astra-angle-roles>div{display:grid;grid-template-columns:minmax(95px,35%) minmax(0,1fr);gap:8px;padding:10px 0;border:0;border-bottom:1px solid var(--astra-divider);border-radius:0;background:none}
```

#### 136 — Lecture des angles
- Sélecteur : `.astra-angle-reading .astra-angle-roles dd`
- Contexte : `@layer features` ; offset 132587.
- Décision : **Conserver — justification fonctionnelle**. Géométrie et texte de lecture des angles, rendu app.js 33 ; préserver variantes et structure.
- Sources candidates : astra-p2-navigation.css:271

```css
.astra-angle-reading .astra-angle-roles dd{margin:0}
```

#### 137 — Événements
- Sélecteur : `.astra-event-role-list>div`
- Contexte : `@layer features / @media (max-width:400px)` ; offset 132663.
- Décision : **Conserver — justification fonctionnelle**. Présentation conditionnelle des événements du ciel et des fiches de détail ; conserver pour les catégories et données rares.
- Sources candidates : astra-p2-navigation.css:218, astra-p2-navigation.css:274

```css
.astra-event-role-list>div{grid-template-columns:minmax(92px,38%) minmax(0,1fr)}
```

#### 138 — Événements
- Sélecteur : `.astra-event-detail--compact .astra-event-axis`
- Contexte : `@layer features / @media (max-width:400px)` ; offset 132743.
- Décision : **Conserver — justification fonctionnelle**. Présentation conditionnelle des événements du ciel et des fiches de détail ; conserver pour les catégories et données rares.
- Sources candidates : astra-p2-navigation.css:206, astra-p2-navigation.css:275

```css
.astra-event-detail--compact .astra-event-axis{font-size:19px}
```

#### 139 — Mouvements réduits
- Sélecteur : `.astra-event-detail--compact *`
- Contexte : `@layer features / @media (prefers-reduced-motion:reduce)` ; offset 132844.
- Décision : **Conserver — justification fonctionnelle**. Respect de la préférence système ; non-observation normale lorsque cette préférence est désactivée.
- Sources candidates : astra-p2-navigation.css:278

```css
.astra-event-detail--compact *{scroll-behavior:auto!important}
```

#### 140 — Focus clavier
- Sélecteur : `:is(.calendar .day,.astra-week-day):focus-visible`
- Contexte : `@layer features` ; offset 133265.
- Décision : **Conserver — justification fonctionnelle**. Indicateur de focus ou géométrie du focus ; conserver pour navigation clavier et états interactifs.
- Sources candidates : astra-p3-accessibility.css:16

```css
:is(.calendar .day,.astra-week-day):focus-visible{outline:3px solid var(--astra-calendar-focus);outline-offset:-3px!important;z-index:3}
```

#### 141 — Événements
- Sélecteur : `:root[data-astra-theme=dark] .astra-event-detail .astra-event-facts :is(span,strong)`
- Contexte : `@layer features` ; offset 135732.
- Décision : **Conserver — justification fonctionnelle**. Présentation conditionnelle des événements du ciel et des fiches de détail ; conserver pour les catégories et données rares.
- Sources candidates : astra-p3-accessibility.css:78

```css
:root[data-astra-theme=dark] .astra-event-detail .astra-event-facts :is(span,strong){color:var(--astra-ink)}
```

#### 142 — Contraste renforcé
- Sélecteur : `.calendar.astra-calendar-board .astra-calendar-date-week .day.selected`
- Contexte : `@layer features / @media (prefers-contrast:more)` ; offset 136671.
- Décision : **Conserver — justification fonctionnelle**. Préférence système de contraste ; conserver, indépendamment de la couverture courante.
- Sources candidates : astra-p3-accessibility.css:104

```css
.calendar.astra-calendar-board .astra-calendar-date-week .day.selected{outline-width:4px}
```

#### 143 — Contraste renforcé
- Sélecteur : `:is(button,input,select,textarea,summary):focus-visible`
- Contexte : `@layer features / @media (prefers-contrast:more)` ; offset 136760.
- Décision : **Conserver — justification fonctionnelle**. Préférence système de contraste ; conserver, indépendamment de la couverture courante.
- Sources candidates : astra-p3-accessibility.css:107

```css
:is(button,input,select,textarea,summary):focus-visible{outline-width:4px!important}
```

#### 144 — Mouvements réduits
- Sélecteur : `.astra-event-detail`
- Contexte : `@layer features / @media (prefers-reduced-motion:reduce)` ; offset 136922.
- Décision : **Conserver — justification fonctionnelle**. Respect de la préférence système ; non-observation normale lorsque cette préférence est désactivée.
- Sources candidates : calendar-p0.css:39, astra-p2-navigation.css:79, astra-p2-navigation.css:130, astra-p2-navigation.css:134, astra-p3-accessibility.css:113

```css
.astra-event-detail{animation:none!important}
```

#### 145 — Mouvements réduits
- Sélecteur : `.astra-journal-editor .mood,.astra-event-feed .event-button`
- Contexte : `@layer features / @media (prefers-reduced-motion:reduce)` ; offset 136967.
- Décision : **Conserver — justification fonctionnelle**. Respect de la préférence système ; non-observation normale lorsque cette préférence est désactivée.
- Sources candidates : astra-p2-navigation.css:135, astra-p3-accessibility.css:114

```css
.astra-journal-editor .mood,.astra-event-feed .event-button{transition:none!important}
```

#### 146 — Événements
- Sélecteur : `:root[data-astra-theme=dark] .event-button.event-kind-moon-new`
- Contexte : `@layer features` ; offset 137321.
- Décision : **Conserver — justification fonctionnelle**. Présentation conditionnelle des événements du ciel et des fiches de détail ; conserver pour les catégories et données rares.
- Sources candidates : astra-p3-accessibility.css:131

```css
:root[data-astra-theme=dark] .event-button.event-kind-moon-new{--event-label-ink:var(--astra-event-label-moon-new)}
```

#### 147 — Événements
- Sélecteur : `:root[data-astra-theme=dark] .event-button.event-kind-moon-full`
- Contexte : `@layer features` ; offset 137436.
- Décision : **Conserver — justification fonctionnelle**. Présentation conditionnelle des événements du ciel et des fiches de détail ; conserver pour les catégories et données rares.
- Sources candidates : astra-p3-accessibility.css:132

```css
:root[data-astra-theme=dark] .event-button.event-kind-moon-full{--event-label-ink:var(--astra-event-label-moon-full)}
```

#### 148 — Événements
- Sélecteur : `:root[data-astra-theme=dark] .event-button.event-kind-moon-quarter`
- Contexte : `@layer features` ; offset 137553.
- Décision : **Conserver — justification fonctionnelle**. Présentation conditionnelle des événements du ciel et des fiches de détail ; conserver pour les catégories et données rares.
- Sources candidates : astra-p3-accessibility.css:133

```css
:root[data-astra-theme=dark] .event-button.event-kind-moon-quarter{--event-label-ink:var(--astra-event-label-moon-quarter)}
```

#### 149 — Événements
- Sélecteur : `:root[data-astra-theme=dark] .event-button.event-kind-station`
- Contexte : `@layer features` ; offset 137676.
- Décision : **Conserver — justification fonctionnelle**. Présentation conditionnelle des événements du ciel et des fiches de détail ; conserver pour les catégories et données rares.
- Sources candidates : astra-p3-accessibility.css:134

```css
:root[data-astra-theme=dark] .event-button.event-kind-station{--event-label-ink:var(--astra-event-label-station)}
```

#### 150 — Focus clavier
- Sélecteur : `:root[data-astra-theme=dark] .natal-context-sheet .natal-related button:focus-visible,:root[data-astra-theme=dark] .natal-context-sheet .natal-context-bar button:focus-visible`
- Contexte : `@layer features` ; offset 138989.
- Décision : **Conserver — justification fonctionnelle**. Indicateur de focus ou géométrie du focus ; conserver pour navigation clavier et états interactifs.
- Sources candidates : astra-p3-accessibility.css:166

```css
:root[data-astra-theme=dark] .natal-context-sheet .natal-related button:focus-visible,:root[data-astra-theme=dark] .natal-context-sheet .natal-context-bar button:focus-visible{outline-color:var(--astra-focus)}
```

#### 151 — Survol
- Sélecteur : `.calendar.astra-calendar-board .astra-calendar-date-week .astra-adjacent-day:hover`
- Contexte : `@layer features` ; offset 141749.
- Décision : **Conserver — justification fonctionnelle**. Retour visuel lors du survol ; conserver pour souris/pointeur.
- Sources candidates : astra-p4-calendar.css:60

```css
.calendar.astra-calendar-board .astra-calendar-date-week .astra-adjacent-day:hover{color:var(--astra-calendar-ink);background:transparent;text-decoration:underline;opacity:1}
```

#### 152 — Focus clavier
- Sélecteur : `.calendar.astra-calendar-board .astra-calendar-date-week .astra-adjacent-day:focus-visible`
- Contexte : `@layer features` ; offset 141923.
- Décision : **Conserver — justification fonctionnelle**. Indicateur de focus ou géométrie du focus ; conserver pour navigation clavier et états interactifs.
- Sources candidates : astra-p4-calendar.css:64

```css
.calendar.astra-calendar-board .astra-calendar-date-week .astra-adjacent-day:focus-visible{outline:3px solid var(--astra-focus);outline-offset:-3px;border-radius:var(--astra-radius-sm);opacity:1}
```

#### 153 — SVG roue double
- Sélecteur : `.natal-double-wheel.wheel-modern .natal-planet-hit .wheel-true-anchor`
- Contexte : `@layer features` ; offset 151498.
- Décision : **Conserver — justification fonctionnelle**. Ancrages et traits des glyphes ; conserver pour les configurations de roue et collisions.
- Sources candidates : wheel-ui.css:182, astra-p4-wheel.css:130

```css
.natal-double-wheel.wheel-modern .natal-planet-hit .wheel-true-anchor{fill:var(--color-teal)}
```

#### 154 — Contraste renforcé
- Sélecteur : `.natal-wheel.wheel-modern .wheel-zodiac-sector`
- Contexte : `@layer features / @media (prefers-contrast:more)` ; offset 152116.
- Décision : **Conserver — justification fonctionnelle**. Préférence système de contraste ; conserver, indépendamment de la couverture courante.
- Sources candidates : wheel-ui.css:17, astra-p4-wheel.css:14, astra-p4-wheel.css:142

```css
.natal-wheel.wheel-modern .wheel-zodiac-sector{stroke-width:1.35}
```

#### 155 — Contraste renforcé
- Sélecteur : `.natal-wheel.wheel-modern .wheel-house-divider.is-major`
- Contexte : `@layer features / @media (prefers-contrast:more)` ; offset 152181.
- Décision : **Conserver — justification fonctionnelle**. Préférence système de contraste ; conserver, indépendamment de la couverture courante.
- Sources candidates : wheel-ui.css:55, astra-p4-wheel.css:35, astra-p4-wheel.css:143

```css
.natal-wheel.wheel-modern .wheel-house-divider.is-major{stroke-width:2.8}
```

#### 156 — Contraste renforcé
- Sélecteur : `.natal-wheel.wheel-modern :is(.natal-planet-hit,.natal-transit-hit):focus-visible .wheel-planet-disc`
- Contexte : `@layer features / @media (prefers-contrast:more)` ; offset 152254.
- Décision : **Conserver — justification fonctionnelle**. Préférence système de contraste ; conserver, indépendamment de la couverture courante.
- Sources candidates : astra-p4-wheel.css:67, astra-p4-wheel.css:144

```css
.natal-wheel.wheel-modern :is(.natal-planet-hit,.natal-transit-hit):focus-visible .wheel-planet-disc{stroke-width:4}
```

#### 157 — Générique à confirmer
- Sélecteur : `.action-label small`
- Contexte : `@layer features` ; offset 154734.
- Décision : **Conserver — vérification ciblée**. Classe ou structure historique ; présence exacte dans le DOM et éventuelle surcharge à vérifier avant toute suppression.
- Sources candidates : astra-natal.css:58

```css
.action-label small{font-size:12px;line-height:1.45;font-weight:450;opacity:.86;white-space:normal}
```

#### 158 — Générique à confirmer
- Sélecteur : `.natal-main-action .action-label small`
- Contexte : `@layer features` ; offset 154833.
- Décision : **Conserver — vérification ciblée**. Classe ou structure historique ; présence exacte dans le DOM et éventuelle surcharge à vérifier avant toute suppression.
- Sources candidates : astra-natal.css:59

```css
.natal-main-action .action-label small{color:#dae6ee}
```

#### 159 — Générique à confirmer
- Sélecteur : `.natal-secondary-action .action-label small`
- Contexte : `@layer features` ; offset 154886.
- Décision : **Conserver — vérification ciblée**. Classe ou structure historique ; présence exacte dans le DOM et éventuelle surcharge à vérifier avant toute suppression.
- Sources candidates : astra-natal.css:60

```css
.natal-secondary-action .action-label small{color:#506474}
```

#### 160 — Sélection et lecture natale
- Sélecteur : `.natal-summary-sign[data-element=air]`
- Contexte : `@layer features` ; offset 157757.
- Décision : **Conserver — justification fonctionnelle**. Styles de sélection, résumé ou comparaison natale ; garder, vérifier les chemins de rendu rares.
- Sources candidates : astra-natal.css:133

```css
.natal-summary-sign[data-element=air]{--pillar-element:var(--astra-zodiac-air)}
```

#### 161 — Sélection et lecture natale
- Sélecteur : `.natal-summary-sign[data-element=water]`
- Contexte : `@layer features` ; offset 157836.
- Décision : **Conserver — justification fonctionnelle**. Styles de sélection, résumé ou comparaison natale ; garder, vérifier les chemins de rendu rares.
- Sources candidates : astra-natal.css:134

```css
.natal-summary-sign[data-element=water]{--pillar-element:var(--astra-zodiac-water)}
```

#### 162 — Générique à confirmer
- Sélecteur : `.natal-explore>.tiny`
- Contexte : `@layer features` ; offset 163623.
- Décision : **Conserver — vérification ciblée**. Classe ou structure historique ; présence exacte dans le DOM et éventuelle surcharge à vérifier avant toute suppression.
- Sources candidates : astra-natal.css:292

```css
.natal-explore>.tiny{margin:10px 0;color:var(--astra-muted)}
```

#### 163 — Sélection et lecture natale
- Sélecteur : `:is(.natal-home,.natal-explore) :is(.natal-glossary)`
- Contexte : `@layer features` ; offset 163821.
- Décision : **Conserver — justification fonctionnelle**. Styles de sélection, résumé ou comparaison natale ; garder, vérifier les chemins de rendu rares.
- Sources candidates : astra-natal.css:300

```css
:is(.natal-home,.natal-explore) :is(.natal-glossary){background:var(--astra-secondary-surface);border:1px solid var(--astra-divider);border-radius:var(--astra-radius-lg);color:var(--astra-ink);overflow:hidden}
```

#### 164 — Sélection et lecture natale
- Sélecteur : `:is(.natal-home,.natal-explore) .natal-glossary :is(dt,dd,.tiny)`
- Contexte : `@layer features` ; offset 164030.
- Décision : **Conserver — justification fonctionnelle**. Styles de sélection, résumé ou comparaison natale ; garder, vérifier les chemins de rendu rares.
- Sources candidates : astra-natal.css:306

```css
:is(.natal-home,.natal-explore) .natal-glossary :is(dt,dd,.tiny){color:var(--astra-ink)}
```

#### 165 — Sélection et lecture natale
- Sélecteur : `:is(.natal-home,.natal-explore) .natal-glossary dd`
- Contexte : `@layer features` ; offset 164118.
- Décision : **Conserver — justification fonctionnelle**. Styles de sélection, résumé ou comparaison natale ; garder, vérifier les chemins de rendu rares.
- Sources candidates : astra-natal.css:307

```css
:is(.natal-home,.natal-explore) .natal-glossary dd{color:var(--astra-muted)}
```

#### 166 — Générique à confirmer
- Sélecteur : `.natal-home :is(.natal-positions,.natal-aspects)`
- Contexte : `@layer features` ; offset 164194.
- Décision : **Conserver — vérification ciblée**. Classe ou structure historique ; présence exacte dans le DOM et éventuelle surcharge à vérifier avant toute suppression.
- Sources candidates : astra-natal.css:308

```css
.natal-home :is(.natal-positions,.natal-aspects){min-width:0}
```

#### 167 — Mouvements réduits
- Sélecteur : `.natal-explore :is(button,summary)`
- Contexte : `@layer features / @media (prefers-reduced-motion:reduce)` ; offset 164756.
- Décision : **Conserver — justification fonctionnelle**. Respect de la préférence système ; non-observation normale lorsque cette préférence est désactivée.
- Sources candidates : astra-natal.css:326

```css
.natal-explore :is(button,summary){transition:none!important}
```

#### 168 — Sélection et lecture natale
- Sélecteur : `.natal-home>.natal-glossary`
- Contexte : `@layer features` ; offset 166072.
- Décision : **Conserver — justification fonctionnelle**. Styles de sélection, résumé ou comparaison natale ; garder, vérifier les chemins de rendu rares.
- Sources candidates : astra-natal.css:381

```css
.natal-home>.natal-glossary{margin-top:14px;margin-bottom:14px}
```

#### 169 — Focus clavier
- Sélecteur : `.natal-position-table .natal-position:focus-visible`
- Contexte : `@layer features` ; offset 168065.
- Décision : **Conserver — justification fonctionnelle**. Indicateur de focus ou géométrie du focus ; conserver pour navigation clavier et états interactifs.
- Sources candidates : astra-natal.css:440

```css
.natal-position-table .natal-position:focus-visible{outline-offset:-3px}
```

#### 170 — Sélection et lecture natale
- Sélecteur : `.natal-position-table.has-degrees.has-houses`
- Contexte : `@layer features / @container (max-width:330px)` ; offset 170451.
- Décision : **Conserver — justification fonctionnelle**. Styles de sélection, résumé ou comparaison natale ; garder, vérifier les chemins de rendu rares.
- Sources candidates : astra-natal.css:413, astra-natal.css:474

```css
.natal-position-table.has-degrees.has-houses{--position-columns:82px 12px 82px 56px 56px }
```

#### 171 — Erreur et état vide
- Sélecteur : `.natal-distribution-empty`
- Contexte : `@layer features` ; offset 174052.
- Décision : **Conserver — justification fonctionnelle**. Affichage de secours, erreur ou absence de données ; conserver pour les états non exercés.
- Sources candidates : astra-natal.css:549

```css
.natal-distribution-empty{font-size:.875rem;color:var(--astra-muted);margin:8px 0}
```

#### 172 — Paysage compact
- Sélecteur : `:root`
- Contexte : `@layer layout / @media (max-height:500px)and (orientation:landscape)` ; offset 177417.
- Décision : **Conserver — justification fonctionnelle**. Mise en page conditionnelle paysage/faible hauteur ; conserver pour les écrans compatibles.
- Sources candidates : astra-tokens.css:4, astra-tokens.css:284, astra-p2-navigation.css:4, astra-layout.css:81

```css
:root{--astra-nav-clearance:86px}
```

## Conditions avant fusion

- [x] Tests fonctionnels locaux et audit structurel.
- [x] Équivalence pixel à pixel avant/après sur 103 captures.
- [x] Écart B2 expliqué.
- [x] Inventaire et décision conservatrice pour 172 règles.
- [ ] Répétabilité stricte de la référence ou dérogation documentée, après identification de la cause.
- [ ] CI de la PR.
- [ ] Vérification physique Android (Galaxy A15, navigation, clavier, thèmes, roue et calendrier).

Les règles génériques incertaines sont conservées hors du périmètre B1–B5. Ne pas les supprimer sans preuve supplémentaire. La PR peut être ouverte pour revue avec ces réserves explicites ; aucune fusion automatique.