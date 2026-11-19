#!/usr/bin/env bash
set -euo pipefail
python3 "$(dirname "$0")/inflate_assets.py"
cd "$(dirname "$0")/.."
python3 scripts/verify_sources.py
node --check app/src/main/assets/app.js
node --check app/src/main/assets/data.js
node --check app/src/main/assets/p1-data.js
node tests/test_assets.cjs
node tests/test_p1.cjs
node tests/test_ui_mock.cjs
node tests/test_integrity_extended.cjs
printf '\nTests statiques et intégrité OK.\n'
if command -v chromium >/dev/null 2>&1 && python3 -c 'import playwright' 2>/dev/null; then
  python3 scripts/test_browser_inline.py --chromium "$(command -v chromium)"
else
  printf 'Tests Chromium ignorés : installer chromium et python3 -m pip install playwright.\n'
fi
