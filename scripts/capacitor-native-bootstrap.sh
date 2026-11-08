#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

log() { printf '\n[%s] %s\n' "VibeNest Capacitor" "$*"; }
fail() { printf '\n[ERROR] %s\n' "$*" >&2; exit 1; }

command -v node >/dev/null 2>&1 || fail "Node.js is required."
command -v npm >/dev/null 2>&1 || fail "npm is required."

NODE_MAJOR="$(node -p 'Number(process.versions.node.split(".")[0])')"
[ "$NODE_MAJOR" -ge 20 ] || fail "Node.js 20+ is required; found $(node --version)."

[ -f package-lock.json ] || fail "package-lock.json is missing; refusing an unpinned dependency install."
[ -f capacitor.config.ts ] || fail "capacitor.config.ts is missing."

log "Installing the exact dependency graph from package-lock.json"
npm ci

for package in @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios; do
  npm ls "$package" --depth=0 >/dev/null 2>&1 || fail "Missing required package: $package"
done

add_platform() {
  local platform="$1"
  local marker="$2"
  if [ -e "$marker" ]; then
    log "$platform native project already exists; keeping it."
  else
    log "Generating $platform native project"
    npx cap add "$platform"
  fi
}

OS_NAME="$(uname -s)"
case "$OS_NAME" in
  Darwin)
    add_platform android android
    add_platform ios ios
    ;;
  Linux)
    add_platform android android
    log "Linux cannot run Xcode or sign/build an iOS app. iOS project generation is deferred to a macOS host."
    ;;
  *)
    fail "Unsupported operating system: $OS_NAME"
    ;;
esac

log "Synchronizing generated/available native projects"
npx cap sync

log "Running host-appropriate Capacitor diagnostics"
if [ "$OS_NAME" = "Darwin" ]; then
  # macOS has Xcode, so require the complete Android + iOS diagnostic to pass.
  npx cap doctor
elif [ "$OS_NAME" = "Linux" ]; then
  # Linux is the Android build host; Capacitor Doctor exits non-zero only because
  # Xcode is unavailable. Require Android health and reject every other diagnostic error.
  doctor_status=0
  doctor_output="$(npx cap doctor 2>&1)" || doctor_status=$?
  printf '%s\n' "$doctor_output"

  printf '%s\n' "$doctor_output" | grep -Fq "Android looking great" \
    || fail "Capacitor Android diagnostics did not report success."

  unexpected_errors="$(printf '%s\n' "$doctor_output" | grep -F '[error]' | grep -Fv 'Xcode is not installed' || true)"
  [ -z "$unexpected_errors" ] || fail "Unexpected Capacitor diagnostic error(s): $unexpected_errors"

  if [ "$doctor_status" -ne 0 ]; then
    log "Ignoring the expected missing-Xcode diagnostic on Linux; Android diagnostics passed."
  fi
fi

[ -f android/settings.gradle ] || [ -f android/settings.gradle.kts ] || fail "Android Gradle settings file was not generated."
[ -f android/app/build.gradle ] || [ -f android/app/build.gradle.kts ] || fail "Android app Gradle file was not generated."
[ -x android/gradlew ] || fail "Android Gradle wrapper is missing or not executable."

if [ "$OS_NAME" = "Darwin" ]; then
  [ -f ios/App/App.xcodeproj/project.pbxproj ] || fail "iOS Xcode project was not generated."
  if command -v xcodebuild >/dev/null 2>&1; then
    xcodebuild -list -project ios/App/App.xcodeproj
  else
    log "Xcode is not installed; iOS project exists but cannot be validated/built here."
  fi
fi

log "Native bootstrap checks passed for this host."
log "Review git status, then commit package.json, package-lock.json, android/ and (on macOS) ios/."
