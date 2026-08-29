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
- Chords use three-note triad stacks with touch-button answers such as `C`, `Dm`, and `Am`.
- Mode-weighted scoring gives harder drills more points.
- Streak bonuses reward clean runs.
- Per-mode high scores are persisted in LocalStorage.
- PWA manifest and offline shell remain active.

## Slice 3 — Clef correctness, bass mode, and speed control — implemented

- Treble clef glyph placement is corrected and covered by a renderer-free staff-layout contract.
- Bass clef is available as a natural-note drill mode.
- Bass-note generation uses lower-register E2–A3 notes mapped to the staff.
- Speed control is available as a 1–10 slider.
- Speed changes the note travel deadline without changing the selected practice mode.
- High scores are separated by mode and speed.

## Slice 3a — Speed slider — implemented

- Replace the Slow / Normal / Fast buttons with a 1–10 speed slider.
- Keep speed separate from difficulty: speed changes travel timing and a small speed bonus, while difficulty still owns queue size and score multiplier.
- High scores include the exact slider speed so scores remain comparable.

## Slice 4 — Guided difficulty ladder and note queues — implemented

- Difficulty presets are available as Beginner, Easy, Normal, and Hard.
- Difficulty controls note travel timing, scoring multiplier, and concurrent note queue size.
- Beginner/Easy keep one answerable note visible.
- Normal shows a two-note queue; Hard shows a three-note queue.
- Only the front note is answerable; upcoming notes are fainter previews.
- High scores are separated by mode, speed, and difficulty.

## Slice 5 — Touch piano strip and note playback — implemented

- Add optional one-octave keyboard input.
- Keep note buttons as the default mobile input.
- Test mapping between displayed note prompts and equal-tempered playback frequencies.
- Play the matching pitch after a correct answer. Chords play a short arpeggio.
- Correct answers play from touch note buttons or the piano strip; the optional typed-answer row was removed in Slice 6 to keep the mobile controls focused.

## Slice 6 — Remove optional typed answers — implemented

- Remove the optional typed-answer row from the mobile controls.
- Keep every shipped mode playable from buttons: accidentals use accidental buttons, and chords use direct triad buttons.
- Bump the service-worker cache so installed PWAs receive the simplified control tray.

## Slice 6a — Piano-like note sound — implemented

- Replace the plain sine beep with a small piano-like Web Audio voice.
- Layer quiet overtones over the played pitch and use a fast attack with a longer decay.
- Keep the audio synthetic and offline-friendly; no sample files to load.

## Slice 7 — Vocal tracking prototype

- Add microphone permission flow.
- Use Web Audio API and Pitchy for pitch detection.
- Convert detected frequency to nearest note.
- Start with calibration/debug mode before scoring voice input as a competitive mode.

## Slice 8 — Learning depth

- Wider ledger-line range.
- Ledger lines.
- Accidentals.
- Intervals and rapid jumps.

## Product risks to validate early

- VexFlow mobile performance and animation ergonomics.
- Whether moving notation is readable on small screens.
- Whether seven note buttons are faster and less frustrating than a piano strip for beginners.
- Pitch detection accuracy in ordinary phone environments.
