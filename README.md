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

Slices 1–7 are implemented as a dependency-free static PWA:

- Treble-clef and bass-clef note/chord rush.
- Corrected SVG clef placement: treble clef loop anchored on the G line, bass clef centered around the F line.
- 60-second sprint timer.
- Five practice modes: Treble, Bass, Sharps #, Flats ♭, Chords.
- Settings dialog keeps mode, speed, difficulty, input choice, and calibration out of the main play surface.
- Speed slider: 1–10, from slow practice to fast rush.
- Difficulty ladder: Beginner, Easy, Normal, Hard.
- Concurrent note queues: one note on Beginner/Easy, two on Normal, three on Hard; only the front note is answerable.
- Toggleable input: large note buttons, a one-octave on-screen piano strip, or microphone input.
- Actual vocal calibration: grant mic access, play concert A, sing it back, and see the detected note/frequency/cents against A4.
- Mic input shows a plain `You played A4 · 440 Hz · in tune` style readout so the singer can see what the phone heard even before it scores.
- Implausible microphone spikes outside the playable vocal range are ignored instead of being shown as absurd octave readings such as `G♯8`.
- Mic startup shows immediate visible progress in both the main Mic panel and the settings calibration line, uses a simpler Chrome-friendly mic request, checks the browser permission state before requesting, and turns permission denials/timeouts into explicit Chrome + Android system permission instructions.
- Microphone mode can score sung natural-note answers when the detected pitch is within tolerance; chord singing is not scored yet.
- Extra accidental buttons for #/♭ answers; chord mode uses direct triad buttons such as C, Dm, Em, F, G, and Am; piano black keys map to sharps/flats in those modes.
- Correct answers play a small piano-like Web Audio voice instead of a plain beep; chords play as short arpeggios.
- The optional typed-answer row has been removed to keep the mobile controls thumb-first.
- Correct / wrong / missed feedback.
- Mode-weighted points with speed/difficulty/streak bonuses.
- Per-mode, per-slider-speed, per-difficulty high scores via LocalStorage.
- Installable PWA shell: manifest id/scope, portrait standalone mode, PNG/SVG maskable icons, iOS home-screen tags, mode shortcuts, and offline service-worker cache.

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
