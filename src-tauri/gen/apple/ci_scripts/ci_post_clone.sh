#!/bin/sh
# Xcode Cloud: https://developer.apple.com/documentation/xcode/writing-custom-build-scripts
# Installs Rust (pinned by rust-toolchain.toml) and Node deps before any xcodebuild.
set -eu

: "${CI_PRIMARY_REPOSITORY_PATH:?CI_PRIMARY_REPOSITORY_PATH is unset}"

cd "$CI_PRIMARY_REPOSITORY_PATH"

export PATH="${HOME}/.cargo/bin:${PATH:-}"

if ! command -v rustup >/dev/null 2>&1; then
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --no-modify-path
  export PATH="${HOME}/.cargo/bin:${PATH:-}"
fi

CHANNEL=$(sed -n 's/^channel = "\([^"]*\)".*/\1/p' rust-toolchain.toml | head -n 1)
if [ -z "$CHANNEL" ]; then
  echo "Could not read channel from rust-toolchain.toml" >&2
  exit 1
fi

rustup toolchain install "$CHANNEL" --profile minimal
rustup default "$CHANNEL"
rustup target add aarch64-apple-ios

if ! command -v node >/dev/null 2>&1; then
  if command -v brew >/dev/null 2>&1; then
    brew install node
  else
    echo "Node.js is required for npm ci. Install Node 20+ (e.g. brew install node)." >&2
    exit 1
  fi
fi

npm ci
