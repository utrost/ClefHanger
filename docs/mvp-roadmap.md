# MVP Implementation Roadmap

This roadmap separates the first shippable game loop from later learning depth. Features below are planned unless explicitly marked as implemented in code. For the intended player behavior, see [User Journey](./user-journey.md); for the exact current implementation contract, see [Current State Reference](./current-state-reference.md); for tester instructions, see [Player and Tester Guide](./player-tester-guide.md); for continuation/deploy rules, see [Developer Handoff](./developer-handoff.md).

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

## Slice 6b — Vocal calibration tone — implemented

- Add a Calibrate input option before full microphone scoring.
- Play a concert A reference tone from a user tap.
- Let the singer listen and sing it back without granting microphone permission yet.

## Slice 6c — Settings dialog cleanup — implemented

- Move mode, speed, difficulty, input choice, and vocal calibration into a dedicated settings dialog.
- Keep the main play surface focused on current settings, staff, start button, and the selected answer input.
- Treat calibration as a settings tool rather than a third answer input mode.

## Slice 7 — Vocal tracking prototype — implemented

- Add microphone permission flow.
- Use Web Audio API analyser input plus a small dependency-free autocorrelation pitch detector. Pitchy remains a possible later upgrade if the detector needs better noisy-room behavior.
- Convert detected frequency to nearest note.
- Add actual A4 calibration/debug readout: detected note, frequency, cents, and flat/sharp/in-tune status.
- Add Mic as an answer input mode. Sung natural-note answers score when the detected pitch is within tolerance and debounce; chord singing is explicitly not scored yet.

## Slice 7a — Beginner learning flow — implemented

- Default new sessions toward untimed Practice mode instead of the 60-second rush.
- Add a tiny first-run tutorial with three concrete staff-reading tips.
- Add beginner lessons for First steps, Line notes, Space notes, and Mixed notes.
- Start First steps with only C, D, and E answer buttons; widen the tray for later lessons.
- Keep Rush mode available for the original timed cliff game.

## Slice 7b — Visual correction overlay — implemented

- Wrong answers now produce teaching feedback with the correct note and its simple staff location.
- Practice mode keeps the current note active after a wrong answer.
- The staff briefly labels the correct note directly beside the note head.
- The correct answer button is highlighted so the next tap is obvious.
- The overlay contract is covered by tests in `tests/beginner-ux.test.js`.

## Slice 8a — Phone dogfood before broader content

- Run the current beginner flow on an actual phone.
- Capture cramped or confusing states before adding many more prompts.
- Keep screenshots as evidence for layout/readability fixes.

## Slice 8b — Line/space intro cards — implemented

- Add tiny intro cards for line-note and space-note lessons.
- Keep the card before practice starts, with concrete examples and a hide action.
- Selecting a different lesson reopens the lesson note.

## Slice 8c — Ledger-line geometry — implemented

- Add renderer-free ledger-line geometry helpers.
- Draw ledger lines only on true ledger-line staff steps, not every note just outside the staff.
- Include the first treble ledger notes around the current range: middle C below the staff and A above it.

## Slice 8d — Ledger-line beginner lesson — implemented

- Add a dedicated Ledger lines lesson in Practice.
- Keep the answer tray small: only C and A for the first ledger drill.
- Wrong-answer teaching copy names the concrete note location, e.g. middle C or A on the first ledger line above the staff.

## Slice 8d.1 — Android/Firefox Mic Lab evidence — implemented

- Add live analyser input-level copy so a granted-but-silent browser can be distinguished from a detector failure.
- Retain the `MediaStreamAudioSourceNode` and connect the analyser through a muted keepalive gain node so Firefox keeps the input graph active.
- Add a 1-second MediaRecorder diagnostic that captures bytes, decodes audio when possible, reports RMS/peak, and scans chunked pitch windows.
- Export Telegram-friendly `.txt` JSON reports with browser, URL, track settings, live analyser, recording, decoded-level, and pitch-candidate evidence.
- Use built-in-vocal constraints for phone/laptop voice testing: `echoCancellation: false`, `noiseSuppression: false`, `autoGainControl: true`, mono.

## Slice 8d.2 — Forgiving mic scoring — implemented

