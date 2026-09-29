# ClefHanger native Android prototype

This directory is an isolated Flutter/Rust port on `feat/flutter-rust-port`. The static PWA in the repository root remains the current implementation. CI publishes a debug APK artifact for review; there is no production Android release or store listing.

## What runs

- Flutter draws portrait treble Practice and a 60-second Rush with a moving staff note, speed/difficulty controls, pause/resume, result exits, and separate high scores.
- Rust owns the six treble lesson note pools, prompt selection, note frequencies, PCM16 pitch detection, and pitch-class matching.
- Android captures mono microphone PCM, requests `RECORD_AUDIO`, offers a direct app-settings route after denial, plays a reference tone, stops capture when backgrounded, and stores lesson progress in app-private preferences.
- Practice offers Listen and imitate, visible microphone guidance, a note-button fallback, optional staff help, corrections, saved assisted/independent progress and settings, an 8-of-10 next-lesson invitation, and a copyable Mic Lab report with no audio samples.
- Android ARM64 and emulator x64 Rust libraries are cross-compiled into the debug APK.

Scope gaps: bass/accidental/chord modes, piano input, audio recording in Mic Lab, and migration of progress from browser LocalStorage are not ported. See the [parity tracker](docs/parity.md) and [recorded emulator validation](docs/validation.md). The existing PWA remains available. Emulator startup and touch behavior do not establish physical microphone accuracy; test on Android phones before treating the native audio path as reliable. iOS has not been configured.

## Build and run

Prerequisites: Flutter 3.41+, Rust with `aarch64-linux-android` and `x86_64-linux-android` targets, `cargo-ndk`, Android SDK and NDK, and an Android phone/emulator. Set `ANDROID_HOME` to the SDK; the preparation script finds the newest installed NDK, or you can set `ANDROID_NDK_HOME` explicitly. The project has no Dart dependencies beyond `ffi` and test/lint packages.

```bash
export PATH="<flutter-sdk>/bin:$PATH"
native/tools/prepare_android.sh
cd native/app
flutter pub get
flutter analyze
flutter test
flutter build apk --debug --target-platform android-arm64,android-x64
flutter run
```

The script regenerates missing Flutter Android scaffold files, then packages the Rust `.so` files. `flutter test` skips the actual FFI test unless the host library is built:

```bash
cargo build --release --manifest-path native/core/Cargo.toml
cd native/app
CLEFHANGER_NATIVE_TESTS=1 \
LD_LIBRARY_PATH="$PWD/../core/target/release" flutter test
```

Run the platform-free Rust checks from the repository root:

```bash
cargo fmt --manifest-path native/core/Cargo.toml --check
cargo clippy --manifest-path native/core/Cargo.toml --all-targets -- -D warnings
cargo test --manifest-path native/core/Cargo.toml
```

## Native boundaries

`core/src/lib.rs` mirrors the PWA's natural treble note pool, lesson filters, 50-cent/any-octave matching, and first strong autocorrelation peak. `app/lib/native_core.dart` is the explicit C ABI wrapper. `app/lib/practice_session.dart` owns the learning loop and progress semantics. `app/lib/main.dart` owns Flutter presentation. `MainActivity.kt` is the only Android microphone, tone, and persistence adapter. The app uses package `com.simiono.clefhanger` and is a separate install from the PWA.

Browser progress stays in the browser origin; Android app-private storage has no access to it. A deliberate export/import path would be needed before replacing the PWA for existing players. Keep the port behavior aligned with `docs/current-state-reference.md` when extending it, then use real phone evidence to decide whether a full migration is warranted.
