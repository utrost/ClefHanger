# MVP Implementation Roadmap

This roadmap separates the first shippable game loop from later learning depth. Features below are planned unless explicitly marked as implemented in code.

## Slice 0 — Repo foundation — implemented

- Capture product specification.
- Add README, roadmap, and architecture notes.
- Choose the initial browser app scaffold.
- Add a basic quality gate: tests, static checks, and browser smoke checklist.

## Slice 1 — Treble-note rush greybox — implemented

Goal: one complete 60-second round using only oversized note buttons.

Player-visible behavior:

- Portrait-first layout.
- Treble staff area.
- A cliff edge on the right side of the staff.
- One note at a time moving toward the cliff.
- Seven large bottom buttons: C, D, E, F, G, A, B.
- Immediate feedback for correct and wrong taps.
- Miss feedback when a note reaches the cliff.
- Score, streak, misses, and countdown timer.
- Round summary after 60 seconds.

Engineering seams:

- Renderer-free note model: pitch name, staff position, answer name, spawn time, deadline.
- Game loop state: idle, running, ended.
- Input adapter for note buttons.
- Rendering adapter for staff/note/cliff presentation.
- Testable scoring reducer.

Verification:

- Unit tests for note generation and scoring.
- Build passes.
- Browser smoke in a phone-like viewport.
- Console has no runtime errors.

## Slice 2 — Modes, accidentals, chords, and high scores — implemented

- Four selectable modes: Basics, Sharps #, Flats ♭, Chords.
- Level 1 note pool remains treble-clef staff lines/spaces.
- Accidentals are introduced as separate sharp and flat drills.
- Chords use three-note triad stacks with typed answers such as `C-E-G`.
- Mode-weighted scoring gives harder drills more points.
- Streak bonuses reward clean runs.
- Per-mode high scores are persisted in LocalStorage.
- PWA manifest and offline shell remain active.

## Slice 3 — Touch piano strip

- Add optional one-octave keyboard input.
- Keep note buttons as the default mobile input.
- Test mapping between displayed note names and piano keys.

## Slice 4 — Vocal tracking prototype

- Add microphone permission flow.
- Use Web Audio API and Pitchy for pitch detection.
- Convert detected frequency to nearest note.
- Start with calibration/debug mode before scoring voice input as a competitive mode.

## Slice 5 — Learning depth

- Bass clef.
- Ledger lines.
- Accidentals.
- Intervals and rapid jumps.

## Product risks to validate early

- VexFlow mobile performance and animation ergonomics.
- Whether moving notation is readable on small screens.
- Whether seven note buttons are faster and less frustrating than a piano strip for beginners.
- Pitch detection accuracy in ordinary phone environments.
