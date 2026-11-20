# ASTRA coding-agent working rules

Read [DESIGN.md](DESIGN.md) before making any UX or visual changes. The design contract is project-specific and takes precedence over generic design templates. Read [README.md](README.md) for feature behavior and history.

- ASTRA is a functional chart-reading application, not a landing-page demo. Do not replace the existing user flows or remove functionality during cosmetic work.
- Respect P0/P1 information hierarchy: summary + quiet wheel on Mon ciel; separate Explorer, Comparer and Réglages destinations.
- Preserve astronomical longitudes, data precision behavior, birth-hour uncertainty, local storage format `astra-public-v1`, journal and graphic exports.
- Use existing HTML, vanilla JavaScript and CSS. Do not introduce a framework, remote analytics, icon kit, animation library or external fonts without a specific technical requirement.
- Avoid generic decorative gradients, needless cards, tiny interface text, fake precision and too many simultaneous controls.
- Keep accessibility and responsive behavior first-class: 320px viewport, keyboard/escape/focus, touch, reduced motion and labelled states.
- Test logic with `npm test`, syntax with `node --check app/src/main/assets/app.js`, browser interactions with `python tests/ui-smoke.py` in CI, and Android build/lint when relevant. Never claim physical device testing without performing it.
- For UX changes, describe the user problem, altered files, before/after effect, evidence and remaining limitations.
- External design-skill repositories are references; never execute their install scripts or copy their dependencies automatically.
