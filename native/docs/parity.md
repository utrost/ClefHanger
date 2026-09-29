# Native Android parity tracker

This tracks the Flutter/Rust branch against the PWA behavior in [current-state-reference.md](../../docs/current-state-reference.md). It records implemented behavior and remaining work; emulator and automated checks are evidence, not a substitute for a physical-phone microphone test.

| Area | Native state | Remaining parity work |
| --- | --- | --- |
| Treble Practice | Six lesson pools, notation, mic/touch answers, listen-and-imitate, corrections, saved assisted/independent progress, 8/10 invitation. | First-run tutorial, illustrated note guide, richer interval and staff-position teaching, session restart. |
| Treble Rush | 60-second rounds, speed/difficulty, queued front-note scoring, moving staff note, pauses, result exits/replay, separate high scores. | Validate timing, focus, and mic scoring on a physical phone; compare higher-difficulty preview layout with the PWA. |
| Other modes | No native Bass, Sharps, Flats, or Chords selection yet. | Port note/chord catalogs, clefs, accidentals, staff stacks, mode-specific answer and score rules, and mode-isolated progress/high scores. |
| Input fallback | Large natural-note buttons for beginner treble. | One-octave piano and mode-specific sharp/flat/chord buttons. Chords must never offer single-note mic scoring. |
| Microphone | Android permission allow/deny/recovery, Rust PCM pitch detection, steady-note matching, stop on background, live guidance. | Physical voice/instrument/room/headphone matrix; Rush guidance polish; advanced Mic Lab recording and decoding. |
| Persistence | Android-private Practice progress and settings; Rush speed/difficulty and high scores. | Explicit browser-progress export/import, mode progress, corruption/restart coverage for imported data. |
| Accessibility | Staff semantics, labelled controls, result action focus. | Audit TalkBack, hardware keyboard/Escape, larger text, and result focus order on devices. |
| Delivery | Reproducible Rust/Flutter debug APK in GitHub CI, Android ARM64 and x64 libraries. | Release signing, real-device validation, package/distribution decision. The PWA remains the complete product until parity is verified. |

Next implementation order: mode catalog and notation (Bass, then Sharps/Flats, then Chords); mode-specific buttons and piano; browser progress migration; teaching content; Mic Lab recording; device/accessibility validation and release preparation. Keep each slice independently testable and do not label the native app feature complete until the table is closed.
