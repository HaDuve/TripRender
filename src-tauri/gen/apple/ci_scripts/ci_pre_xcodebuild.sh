#!/bin/sh
# Strategy A: full `tauri ios build` so `write_options` runs before Xcode's Build Rust Code phase.
# Omit when the workflow action does not compile the app (e.g. test-without-building).
# See: https://v2.tauri.app/distribute/app-store/
set -eu

: "${CI_PRIMARY_REPOSITORY_PATH:?CI_PRIMARY_REPOSITORY_PATH is unset}"

cd "$CI_PRIMARY_REPOSITORY_PATH"
export PATH="${HOME}/.cargo/bin:${PATH:-}"

case "${CI_XCODEBUILD_ACTION:-}" in
  test-without-building)
    echo "ci_pre_xcodebuild: skipping Strategy A (test-without-building)"
    exit 0
    ;;
esac

npm run build:web
# CI=1 breaks `tauri ios build --ci` (CLI expects --ci true/false). Xcode Cloud may set CI=1.
env -u CI node scripts/tauri-with-rustup.js ios build --export-method app-store-connect --ci
