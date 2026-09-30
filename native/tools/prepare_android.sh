#!/usr/bin/env bash
set -euo pipefail

native_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$native_root/tools/toolchain.env"
actual_flutter=$(flutter --version --machine | python3 -c 'import json,sys; print(json.load(sys.stdin)["frameworkVersion"])')
[[ "$actual_flutter" == "$FLUTTER_VERSION" ]] || { echo "Expected Flutter $FLUTTER_VERSION" >&2; exit 1; }
[[ "$(rustc --version | cut -d ' ' -f 2)" == "$RUST_VERSION" ]] || { echo "Expected Rust $RUST_VERSION" >&2; exit 1; }
export ANDROID_NDK_HOME="${ANDROID_NDK_HOME:-${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}/ndk/$NDK_VERSION}"
[[ "$(sed -n 's/^Pkg.Revision *= *//p' "$ANDROID_NDK_HOME/source.properties")" == "$NDK_VERSION" ]] || { echo "Expected NDK $NDK_VERSION" >&2; exit 1; }

# Flutter's generated wrapper is ignored. Recreate only missing scaffold files.
lock_copy=$(mktemp)
cp "$native_root/app/pubspec.lock" "$lock_copy"
trap 'cp "$lock_copy" "$native_root/app/pubspec.lock"; rm -f "$lock_copy"' EXIT
(cd "$native_root/app" && flutter create --org com.simiono --project-name clefhanger --platforms=android --no-pub .)
cp "$lock_copy" "$native_root/app/pubspec.lock"
(cd "$native_root/app" && flutter pub get --enforce-lockfile)
(cd "$native_root/core" && RUSTFLAGS="${RUSTFLAGS:-} -C link-arg=-Wl,-z,max-page-size=16384" cargo ndk -t arm64-v8a -t x86_64 \
  -o "$native_root/app/android/app/src/main/jniLibs" build --release --locked --offline)

echo 'Android scaffold and Rust FFI libraries prepared.'
