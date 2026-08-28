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

Slices 1–4 are implemented as a dependency-free static PWA:

- Treble-clef and bass-clef note/chord rush.
- Corrected SVG clef placement: treble clef loop anchored on the G line, bass clef centered around the F line.
- 60-second sprint timer.
- Five practice modes: Treble, Bass, Sharps #, Flats ♭, Chords.
- Speed control: Slow, Normal, Fast.
- Difficulty ladder: Beginner, Easy, Normal, Hard.
- Concurrent note queues: one note on Beginner/Easy, two on Normal, three on Hard; only the front note is answerable.
- Seven large natural-note buttons: C D E F G A B.
- Extra accidental buttons for #/♭ answers.
- Optional typed answers for accidentals and chords, e.g. `F#`, `Bb`, `C-E-G`.
- Correct / wrong / missed feedback.
- Mode-weighted points with speed/difficulty/streak bonuses.
- Per-mode, per-speed, per-difficulty high scores via LocalStorage.
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
