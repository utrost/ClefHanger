# Architecture Notes

ClefHanger should stay mobile-first and renderer-light. The first implementation should avoid coupling music rules, scoring, animation, and touch UI into one page script.

## Target stack

- HTML5 application shell.
- Tailwind CSS for responsive mobile layout.
- JavaScript or TypeScript for game logic.
- VexFlow for notation rendering.
- Web Audio API analyser input with a dependency-free autocorrelation detector for microphone input; Pitchy remains a possible later upgrade.
- LocalStorage and PWA support for offline progress.

## Initial app shape

Current scaffold: dependency-free static HTML/CSS/JavaScript with a small tested core and one focused UI renderer. This keeps the app deployable under `https://simiono.com/clefhanger/` without a build step. A later Vite/TypeScript migration is still reasonable once the app needs bundled dependencies such as VexFlow and Pitchy.

Current boundaries:

- `src/core/music-theory.js`
  - Accidental symbols, pitch-class semitone map, equal-tempered note/chord prompt frequencies, staff-step mapping, and ghost-note data.
- `src/core/content.js`
  - Note names, Level 1 treble note pool including first ledger-line notes, bass-note pool, accidental pools, chord pools, piano key definitions, mode definitions, speed definitions, difficulty definitions, and safe catalog lookups.
- `src/core/scoring.js`
  - Mode-weighted point arithmetic, slider-speed bonus, difficulty multiplier, streak bonus, accuracy, high-score keys, and summary view data.
- `src/core/game.js`
  - Staff/clef/ledger-line layout anchors, beginner practice lifecycle, note queue state, round lifecycle, scoring flow, misses, timer helpers, and compatibility re-exports for older importers.
- `src/core/learning.js`
  - First-run tutorial text, beginner lesson definitions, lesson intro cards, scaffolded answer options, teaching feedback, visual correction overlay data, and beginner-friendly microphone messages.
- `src/core/pitch.js`
  - Frequency-to-note conversion, cents math, A4 calibration readouts, microphone input-mode normalization, sung-note match/debounce rules, microphone input-level diagnostics, and a small autocorrelation detector for analyser buffers.
- `src/core/mic-diagnostics.js`
  - Renderer-free Mic Lab report contracts: live analyser summaries, decoded recording level/peak, pitch-window candidates, environment/track metadata, interpretation strings, and Telegram-friendly `.txt` JSON export metadata.
- `src/ui/staff-renderer.js`
  - Renderer-only SVG staff/chord/note/ledger-line/correction-label/ghost-note markup. It consumes core state and microphone state and returns SVG markup without touching the DOM.
- `src/app.js`
  - DOM adapter, compact settings summary, settings dialog, mode selector, speed slider, difficulty selector, input-mode toggle, note-button input, piano-strip input, microphone permission/listening UI, Mic Lab recording/report export UI, vocal calibration tone/readout UI, piano-like Web Audio correct-answer playback, animation loop, per-mode/per-slider-speed/per-difficulty LocalStorage high scores, and browser smoke hooks.
- `index.html`
  - Mobile-first layout, app shell, inline CSS, service-worker registration, iOS home-screen meta tags, and Apple touch icon link.
- `manifest.webmanifest` and `sw.js`
  - Installable/offline PWA shell with subpath-safe id/scope/start URL, portrait standalone mode, PNG/SVG maskable icons, mode shortcuts, and navigation fallback.

## Current repository behavior

For the product-level player journey, see [User Journey](./user-journey.md). For the exhaustive implementation contract, see [Current State Reference](./current-state-reference.md). For first-time playtesting and mic troubleshooting, see [Player and Tester Guide](./player-tester-guide.md). For continuation/deploy rules, see [Developer Handoff](./developer-handoff.md). For the active anti-god-file cleanup sequence, see [Refactoring Plan](./refactoring-plan.md).

