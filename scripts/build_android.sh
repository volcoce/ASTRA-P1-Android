#!/usr/bin/env bash
set -euo pipefail
python3 "$(dirname "$0")/inflate_assets.py"
cd "$(dirname "$0")/.."
if ! command -v gradle >/dev/null 2>&1; then
  echo 'ERREUR : Gradle introuvable. Installer Gradle 9.3.1 ou utiliser GitHub Actions.' >&2
  exit 2
fi
if [[ -z "${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}" ]]; then
  echo 'ERREUR : ANDROID_HOME/ANDROID_SDK_ROOT introuvable. Installer SDK Android 37.' >&2
  exit 2
fi
./scripts/run_tests.sh
gradle --no-daemon --stacktrace :app:assembleDebug :app:lintDebug
APK='app/build/outputs/apk/debug/app-debug.apk'
if [[ ! -s "$APK" ]]; then echo "ERREUR : APK absent après compilation." >&2;exit 3;fi
sha256sum "$APK"
echo "APK compilé : $APK"
SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT}}"
if [[ -x "$SDK/build-tools/37.0.0/apksigner" ]]; then
  "$SDK/build-tools/37.0.0/apksigner" verify --verbose "$APK"
fi