- Score microphone single-note prompts by pitch class instead of exact octave.
- Use a forgiving 50-cent vocal tolerance.
- Require a short same-note stability window before scoring.
- Keep a post-hit debounce so one held note cannot clear several prompts.
- Expose `window.clefhangerInjectPitch(frequency, nowMs?)` for deterministic browser smoke without a physical microphone.
- Update docs and smoke checks so testers know chord singing is still out of scope.

## Slice 8d.3 — Documentation consolidation — implemented

- Add a full current-state reference for exact modes, lessons, scoring, mic rules, diagnostics, rendering, persistence, gates, deploy expectations, and limitations.
- Add a player/tester guide for first-run play, microphone troubleshooting, Mic Lab reports, and manual smoke tests.
- Add a user journey document for what a normal player is supposed to do: first session, Practice/Rush behavior, input-mode choice, singing/playing expectations, success signals, and fallback path.
- Add a developer handoff with module ownership, TDD rules, ES-module cache pitfalls, and deploy workflow.
- Cross-link the documentation spine from README, architecture, product spec, roadmap, and smoke checklist.

## Slice 8d.4 — Learning contract and next-step coach — implemented

Goal: make the user journey concrete enough that a beginner knows when to repeat, when to switch lesson, and when to try Rush.

Documentation/guideline work — implemented:

- Add a "golden path" near the top of `docs/user-journey.md`:
  - First steps / Practice / Notes.
  - Line notes / Practice / Notes.
  - Space notes / Practice / Notes.
  - Ledger lines / Practice / Notes.
  - Interval jumps / Practice / Notes.
  - Mixed notes / Practice / Notes.
  - The same material in Rush.
  - Piano or Sing/Play only after the written-note loop is understood.
- Add a "when to move on" rule:
  - stay in Practice until roughly 8 of 10 feel easy;
  - try one Rush on the same lesson;
  - below roughly 70% accuracy means repeat Practice;
  - above roughly 80% accuracy means try the next lesson;
  - do not increase lesson breadth, speed, and difficulty at the same time.
- Add a "change one thing at a time" guideline for settings.
- Add mistake-review guidance: pause, read the correction, name line/space/ledger, then answer again.
- Add a first-three-sessions learning path for people who do not yet know how to practice sight reading.

App behavior — implemented:

- Add a small recommendation line after Practice and Rush events.
- Use current run evidence to suggest one next action:
  - high Practice streak: try Rush on the same lesson;
  - low Rush accuracy: repeat in Practice;
  - high Rush accuracy: try the next lesson;
  - repeated misses: lower speed or return to a narrower lesson;
  - microphone unstable: switch to Notes first, then troubleshoot Sing/Play separately.
- Keep recommendations gentle and optional; avoid locking lesson progression behind scores.
- Keep it deterministic and testable from reducer/run summary data.

Verification — implemented:

- Unit-test recommendation selection from summary/progress inputs.
- Browser-smoke that the recommendation appears after relevant user actions and never blocks the main controls.
- Update `docs/user-journey.md`, `docs/player-tester-guide.md`, and `docs/current-state-reference.md` with the actual recommendation wording and thresholds.

## Slice 8e — Accidentals as learning — implemented

- Turn the existing sharp/flat mechanics into beginner-facing learning guidance.
- Show how the same staff position changes answer with `♯` or `♭`.
- Keep direct touch answers; no typed input.
- The same learning suggestion line explains `C♯`/`D♭` style prompts as the same staff position plus a raised/lowered accidental.
- Future work can still add fuller accidental-specific lesson cards after real use shows which copy helps.

## Slice 8f — Intervals and rapid jumps — implemented

- Add a small Interval jumps Practice lesson before Mixed notes.
- Teach small movement patterns: same note, step up/down, skip, and larger jumps.
- Keep it separate from chord theory: the lesson still answers single note names with direct touch buttons.
- Use the learning suggestion line to compare the current prompt with the previous completed prompt.
- Keep the beginner answer tray narrow at C, D, E, F, G before returning to all seven Mixed notes.

## Product risks to validate early

- Whether the app gives beginners enough progression guidance, not just controls and lessons.
- Whether the suggested 70%/80% readiness thresholds feel motivating or too school-like in real use.
- VexFlow mobile performance and animation ergonomics.
- Whether moving notation is readable on small screens.
- Whether seven note buttons are faster and less frustrating than a piano strip for beginners.
- Pitch detection accuracy in ordinary phone environments.