- Mobile-first static app with no bundler/runtime dependencies.
- Default Practice mode for beginners, with an alternate Rush mode for timed play and a terminal ending splash after the 60-second timer expires.
- Three-step first-run tutorial.
- Beginner lesson sequence: First steps, Line notes, Space notes, Ledger lines, Interval jumps, Mixed notes.
- Tiny lesson intro cards for line, space, ledger-line, and interval-jump practice.
- Scaffolded beginner answer tray, starting with only C/D/E, narrowing ledger-line practice to C/A, and using C/D/E/F/G for interval jumps.
- Teaching feedback plus a visual correction overlay after wrong answers: the note is labelled on the staff and the correct button is highlighted.
- Treble and bass clef.
- Corrected SVG clef anchors for treble and bass.
- Renderer-free ledger-line geometry for the first notes outside the treble staff.
- Treble, bass, sharps, flats, and chord modes.
- Compact main screen with mode, speed, difficulty, input choice, and calibration moved into a settings dialog.
- A 1–10 speed slider.
- Beginner, easy, normal, and hard difficulty presets.
- One-, two-, and three-note queues. Only the front note is answerable; later notes are previews.
- Natural-note, accidental-button, chord-button, one-octave piano-strip, and microphone input.
- Vocal calibration can play a concert A and show a live microphone readout with detected note, frequency, cents, input level, and flat/sharp/in-tune status. The DOM adapter retains the `MediaStreamAudioSourceNode` for Firefox mobile and connects the analyser through a zero-volume keepalive gain node to keep the Web Audio graph active. If a browser grants microphone access but no pitch appears, the Mic panel reports whether the app is receiving no audio, too little level, muted/ended track state, or non-steady pitch. A 1-second `MediaRecorder` diagnostic checks whether the browser can capture microphone bytes outside the analyser path, attempts to decode them for an independent RMS level, and scans the decoded recording for a detected pitch.
- A 1-second microphone recording diagnostic can compare MediaRecorder capture against the Web Audio analyser path when a browser still reports `mic level 0%`, and it attempts to detect any steady recorded pitch from low male range through A4 rather than requiring the singer to hit concert A.
- Mic Lab reports are exported as `.txt` JSON so phone/browser evidence can be sent back from Telegram and preserved as regression fixtures before changing pitch thresholds.
- The live analyser loop schedules `requestAnimationFrame((timestamp) => processMicrophoneFrame(null, timestamp))` so the browser frame timestamp is not misread as a pitch-frequency override.
- `getUserMedia` currently uses the built-in-vocal microphone constraints (`echoCancellation: false`, `noiseSuppression: false`, `autoGainControl: true`, mono). Android Firefox field reports showed the gain path gives usable voice levels while still avoiding browser cleanup that can remove steady musical tones as echo/noise.
- Microphone mode can score sung natural-note prompts by pitch class, independent of octave, when the detected note stays within a forgiving 50-cent vocal tolerance for a short stability window. A post-hit debounce prevents repeated animation-frame scoring, and `window.clefhangerInjectPitch(frequency)` gives browser smoke tests a no-hardware pitch-injection seam. Chord singing is not scored yet.
- Correct-answer Web Audio playback using equal-tempered pitches and a simple piano-like additive voice.
- 60-second rush round.
- Mode-weighted scoring, slider-speed bonus, difficulty multiplier, streak bonuses, and per-mode/per-slider-speed/per-difficulty high-score persistence.
- Installable PWA behavior for `https://simiono.com/clefhanger/`: manifest, service worker, PNG/SVG icons, iOS home-screen tags, mode shortcuts, and offline app shell.

Planned later implementation:

- Accidentals as beginner learning cards, not only drill modes.
- Intervals and rapid jumps.
- Pitchy/noise-hardening if real phones need more robust pitch detection than the dependency-free first pass.
- VexFlow notation rendering upgrade once richer notation needs it.

## Quality gate once code exists

Before a slice is considered done:

- Unit tests pass.
- Build passes.
- Markdown links are checked where practical.
- `git diff --check` passes.
- Local browser smoke passes in a portrait mobile viewport.
- Browser console has no errors.
