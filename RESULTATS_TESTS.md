# ASTRA P0 — résultats des vérifications

- 15 contrôles statiques des sources Android — RÉUSSIS.
- Syntaxe JavaScript `app.js` et `data.js` (Node 22) — VALIDE.
- Données de transits — 2 modes, 36 mois chacun, 8 413 contacts, 2 192 jours cumulés — COHÉRENT.
- Projet Android ciblant l’API 37 — SOURCES CONFIGURÉES, COMPILATION NON EXÉCUTÉE.
- Build APK, signature v2/v3, instrumentation WebView, compatibilité et tests sur appareil Android 17 — NON EXÉCUTÉS.
- Test Chromium de l’interface — NON EXÉCUTABLE : navigateur bloqué par la politique de l’environnement (ERR_BLOCKED_BY_ADMINISTRATOR).

L'environnement ne dispose ni du SDK Android, ni de Gradle, et ne peut télécharger leurs distributions. Il ne serait pas exact de présenter cette archive comme un nouvel APK installable.
