# Native prototype validation

Observed 2026-09-29 on local Android 15 API 35 `sdk_gphone64_x86_64` emulator, 540 × 960 physical pixels (360 × 640 logical). These observations apply to the Flutter/Rust feature branch only.

| Check | Result |
| --- | --- |
| Rust unit tests and strict Clippy | Passed: lesson pools, prompt seed, any-octave matching, low B2 PCM detection, silence, and FFI pointer guard. |
| Flutter static analysis and tests | Passed: practice outcomes, assistance, hints-off behavior, progress normalization, short portrait controls, fallback buttons, JSON mic report, and host Rust FFI integration. |
| APK build | Debug APK built with `libclefhanger_core.so` for ARM64 and x86_64. ARM64 loading has not been tested on a phone. |
| First screen | [Emulator screenshot](practice-emulator.png): staff, Start, Hear, microphone guidance, Check mic, and note-button fallback visible together. |
| Touch practice | [Note-button screenshot](note-buttons-emulator.png): Start presents a Rust-selected staff note; C/D/E fallback answers remain reachable. A correct D4 answer showed `Recent: 1/1 on your own`; the count survived force-stop and relaunch. |
| Mic permission and lifecycle | Runtime permission dialog appeared. After Allow, Android showed its green microphone indicator and Flutter showed live detected-pitch guidance. Stop mic removed the indicator and restored Check mic. A permission-dialog pause bug was found and fixed during this pass. |
| Mic Lab | [Expanded emulator screenshot](mic-lab-emulator.png) shows live level and pitch fields. Copy mic report invoked Android's clipboard overlay with structured JSON. The report contains no raw audio. |
| Error log | No `AndroidRuntime` or Flutter errors appeared in the checked launch/touch/permission flows. |

The emulator was launched with `-no-audio`, so audible tone quality and actual microphone accuracy were **not** validated. An emulator-reported A3 confirmed the PCM path reaches Rust and returns a pitch, but it is not evidence that a real singer will be classified correctly. The unit test feeds a synthetic B2 waveform through the real Rust library. Real phone testing must cover low voices, normal rooms, reference-tone bleed, permission denial/retry, background/resume, and earphones.

The native app stores progress in Android app-private preferences. Browser LocalStorage cannot move into the app automatically. No import/export migration is present. Rush, bass/accidental/chord modes, piano input, advanced Mic Lab recording, and iOS remain separate follow-up work. The PWA is unchanged and remains the available complete product.
