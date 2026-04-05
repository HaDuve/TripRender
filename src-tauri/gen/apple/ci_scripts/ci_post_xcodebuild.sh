#!/bin/sh
# Optional: upload IPA to App Store Connect when API key env vars are set in the workflow.
# https://v2.tauri.app/distribute/app-store/
set -eu

: "${CI_PRIMARY_REPOSITORY_PATH:?CI_PRIMARY_REPOSITORY_PATH is unset}"

IPA="$CI_PRIMARY_REPOSITORY_PATH/src-tauri/gen/apple/build/arm64/TripRender.ipa"

if [ ! -f "$IPA" ]; then
  echo "ci_post_xcodebuild: no IPA at $IPA (skip upload)"
  exit 0
fi

if [ -z "${APPLE_API_KEY_ID:-}" ] || [ -z "${APPLE_API_ISSUER:-}" ]; then
  echo "ci_post_xcodebuild: APPLE_API_KEY_ID / APPLE_API_ISSUER not set (skip altool upload)"
  exit 0
fi

xcrun altool --upload-app --type ios --file "$IPA" --apiKey "$APPLE_API_KEY_ID" --apiIssuer "$APPLE_API_ISSUER"
