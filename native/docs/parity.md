# Native Android parity tracker

This tracks the Flutter/Rust branch against the PWA behavior in [current-state-reference.md](../../docs/current-state-reference.md). It records implemented behavior and remaining work; emulator and automated checks are evidence, not a substitute for a physical-phone microphone test.

| Area | Native state | Remaining parity work |
| --- | --- | --- |
| Treble Practice | Six lesson pools, notation, mic/touch answers, listen-and-imitate, corrections, saved assisted/independent progress, 8/10 invitation. | First-run tutorial, illustrated note guide, richer interval and staff-position teaching, session restart. |
| Rush | 60-second rounds in all five modes, speed/difficulty, queued front-prompt scoring, moving staff notes/chords, pauses, result exits/replay, mode-isolated high scores. | Validate timing, focus, and mic scoring on a physical phone; compare higher-difficulty preview layout with the PWA. |
| Other modes | Bass, Sharps, Flats, and Chords pools match the PWA; clefs, accidentals, chord stacks, touch answers, listen playback, and isolated Practice progress work. | Teach these modes progressively and validate accidental glyphs, chord voicing, and bass pitch on real hardware. |
| Input fallback | Note buttons for each mode and a one-octave piano with mode-spelled black keys for single-note modes. Chords have touch answers only. | Test piano reach and screen-reader labels on varied phone sizes. |
| Microphone | Android permission allow/deny/recovery, Rust PCM pitch detection, steady-note matching, stop on background, live guidance. | Physical voice/instrument/room/headphone matrix; Rush guidance polish; advanced Mic Lab recording and decoding. |
| Persistence | Android-private Practice lesson/mode progress, mode/input settings, Rush speed/difficulty, and mode-specific high scores. | Explicit browser-progress export/import and corruption/restart coverage for imported data. |
| Accessibility | Staff semantics, labelled controls, result action focus. | Audit TalkBack, hardware keyboard/Escape, larger text, and result focus order on devices. |
| Delivery | Reproducible Rust/Flutter debug APK in GitHub CI, Android ARM64 and x64 libraries. | Release signing, real-device validation, package/distribution decision. The PWA remains the complete product until parity is verified. |

Next implementation order: browser progress migration; first-run teaching and a richer note guide; Mic Lab recording; physical-device/accessibility validation and release preparation. Keep each slice independently testable and do not label the native app feature complete until the table is closed.
