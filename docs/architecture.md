# Architecture Notes

ClefHanger should stay mobile-first and renderer-light. The first implementation should avoid coupling music rules, scoring, animation, and touch UI into one page script.

## Target stack

- HTML5 application shell.
- Tailwind CSS for responsive mobile layout.
- JavaScript or TypeScript for game logic.
- VexFlow for notation rendering.
- Web Audio API plus Pitchy for later microphone input.
- LocalStorage and PWA support for offline progress.

## Initial app shape

Current scaffold: dependency-free static HTML/CSS/JavaScript with a small tested core. This keeps the app deployable under `https://simiono.com/clefhanger/` without a build step. A later Vite/TypeScript migration is still reasonable once the app needs bundled dependencies such as VexFlow and Pitchy.

Current boundaries:

- `src/core/game.js`
  - Note names, Level 1 treble note pool, bass-note pool, accidental pools, chord pools, mode definitions, speed definitions, staff/clef layout anchors, round lifecycle, scoring, misses, timer helpers, high-score keys, and summary view data.
- `src/app.js`
  - DOM adapter, SVG staff/chord rendering, mode selector, speed selector, note-button input, typed-answer input, animation loop, per-mode/per-speed LocalStorage high scores.
- `index.html`
  - Mobile-first layout, app shell, inline CSS, service-worker registration.
- `manifest.webmanifest` and `sw.js`
  - Installable/offline PWA shell.

## Current vs planned behavior

Current repository behavior:

- Static PWA shell.
- Treble and bass clef.
- Corrected SVG clef anchors for treble and bass.
- Treble, bass, sharps, flats, and chord modes.
- Slow, normal, and fast speed settings.
- Natural-note and accidental button input.
- Typed answers for accidentals/chords.
- 60-second rush round.
- Mode-weighted scoring, fast-speed bonus, streak bonuses, and per-mode/per-speed high-score persistence.

Planned later implementation:

- Piano strip input.
- Vocal pitch input.
- Bass clef and ledger lines.
- Intervals and rapid jumps.
- VexFlow notation rendering upgrade once richer notation needs it.

## Quality gate once code exists

Before a slice is considered done:

- Unit tests pass.
- Build passes.
- Markdown links are checked where practical.
- `git diff --check` passes.
- Local browser smoke passes in a portrait mobile viewport.
- Browser console has no errors.
