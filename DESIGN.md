# ASTRA — Design contract

## Purpose

ASTRA is a **readable personal sky atlas**, not a trading terminal, a decorative horoscope landing page, or an instrument cockpit. It has three primary jobs: quickly understand the natal chart, inspect a selected transit/date, and write a reflection in the local journal.

Design for **read → explore → inspect → configure**, not for exposing every option immediately.

### Daily widget hierarchy — Flo-inspired, ASTRA-specific

Do not reproduce Flo's visual branding. The reusable information architecture is a seven-day context strip, one dominant status widget, a concise row of accessible secondary information, and a vertically scannable details feed. Flo's published design study found a scrollable main screen more discoverable than hidden short-lived stories.

**Ce jour** must present:
1. Select a day from a week strip (Monday–Sunday) with previous/next week accessible.
2. One hero showing **Moon zodiac sign and an illustrated lunar-phase icon calculated at local noon**, with timezone and zodiac system stated; when the Moon changes sign or a lunar quarter occurs that civil day, display the precise chronological events and explain any sign difference. Do not imply a noon Moon sign applies all day. The count of exact events is secondary; never invent a prediction or sentiment.
3. A compact horizontally scrollable set of **secondary** widgets: Sun sign at that same local noon, journal entry, natal chart. Do not duplicate the Moon phase in a second card.
4. A vertically scrolling feed of first events with explicit expansion for the remainder.
5. Secondary in-orb aspects under an accessible disclosure. Ensure no user loses the underlying astronomical data.

Calendar rule: each day can show one moon-phase indicator at local noon. Keep New Moon and Full Moon visually distinct, with a textual legend and an accessible day label. The **solar sign** uses a continuous multi-day background across adjacent day cells, like the visual continuity of a Google Calendar all-day event but without an extra row. Color encodes its classical element (Fire, Earth, Air, Water), while the sign name and symbol remain explicit. An ingress date is split 50/50 visually, not as an exact duration claim. Personal multi-day events use separate lanes. The removed “Aspect solaire exact” marker must not be reintroduced.

Use exactly four bottom tabs in this order: **Ce jour / Ce mois / Calendrier / Mon ciel**. Ce jour and Ce mois are anchored to the current date and month upon entering their tabs; Calendar remains the historical/future browser. Filters chosen in Calendar must not affect daily/monthly summaries. The journal is a secondary route accessible from day and month widgets and without a natal profile. Keep the **bottom navigation persistent** while the viewport is not occupied by the keyboard. Use text labels, not just planet symbols. At 320 CSS pixels, only the secondary widget rail scrolls horizontally; the page must never scroll sideways.

This document complements `README.md` and protects P0–P2 usability improvements. The approved P0 Retro Pop Celestial palette is implemented through semantic tokens; astronomical calculations, personal data storage, navigation and technologies remain unchanged.

## Art direction — *Atlas céleste*

- Visual character: a precise, calm astronomical plate with contemporary sans-serif interface typography. The **chart and its clearly named signs are the primary visual objects**.
- Visual reference established in Preview 0.7.0: ink-blue masthead, cool paper, accessible deep-blue actions and warm brass accent. The chart remains on neutral white. A surface is not better because it has a gradient, border, shadow and rounded corners simultaneously.
- Geometry and data must be the strongest visual contrast. Decorative texture must never compete with a degree, planet, house, legend, or selection state.
- Identity should come from the zodiac geometry, not from stock cosmic illustrations, meaningless sparkles, multiple competing gradients, or animated backgrounds.
- The sky wheel is interactive data visualization: **physical longitude markers never move**; visual glyph spacing may move with visible leader lines.

### Existing working colors (reference, not a redesign mandate)

| Role | Color | Intended use |
| --- | --- | --- |
| Ink | `#172637` | Primary text |
| Muted ink | `#526273` | Secondary readable text |
| Night | `#172b3e` | Masthead, high-priority actions |
| Deep sea | `#315e79` | Navigation and natal emphasis |
| Paper | `#f6f7f7` | Page canvas |
| Border | `#d8e1e6` | Section boundaries |
| Transit copper | `#be714e` | **Transit** positions/legend only |
| Warm brass | `#e9bb71` | Rare chart and masthead accents |

Create semantic CSS custom properties before changing shared colors. Do not multiply hard-coded near-duplicate purples.

### Typography, scale and spacing

- Body/interface: platform sans-serif across the app. Reserve Georgia for existing SVG zodiac glyphs where needed; do not use serif for headings or interface controls.
- The chart, selected reading, and primary action have clear visual priority. No repeated all-caps section kickers on every screen.
- Aim for body text at least 15px and **critical controls/labels at least 12–14px**, with 1.4–1.6 line-height. Raise existing 10–11px explanatory copy when layout permits; never rely on tiny type to fit more information.
- Use a consistent spacing rhythm (4/8/12/16/24/32px). Avoid one-off padding to compensate for poor hierarchy.
- Interactive hit targets: at least 44×44 CSS px where feasible. Distinguish focus, active, selected and disabled without relying on color alone.
- Keep numerical columns aligned with `font-variant-numeric: tabular-nums`.

