#!/usr/bin/env bash
# One command for the whole loop: verify -> build -> gate -> stage.
#
# Replaces the five steps that were being run by hand for every change. Stops at
# the first failure, and never stages an APK that is not the dev package.
#
#   bash scripts/ship.sh           verify, build, stage
#   bash scripts/ship.sh --fast    skip tests (assets-only changes)
#   bash scripts/ship.sh --verify  checks only, no build
set -u

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SDK="${LOCALAPPDATA}/Android/Sdk"
DEV_PACKAGE="com.spall.peggybank.dev"
PROD_PACKAGE="com.spall.peggybank"
APK="$REPO/android/app/build/outputs/apk/release/app-release.apk"
TARGETS=("/c/Users/spall/OneDrive/PeggyBankDev.apk" "/c/Users/spall/OneDrive/Desktop/PeggyBankDev.apk")

FAST=0; VERIFY_ONLY=0
for a in "$@"; do
  [ "$a" = "--fast" ] && FAST=1
  [ "$a" = "--verify" ] && VERIFY_ONLY=1
done

die() { echo ""; echo "STOP: $1"; echo ""; exit 1; }

cd "$REPO"

echo ""; echo "[1] Typecheck"
ERRS=$(npx tsc --noEmit 2>&1 | grep -c "error TS" || true)
[ "$ERRS" -gt 0 ] && { npx tsc --noEmit 2>&1 | grep "error TS" | head -15; die "$ERRS type error(s)."; }
echo "    clean"

if [ "$FAST" -eq 0 ]; then
  echo "[2] Tests"
  npx jest --silent > /tmp/ship-jest.log 2>&1 || { tail -30 /tmp/ship-jest.log; die "Tests failed."; }
  grep "^Tests:" /tmp/ship-jest.log | sed 's/^/    /'
else
  echo "[2] Tests - skipped (--fast)"
fi

[ "$VERIFY_ONLY" -eq 1 ] && { echo ""; echo "Verify only. Nothing built."; echo ""; exit 0; }

echo "[3] Building release APK (arm64)"
export ANDROID_HOME="$SDK" ANDROID_SDK_ROOT="$SDK" APP_VARIANT=dev
export NODE_OPTIONS=--max-old-space-size=6144
( cd "$REPO/android" && ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a --no-daemon ) \
  > /tmp/ship-build.log 2>&1
grep -q "BUILD SUCCESSFUL" /tmp/ship-build.log || {
  grep -A6 "What went wrong" /tmp/ship-build.log | head -12
  die "Gradle build failed. Full log: /tmp/ship-build.log"
}
echo "    BUILD SUCCESSFUL"

echo "[4] Checking which app this is"
[ -f "$APK" ] || die "No APK was produced."
BT=$(ls "$SDK/build-tools" | sort -V | tail -1)
PKG=$("$SDK/build-tools/$BT/aapt.exe" dump badging "$APK" 2>/dev/null | sed -n "s/^package: name='\([^']*\)'.*/\1/p")
echo "    applicationId = $PKG"
[ "$PKG" = "$PROD_PACKAGE" ] && die "This is the PRODUCTION app. Refusing to stage it."
[ "$PKG" = "$DEV_PACKAGE" ] || die "Expected $DEV_PACKAGE, got '$PKG'. Refusing to stage."

echo "[5] Copying where the phone can reach it"
for t in "${TARGETS[@]}"; do
  cp "$APK" "$t" 2>/dev/null && echo "    $t" || echo "    could not write $t"
done

MB=$(( $(stat -c%s "$APK") / 1048576 ))
echo ""; echo "Done. ${MB} MB, $PKG. Install it from OneDrive."; echo ""
