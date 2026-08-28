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

Current scaffold: dependency-free static HTML/CSS/JavaScript with a small tested core. This keeps Slice 1 deployable under `https://simiono.com/clefhanger/` without a build step. A later Vite/TypeScript migration is still reasonable once the app needs bundled dependencies such as VexFlow and Pitchy.

Current boundaries:

- `src/core/game.js`
  - Note names, Level 1 treble note pool, round lifecycle, scoring, misses, timer helpers, and summary view data.
- `src/app.js`
  - DOM adapter, SVG staff rendering, note-button input, animation loop, LocalStorage best score.
- `index.html`
  - Mobile-first layout, app shell, inline CSS, service-worker registration.
- `manifest.webmanifest` and `sw.js`
  - Installable/offline PWA shell.

## Current vs planned behavior

Current repository behavior:

- Static PWA shell.
- Treble clef only.
- No accidentals.
- Button input only.
- 60-second rush round.
- Local-only scoring and best-score persistence.

Planned later implementation:

- Piano strip input.
- Vocal pitch input.
- Bass clef and ledger lines.
- Accidentals and intervals.
- PWA offline install support.

## Quality gate once code exists

Before a slice is considered done:

- Unit tests pass.
- Build passes.
- Markdown links are checked where practical.
- `git diff --check` passes.
- Local browser smoke passes in a portrait mobile viewport.
- Browser console has no errors.