## Information hierarchy by screen

**Mon ciel / Overview**
1. One page heading, then **Soleil / Lune / Ascendant** as three plainly named signs, not unexplained zodiac glyphs.
2. Primary **Comprendre mon thème** action must be visible without scrolling on a 360 × 780 CSS-pixel screen.
3. Clean, interactive natal wheel with one short instruction for selecting a planet.
4. Secondary **Comparer deux dates** action below the wheel, with everyday-language explanation.
5. A discreet **Réglages** access; technical parameters are **not** displayed on the home screen.

**Explorer**
1. One visible section at a time: Planètes, Maisons, Aspects.
2. A scan-friendly list of concrete values.
3. Selection opens one contextual reading panel with datum, traditional symbolism, and reflection clearly separated.
4. Interactive wheel and aspect matrix are disclosures **on demand**, not duplicates of the main view.

**Comparer**
1. Date and hour with explicitly named timezone.
2. Double wheel with consistent natal violet / transit blue meanings.
3. Contacts at the selected instant; clarify that contacts are not predicted events.
4. Select a planet to narrow the reading, rather than displaying every relationship at once.

**Réglages**
Only here: tropical/sidereal, Placidus/equal/whole, detail level, zoom, exports, profile editing and JSON backup. Never present all settings as the default reading experience.

## Non-negotiable factual and privacy constraints

- Do not invent ASC, MC, houses or definitive lunar positions when the user's birth hour is absent.
- The engine calculates astronomical positions; astrological associations are **traditional symbolic interpretations**, not validated causal predictions. Label these separately.
- Do not fabricate precision: historical timezone ambiguity, sidereal approximation and high-latitude house fallback remain visible where relevant.
- Respect the existing `astra-public-v1` storage and JSON import/export contract; no user data in source files, prompts, CI fixtures or remote analytics.
- No unexplained external font service or runtime dependency. Working offline after city lookup must remain possible.
- Do not copy layouts/assets from gallery references or silently install third-party design skills or executable tooling.

## Interaction principles

- Motion should make the transition *understandable* (selection, panel opening, zoom) rather than showcase animation skills. Prefer 120–200ms interruptible transitions for opacity/transform. No continuous spins or parallax in the natal wheel.
- Respect `prefers-reduced-motion: reduce`; all functions must remain available without motion.
- Every control must have a real action, an intelligible label, and complete states: default, hover if available, focus, pressed/selected, disabled, loading, empty and error as applicable.
- Close context via Escape and explicit Close, restore focus when reasonable. Ensure keyboard access to planet/house glyph groups and chart controls.
- Avoid re-rendering input fields in a way that loses user edits, caret position or scroll without necessity.
- For zoom, explain the scrollable viewport and retain the user's reading center.
- Keep responsive page layout within 320px without horizontal **page** overflow; chart/matrix may scroll inside clearly labelled regions.

## Anti-slop criteria

Reject a change when it introduces any of the following without a specific ASTRA user benefit:
- More decorative cards instead of clearer sections.
- Another pastel gradient, sparkles or glow around the wheel.
- A generic marketing headline, unnecessary tagline or repetitive kicker.
- Inconsistent icon styles or symbolic glyphs used without understandable names.
- Ultra-small copy, duplicated controls, hidden labels, gratuitous motion or heavy external packages.
- A demonstration that looks excellent at one desktop width but fails at 320–393px.

## Design QA — Definition of done

1. Review real states on Today, Calendar, Journal, Mon ciel, Explorer, Compare and Settings, including empty and unknown-birth-hour states.
2. Capture and inspect browser screenshots at **320, 393, 768 and 1280 CSS px** before declaring visual polish complete. Check focus and touch hit areas, including modal/zoom/exports.
3. Run `npm test`, `node --check app/src/main/assets/app.js` and `python tests/ui-smoke.py` in the project CI setup. The browser smoke test uses a mock astronomical engine; it is **not** independent astronomical verification.
4. Run Android debug build/lint in CI and, before a public release, manually validate physical Android scrolling, text scaling and TalkBack.
5. Note the before/after problem addressed, measurable effect (e.g. overflow/contrast/clicks) and any untested area. Never mark a visual review as complete solely because code compiles.

## Prioritized follow-up backlog

| Workstream | Priority | Smallest useful next step |
| --- | --- | --- |
| Readability pass | P0 | Audit 10–11px labels and explanatory text on all four bottom tabs, then normalize without adding global visual noise |
| Surface simplification | P0 | Remove redundant gradients/shadows/borders in the chart-first area; keep clear dividers and one strong selection state |
| Component consistency | P1 | Consolidate colors, radii, spacing and focus treatment into tokens; stop appending one-off CSS overrides |
| Interaction polish | P1 | Validate chart selection, focus restoration, loading/empty cases, smooth-but-interruptible transitions |
| Real-device verification | P1 | Android physical device, TalkBack, text zoom and narrow-screen portrait |
| Optional motion | P2 | Only after the previous checks, add a restrained context-panel transition and test reduced-motion behavior |

