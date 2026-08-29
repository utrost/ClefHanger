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

Current scaffold: dependency-free static HTML/CSS/JavaScript with a small tested core. This keeps the app deployable under `https://simiono.com/clefhanger/` without a build step. A later Vite/TypeScript migration is still reasonable once the app needs bundled dependencies such as VexFlow and Pitchy.

Current boundaries:

- `src/core/game.js`
  - Note names, Level 1 treble note pool, bass-note pool, accidental pools, chord pools, piano key definitions, prompt-to-frequency helpers, mode definitions, speed definitions, difficulty definitions, staff/clef layout anchors, note queue state, round lifecycle, scoring, misses, timer helpers, high-score keys, and summary view data.
- `src/core/pitch.js`
  - Frequency-to-note conversion, cents math, A4 calibration readouts, microphone input-mode normalization, sung-note match/debounce rules, microphone input-level diagnostics, and a small autocorrelation detector for analyser buffers.
- `src/app.js`
  - DOM adapter, SVG staff/chord rendering, compact settings summary, settings dialog, mode selector, speed slider, difficulty selector, input-mode toggle, fainter upcoming-note previews, note-button input, piano-strip input, microphone permission/listening UI, vocal calibration tone/readout UI, piano-like Web Audio correct-answer playback, animation loop, per-mode/per-slider-speed/per-difficulty LocalStorage high scores.
- `index.html`
  - Mobile-first layout, app shell, inline CSS, service-worker registration, iOS home-screen meta tags, and Apple touch icon link.
- `manifest.webmanifest` and `sw.js`
  - Installable/offline PWA shell with subpath-safe id/scope/start URL, portrait standalone mode, PNG/SVG maskable icons, mode shortcuts, and navigation fallback.

## Current vs planned behavior

Current repository behavior:

- Static PWA shell.
- Treble and bass clef.
- Corrected SVG clef anchors for treble and bass.
- Treble, bass, sharps, flats, and chord modes.
- Compact main screen with mode, speed, difficulty, input choice, and calibration moved into a settings dialog.
- A 1–10 speed slider.
- Beginner, easy, normal, and hard difficulty presets.
- One-, two-, and three-note queues. Only the front note is answerable; later notes are previews.
- Natural-note, accidental-button, chord-button, one-octave piano-strip, and microphone input.
- Vocal calibration can play a concert A and show a live microphone readout with detected note, frequency, cents, input level, and flat/sharp/in-tune status. If a browser grants microphone access but no pitch appears, the Mic panel reports whether the app is receiving no audio, too little level, or non-steady pitch.
- The main Mic panel shows the latest heard note as `You played ...` so calibration feedback remains visible outside the settings dialog.
- Microphone mode can score sung natural-note prompts when the detected pitch is within tolerance and debounce. Chord singing is not scored yet.
- Correct-answer Web Audio playback using equal-tempered pitches and a simple piano-like additive voice.
- 60-second rush round.
- Mode-weighted scoring, slider-speed bonus, difficulty multiplier, streak bonuses, and per-mode/per-slider-speed/per-difficulty high-score persistence.
- Installable PWA behavior for `https://simiono.com/clefhanger/`: manifest, service worker, PNG/SVG icons, iOS home-screen tags, mode shortcuts, and offline app shell.

Planned later implementation:

- Ledger lines.
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
