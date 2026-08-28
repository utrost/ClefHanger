# ClefHanger

ClefHanger is a mobile-first, bite-sized sight-reading game for singers, acoustic instrumentalists, choir members, and beginners who want to learn staff notation without a keyboard or MIDI hardware.

## Core idea

Notes move horizontally across a musical staff toward a cliff edge. The player must identify each note before it falls. Rounds are short 60-second sprints for commute-length practice.

## MVP focus

The first playable slice should prove the simplest complete loop:

1. Show one treble-clef note on a staff.
2. Move it toward the cliff edge.
3. Let the player answer with large mobile note buttons: C D E F G A B.
4. Score correct, wrong, and missed notes.
5. End after a 60-second sprint.

## Planned input modes

- Oversized note buttons for thumb-first play.
- A one-octave touch piano strip.
- Microphone pitch detection for singers.

## Current playable slice

Slices 1–2 are implemented as a dependency-free static PWA:

- Treble-clef note/chord rush.
- 60-second sprint timer.
- Four practice modes: Basics, Sharps #, Flats ♭, Chords.
- Seven large natural-note buttons: C D E F G A B.
- Extra accidental buttons for #/♭ answers.
- Optional typed answers for accidentals and chords, e.g. `F#`, `Bb`, `C-E-G`.
- Correct / wrong / missed feedback.
- Mode-weighted points with streak bonuses.
- Per-mode high scores via LocalStorage.
- Offline app shell via service worker.

## Run locally

```bash
npm test
npm run check
npm run serve
```

Then open `http://localhost:4173/`.

## Documentation

- [Product specification](docs/product-specification.md)
- [MVP implementation roadmap](docs/mvp-roadmap.md)
- [Architecture notes](docs/architecture.md)
- [Smoke checklist](docs/smoke-checklist.md)
