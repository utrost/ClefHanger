#!/usr/bin/env bash
set -euo pipefail

native_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
: "${ANDROID_NDK_HOME:?Set ANDROID_NDK_HOME to the installed Android NDK directory}"

# Flutter's generated wrapper is ignored. Recreate only missing scaffold files.
(cd "$native_root/app" && flutter create --org com.simiono --project-name clefhanger --platforms=android --no-pub .)
(cd "$native_root/core" && cargo ndk -t arm64-v8a -t x86_64 \
  -o "$native_root/app/android/app/src/main/jniLibs" build --release --offline)

echo 'Android scaffold and Rust FFI libraries prepared.'
