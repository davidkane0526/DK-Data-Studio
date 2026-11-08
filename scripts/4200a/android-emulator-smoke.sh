#!/usr/bin/env bash
# Called as one process by android-emulator-runner: it executes each YAML
# script line in a separate shell, so a multi-line if/fi is not safe there.
set -euo pipefail
apk=android4200a/app/build/outputs/apk/debug/app-debug.apk
test -s "$apk"
mkdir -p artifacts/4200a-android-emulator
adb install -r "$apk"
adb logcat -c
adb shell am start -W -n studio.dk.fspro.preview.debug/studio.dk.fspro.preview.MainActivity
# Native PageFinished/JS initialization is genuinely asynchronous.
# Readiness must be emitted by MainActivity after verifying all read-only UI.
ready=0
for attempt in $(seq 1 16); do
  adb logcat -d -s 'DKTS-FSPro-Ready:V' '*:S' > android4200a/emulator-ready.log
  if grep -q 'FS_PRO_READY' android4200a/emulator-ready.log; then
    ready=1
    break
  fi
  sleep 2
done
adb logcat -d -s 'DKTS-FSPro-WebJS:V' '*:S' > artifacts/4200a-android-emulator/webjs-errors.log
adb exec-out screencap -p > artifacts/4200a-android-emulator/launch-portrait.png
test -s artifacts/4200a-android-emulator/launch-portrait.png
cat android4200a/emulator-ready.log
if [[ "$ready" != 1 ]]; then
  echo 'ERROR: Android app failed actual FS_PRO_READY JS/read-only safety contract.'
  cat artifacts/4200a-android-emulator/webjs-errors.log
  adb logcat -d -t 180 | grep -E 'DKTS-FSPro|chromium|WebView' | tail -n 70 || true
  exit 1
fi
echo 'Android UI, keypad and read-only contract verified.'
