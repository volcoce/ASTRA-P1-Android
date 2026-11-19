#!/usr/bin/env python3
"""Tests statiques hors SDK Android : limites P1 et intégrité des assets."""
from pathlib import Path
import re
import sys

base = Path(__file__).resolve().parents[1]
manifest = (base / 'app/src/main/AndroidManifest.xml').read_text('utf8')
gradle = (base / 'app/build.gradle.kts').read_text('utf8')
java = (base / 'app/src/main/java/org/astra/mobile/p0/MainActivity.java').read_text('utf8')
app = (base / 'app/src/main/assets/app.js').read_text('utf8')
data = (base / 'app/src/main/assets/data.js').read_text('utf8')
html = (base / 'app/src/main/assets/index.html').read_text('utf8')
p1 = (base / 'app/src/main/assets/p1-data.js').read_text('utf8')

checks = {
    'Android 17 API 37': 'compileSdk = 37' in gradle and 'targetSdk = 37' in gradle,
    'ApplicationId distinct ancienne appli': 'org.astra.mobile.p0' in gradle,
    'Sans accès Internet': 'android.permission.INTERNET' not in manifest,
    'Sauvegarde Android OS désactivée': 'android:allowBackup="false"' in manifest and 'android:dataExtractionRules' in manifest and (base / 'app/src/main/res/xml/data_extraction_rules.xml').exists(),
    'HTTPS virtuel WebViewAssetLoader': 'new WebViewAssetLoader.Builder()' in java and 'appassets.androidplatform.net' in java,
    'Blocage accès file://': 'setAllowFileAccess(false)' in java and 'setAllowUniversalAccessFromFileURLs(false)' in java,
    'Blocage accès content://': 'setAllowContentAccess(false)' in java,
    'Blocage ressources externes': 'return forbidden()' in java and 'shouldInterceptRequest' in java,
    'Javascript sans pont natif': 'addJavascriptInterface(' not in java,
    'Mode production sans WebView debugging': 'setWebContentsDebuggingEnabled(debugging)' in java,
    'Sauvegarde format hérité': "format:'astra-offline-v1'" in app,
    'Restauration format hérité': "x.format!=='astra-offline-v1'" in app,
    'Mode tropical et sidéral': '"tropical"' in data and '"sidereal"' in data,
    'Données de transits embarquées': len(data) > 500_000 and data.startswith('window.ASTRA_FORECASTS='),
    'Écran HTML': '<main id="app"' in html,
    'Données P1 chargées': 'window.ASTRA_P1=' in p1 and '<script src="p1-data.js"></script>' in html,
    'Fenêtres et stations': '"windows"' in p1 and '"station"' in p1,
    'Filtres calendaires': 'filterSelector()' in app and 'id="eventFilter"' in app,
    'Version P1': 'versionCode = 301' in gradle and 'versionName = "0.3.0-p1"' in gradle,
}
for name, ok in checks.items():
    print(f"{'OK' if ok else 'ÉCHEC'} — {name}")
if not all(checks.values()):
    sys.exit(1)
print(f"{len(checks)} contrôles statiques réussis. Aucun test de compilation/appareil effectué.")