## External reference roles — choose, do not stack

**Design direction:** [Impeccable](https://impeccable.style/designing/), [Anthropic Frontend Design](https://github.com/anthropics/skills/tree/main/skills/frontend-design), [Taste Skill](https://github.com/Leonxlnx/taste-skill), [UIZZE](https://uizze.com/).

**Audit and consistency:** [Vercel Web Interface Guidelines](https://vercel.com/design/guidelines), [Hallmark](https://github.com/Nutlope/hallmark), [UI/UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill).

**Fine interaction:** [Emil Design Engineering](https://github.com/emilkowalski/skills), [Make Interfaces Feel Better](https://github.com/jakubkrehel/make-interfaces-feel-better), [60fps.design](https://60fps.design/).

**Inspiration only, not application UI specifications:** [Land-book](https://land-book.com/), [Recent Design](https://recent.design/), [Landdding](https://landdding.com/), [Godly](https://godly.website/), [Font In Logo](https://www.fontinlogo.com/). [MotionSites](https://motionsites.ai/) focuses heavily on animated websites and prompt-driven landing pages; [Studio MotionSites](https://studio.motionsites.ai/) is a separate builder service. [Stageshow](https://github.com/benjitaylor/skills/tree/main/stageshow) is for staged product presentations, not ASTRA's real chart UX.

**Decision principle:** use one coherent visual design brief, Vercel-style functional QA, and a single polish reference. Stacking all ten competing skills will not reliably produce better product design.

**Current layered implementation:** legacy `style.css`, `atlas-ui.css`, `theme.css` and feature styles remain for layout/compatibility. The approved P0 foundation loads `astra-tokens.css` then `astra-components.css` last. New shared visual decisions belong in those two files; gradually remove obsolete legacy declarations rather than adding more parallel overrides. Preserve the natal wheel geometry and continuous solar backdrop.

Last updated: 2026-11-20.

### P1 — Application aux quatre écrans

- **Ce jour** : date/semainier, Lune à midi, chronologie lunaire indépendante, journal, événements calculés, aspects en cours repliés.
- **Ce mois** : navigation, résumé, phases majeures avant métriques secondaires, premiers événements, lien calendrier.
- **Calendrier** : grille lisible, ruban solaire **en fond continu hebdomadaire** (jamais une carte par jour), éléments zodiacaux, partage visuel 50/50, arrondis aux changements de signe, événements personnels multi-jours au-dessus.
- **Mon ciel** : résumé Soleil/Lune/Ascendant, une action principale d’exploration, onglets d’analyse et roue accessible, outils avancés secondaires.

Styles P1 dans `astra-p1-screens.css`, après `astra-components.css`. Ne modifier ni la géométrie des roues, ni les éphémérides pour appliquer cette identité.

### P2 — Navigation et sous-écrans

Les sous-écrans adoptent les tokens Retro Pop Celestial via `astra-p2-navigation.css`. Le journal reste une route secondaire, non un cinquième onglet. Une fiche d'événement astrologique s'ouvre inline après la liste et n'est pas transformée en modale ; les éditeurs d'événements personnels restent des dialogues natifs avec `aria-labelledby`. Les réglages et contrôles avancés sont progressifs. Les états hover, focus, selected, invalid, dark et reduced-motion doivent tous fonctionner sans déplacer la géométrie de la roue ou casser le ruban solaire.

### P3 — Contrastes, focus, lecture assistée et responsive

Le dernier niveau CSS `astra-p3-accessibility.css` corrige les conflits de cascade des précédentes étapes, sans transformer les rubans de fond continus en cartes. Contrastes WCAG AA de texte ordinaire (minimum 4,5:1) vérifiés sur les couples de fond/encre prioritaires, états focus visibles au clavier, libellés complets des sept jours, régions et groupes déjà sémantisés conservés, modales natives avec annulation Escape, réduction des animations et media queries mobiles/paysage. Les contrôles et les annonces doivent rester vérifiables sur Android avec TalkBack et clavier physique.

### P4 — Habillage des roues et parité des exports

Les mêmes secteurs rétro pop servent aux roues natales, sans heure et doubles : les secteurs portent la classe `zodiac-element-{fire,earth,air,water}`. `astra-p4-wheel.css` ne modifie aucune coordonnée, orbite, position de marqueur ou ordre des anneaux. Disques des planètes natales, transits, survol, sélection et focus ont des contrastes dédiés. L'export SVG embarque la même palette comme CSS autonome et le PNG en découle. Contrôler visuellement sur 320–393 px, vue complète, thème sombre et export, sans encombrer le centre de la roue.
