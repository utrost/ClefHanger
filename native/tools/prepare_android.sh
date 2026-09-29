#!/usr/bin/env bash
set -euo pipefail

native_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ -z "${ANDROID_NDK_HOME:-}" ]]; then
  sdk_root="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
  : "${sdk_root:?Set ANDROID_HOME or ANDROID_NDK_HOME to the installed Android SDK/NDK}"
  shopt -s nullglob
  ndks=("$sdk_root"/ndk/*)
  shopt -u nullglob
  if (( ${#ndks[@]} == 0 )); then
    echo "No Android NDK found under $sdk_root/ndk" >&2
    exit 1
  fi
  ANDROID_NDK_HOME="$(printf '%s\n' "${ndks[@]}" | sort -V | tail -n 1)"
  export ANDROID_NDK_HOME
fi

# Flutter's generated wrapper is ignored. Recreate only missing scaffold files.
(cd "$native_root/app" && flutter create --org com.simiono --project-name clefhanger --platforms=android --no-pub .)
(cd "$native_root/core" && cargo ndk -t arm64-v8a -t x86_64 \
  -o "$native_root/app/android/app/src/main/jniLibs" build --release --offline)

echo 'Android scaffold and Rust FFI libraries prepared.'
