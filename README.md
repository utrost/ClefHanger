# ClefHanger

ClefHanger is a mobile-first, bite-sized sight-reading game for singers, acoustic instrumentalists, choir members, and beginners who want to learn staff notation without a keyboard or MIDI hardware.

## Core idea

Notes move horizontally across a musical staff toward a cliff edge. The player must identify each note before it falls. Rounds are short 60-second sprints for commute-length practice.

## MVP focus

The first playable slices proved the simplest complete loop:

1. Show one treble-clef note on a staff.
2. Move it toward the cliff edge.
3. Let the player answer with large mobile note buttons: C D E F G A B.
4. Score correct, wrong, and missed notes.
5. End after a 60-second sprint.

## Planned input modes

- Oversized note buttons for thumb-first play.
- A one-octave touch piano strip.
- Microphone pitch detection for singers and acoustic instruments, with a staff ghost note showing what the app thinks was played.

## Current playable slice

Slices through 45 are implemented as a dependency-free static PWA:

- Beginner-first practice flow: the app now starts in untimed Practice mode instead of throwing a new player straight into a rush.
- First-run tutorial card with three small tips and a dismiss action.
- Six beginner lessons: First steps, Line notes, Space notes, Ledger lines, Interval jumps, and Mixed notes.
- Tiny lesson intro cards for line, space, ledger-line, and interval-jump lessons before practice starts.
- Adaptive beginner answer tray: First steps starts with only C, D, and E; ledger-line practice uses only C and A notes just outside the treble staff; Interval jumps uses C, D, E, F, and G while teaching same note, step, or skip movement.
- Wrong answers teach instead of only rejecting: the app says what the note was and gives a short location hint such as `bottom line E`.
- Visual correction overlay: after a wrong answer, the staff briefly labels the correct note and the correct answer button is highlighted.

- Treble-clef and bass-clef note/chord rush.
- Corrected SVG clef placement: treble clef loop anchored on the G line, bass clef centered around the F line.
- Ledger-line geometry renders short extra lines only for notes outside the staff, including middle C below and A above the treble staff.
- 60-second sprint timer with a centered ending splash at time-up showing score, accuracy, correct/wrong/missed counts, best streak, and a one-tap replay button.
- Five practice modes: Treble, Bass, Sharps #, Flats ♭, Chords.
- Settings dialog keeps mode, speed, difficulty, input choice, and calibration out of the main play surface.
- Speed slider: 1–10, from slow practice to fast rush.
- Difficulty ladder: Beginner, Easy, Normal, Hard.
- Concurrent note queues: one note on Beginner/Easy, two on Normal, three on Hard; only the front note is answerable.
- Toggleable input: large note buttons, a one-octave on-screen piano strip, or Sing/Play microphone input for humming, singing, violin, guitar, or other steady monophonic instruments.
- Sing/Play input draws a translucent green ghost note on the staff at the detected pitch, plus a `You played A4 · 440 Hz · in tune` style readout. When the detected pitch class matches the front staff note and stays inside the forgiving vocal tolerance for a short stability window, the game treats the note as hit; any octave is accepted for now. Enharmonic flat prompts such as `D♭` can be scored from a detector readout named `C♯` when the frequency is correct.
- Actual vocal calibration: grant mic access, sing any steady comfortable note to see detected note/frequency/cents; concert A is only an optional reference tone.
- Mic input shows a plain `You played A4 · 440 Hz · in tune` style readout so the singer can see what the phone heard even before it scores. Real-device recognition is still under active testing when a phone/browser hears a piano or voice but does not lock a steady pitch.
- Implausible microphone spikes outside the playable vocal range are ignored instead of being shown as absurd octave readings such as `G♯8`.
- Mic startup shows immediate visible progress in both the main Mic panel and the settings calibration line, uses a simpler Chrome-friendly mic request, checks the browser permission state before requesting, and turns permission denials/timeouts into explicit Chrome + Android system permission instructions.
- Firefox/mobile mic debugging now shows input level while listening, so a granted-but-silent stream can be distinguished from a pitch-detection failure; the detector also keeps quieter phone/browser analyser signals, retains the Web Audio media-stream source, and connects the analyser through a muted keepalive gain node so Firefox keeps pulling the input graph.
- A 1-second microphone recording diagnostic can compare MediaRecorder capture against the Web Audio analyser path when a browser still reports `mic level 0%`, and it attempts to detect any steady recorded pitch from low male range through A4 rather than requiring the singer to hit concert A.
- Mic Lab can label a silence/voice/piano/app-tone capture and export a Telegram-friendly `.txt` JSON report with browser, track, live analyser, recording, decoded-level, and pitch-window evidence for fixture-based debugging.
- Real-device Mic Lab reports guard a regression where the browser's animation-frame timestamp could be mistaken for a live pitch value; the live analyser loop now passes that timestamp as time only.
- Mic capture now requests a built-in-vocal profile (`echoCancellation` and `noiseSuppression` off, `autoGainControl` on) because Android Firefox needed gain for usable voice levels while still avoiding speech cleanup that suppresses steady tones. Mic Lab reports still include the actual track settings because browsers may ignore parts of the request.
- Microphone mode can score sung natural-note answers by pitch class with a forgiving 50-cent tolerance, short steady-note debounce, and a `window.clefhangerInjectPitch(frequency)` smoke hook for regression testing without a physical microphone; chord singing is not scored yet.
- Extra accidental buttons for #/♭ answers; chord mode uses direct triad buttons such as C, Dm, Em, F, G, and Am; piano black keys map to sharps/flats in those modes.
- Correct answers play a small piano-like Web Audio voice instead of a plain beep; chords play as short arpeggios.
- The optional typed-answer row has been removed to keep the mobile controls thumb-first.
- Correct / wrong / missed feedback, with beginner teaching feedback in Practice mode.
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

- [User journey](docs/user-journey.md) — what a normal player is supposed to do, from first run through practice, rush, and mic use.
- [Player and tester guide](docs/player-tester-guide.md) — how to play, test, troubleshoot microphone mode, and send useful reports.
- [Current state reference](docs/current-state-reference.md) — exact implemented behavior, constants, scoring, mic rules, persistence, and known limits.
- [Developer handoff](docs/developer-handoff.md) — code ownership, TDD/deploy workflow, ES-module cache rules, and continuation notes.
- [Refactoring plan](docs/refactoring-plan.md) — architecture cleanup sequence to prevent god files while preserving the current teaching prototype.
- [Product specification](docs/product-specification.md)
- [MVP implementation roadmap](docs/mvp-roadmap.md)
- [Architecture notes](docs/architecture.md)
- [Smoke checklist](docs/smoke-checklist.md)
