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

Recommended first scaffold: Vite with a small TypeScript core.

Suggested boundaries:

- `src/core/notes.ts`
  - Note names, clef note pools, staff positions, pitch helpers.
- `src/core/gameState.ts`
  - Round lifecycle, timer state, active note queue, score, streak, misses.
- `src/core/scoring.ts`
  - Pure answer reducer: correct, wrong, missed, next note.
- `src/ui/inputButtons.ts`
  - C D E F G A B touch controls.
- `src/ui/staffRenderer.ts`
  - VexFlow/SVG rendering adapter.
- `src/ui/pianoStrip.ts`
  - Planned optional keyboard input.
- `src/audio/pitchInput.ts`
  - Planned microphone/pitch tracking input.
- `src/storage/progressStore.ts`
  - Local best scores and settings.

## Current vs planned behavior

Current repository behavior is documentation-only until the first app scaffold lands.

Planned first implementation:

- Treble clef only.
- No accidentals.
- Button input only.
- 60-second rush round.
- Local-only scoring.

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
