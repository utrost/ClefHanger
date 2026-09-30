# Google-independent Android distribution

ClefHanger uses Flutter, Dart FFI, a dependency-free Rust music core, and Android framework microphone/audio/file APIs. It has no Google Play services, Firebase, ads, analytics, account, or app-operated cloud service. The same source can serve Google Play and F-Droid. Android build repositories named `google()` provide build tooling and AndroidX; they do not install Google Play services in the app.

## Implemented build path

- `native/tools/toolchain.env` pins Flutter, Rust, cargo-ndk and Android NDK. The preparation script preserves `pubspec.lock` and enforces the dependency resolution. Gradle/Android plugin versions are tracked in the Android project.
- The Gradle release gate rejects resolved Google Play services and Firebase Maven dependencies, before shrinking can hide their classes.
- `tools/verify_store_build.py` checks APK/AAB native architectures, release AOT libraries, 16 KB ELF segment alignment and Google SDK references in DEX. APK checks also reject debugging and internet permission and verify 16 KB ZIP alignment. This is a targeted packaging check, not a complete F-Droid dependency/licence audit.
- Release artifacts require no network permission. Microphone PCM and diagnostic captures stay in memory; saved progress/settings remain local. The app opts out of Android automatic cloud backup. PWA progress imports use the Android file picker. Copied diagnostic reports contain measurements, not PCM audio.
- `.github/workflows/native-store.yml` builds unsigned APK/AAB candidates. These are review artifacts, not installable releases or store submissions. The separate prerelease workflow signs an AOT release APK with the existing test key so current testers can continue updating in place.

## Build locally

Install the versions in `native/tools/toolchain.env`, the two Rust Android targets, JDK 17, Android platform/build-tools 36 and the pinned NDK. Set `ANDROID_HOME`, put Flutter and Cargo on PATH, then run:

```sh
native/tools/prepare_android.sh
cd native/app
flutter build apk --release --target-platform android-arm64,android-x64 --build-number 100001
flutter build appbundle --release --target-platform android-arm64,android-x64 --build-number 100001
cd ../..
python3 tools/verify_store_build.py native/app/build/app/outputs/flutter-apk/app-release.apk --build-tools "$ANDROID_HOME/build-tools/36.0.0"
python3 tools/verify_store_build.py native/app/build/app/outputs/bundle/release/app-release.aab
```

With no signing variables, release output is unsigned. For a chosen production identity, supply all four variables: `CLEFHANGER_RELEASE_KEYSTORE` (absolute path), `CLEFHANGER_RELEASE_STORE_PASSWORD`, `CLEFHANGER_RELEASE_KEY_ALIAS`, and `CLEFHANGER_RELEASE_KEY_PASSWORD`. A partial configuration fails; release builds never silently use the debug key. Keep secrets outside Git and logs.

## Before actual store submission

1. The public source is licensed AGPL-3.0-or-later. The app bundles that licence and exposes Flutter/package notices in Settings. Complete the third-party licence and asset-provenance review before submission. The metadata in `fdroid/` stays disabled until its tagged source build is validated.
2. Choose production signing ownership before uploading to Play. The current persistent test certificate remains a test identity. F-Droid normally signs its own builds; cross-store updates require compatible signing certificates, possibly F-Droid verified reproducible upstream builds. Keeping the same package ID alone does not enable cross-store updates.
3. Validate a tagged source recipe with fdroidserver, including toolchain provisioning and the full dependency/source/binary scans. The metadata draft is not a validated build recipe. Do not add scanner exemptions merely to hide a failure.
4. Test on a device without Google Play services and on a real 16 KB Android device; check audio, permission recovery, lifecycle, persistence and imports. Packaging alignment checks do not establish runtime compatibility.
5. Prepare Play Console developer verification, privacy-policy hosting, Data Safety/content-rating declarations, store copy and screenshots. Confirm current Play submission requirements at upload time. Submit an AAB signed with the chosen upload key.

Removing Google libraries does not disable device-side Play Protect or guarantee removal of its unfamiliar-developer warning.

References: [F-Droid inclusion](https://f-droid.org/docs/Inclusion_Policy/), [F-Droid submissions](https://f-droid.org/docs/Submitting_to_F-Droid_Quick_Start_Guide/), [reproducible builds](https://f-droid.org/docs/Reproducible_Builds/), [Android 16 KB pages](https://developer.android.com/guide/practices/page-sizes).

## Local evaluation — 2026-09-30

All 44 Flutter tests passed with real host Rust FFI enabled; analysis and both Python packaging regression tests passed. The release APK (about 35.5 MB) and AAB (about 33.9 MB) passed Google SDK reference, native ABI, AOT and 16 KB ELF checks. The APK passed the no-debugging/no-internet-permission and 16 KB ZIP checks. A deliberately partial production-signing configuration was rejected.

A release-mode APK signed with the existing test key installed over the emulator's existing ClefHanger installation without uninstalling. On Android API 35, with `com.google.android.gms` disabled, Practice opened, the reference playback action worked, microphone permission/capture started, and live pitch appeared on the staff. The prior Google Play services state was restored after the test. This is evidence for framework-based audio/launch behavior, not physical-speaker accuracy, a clean AOSP-device qualification, or full F-Droid/Play acceptance.
