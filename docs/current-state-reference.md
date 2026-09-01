# ClefHanger Current State Reference

This document describes what exists in code today in `clefhanger-slice42-staff-renderer-2026-09-01`. It is an implementation reference, not a future roadmap. For the product-level path a normal player is supposed to follow, see [User Journey](./user-journey.md).

## Runtime shape

- App type: dependency-free static PWA.
- Public URL: `https://simiono.com/clefhanger/`.
- Local entry point: `index.html` loading `src/app.js` as an ES module.
- `src/app.js` delegates staff SVG markup to `src/ui/staff-renderer.js` and keeps the DOM assignment/composition role.
- Current app marker: `clefhanger-slice42-staff-renderer-2026-09-01`.
- Current visible slice marker: `Slice 42: staff renderer`.
- Current service-worker cache: `clefhanger-pwa-v36`.
- Core/UI modules:
  - `src/core/game.js`: game state, note pools, scoring, queues, pitch-frequency helpers, ghost-note geometry.
  - `src/core/learning.js`: beginner lessons, first-run tutorial, teaching feedback, correction overlay, friendly mic messages, next-step learning recommendations, accidental learning hints, and interval/jump hints.
  - `src/core/pitch.js`: microphone constraints, frequency-to-note conversion, cents math, calibration readouts, pitch detection, vocal match/scoring debounce.
  - `src/core/mic-diagnostics.js`: decoded-audio summaries, recorded pitch windows, Mic Lab report JSON and `.txt` export.
  - `src/core/audio.js`: synthetic piano-like Web Audio voice and A4 reference tone.
  - `src/ui/staff-renderer.js`: SVG staff, note, chord, ledger-line, correction-label, and microphone ghost-note markup.

## Main user flow

New sessions default to:

- Mode: Treble.
- Difficulty: Beginner.
- Speed: 5.
- Input: Notes.
- Play style: Practice.
- Lesson: First steps.
- Hints: on.

The main page contains:

- header with title, tagline, and 60-second timer display;
- score/streak/high-score HUD;
- compact settings summary and Settings button;
- first-run tutorial card;
- Practice/Rush selector;
- beginner lesson selector and lesson intro card;
- staff playfield with cliff edge;
- selected input panel: note buttons, piano strip, or microphone status panel;
- non-blocking learning suggestion line below the feedback;
- centered time-up summary for ended Rush rounds.

## Modes and prompt pools

Modes are defined in `GAME_MODES`.

### Treble

- Mode id: `basics`.
- Label: `Treble`.
- Kind: single note.
- Clef: treble.
- Base points: 100.
- Pool:
  - C4, staff step -2, label `middle C`.
  - D4, staff step -1, label `D4`.
  - E4, staff step 0, label `bottom line E`.
  - F4, staff step 1, label `F4`.
  - G4, staff step 2, label `G4`.
  - A4, staff step 3, label `A4`.
  - B4, staff step 4, label `B4`.
  - C5, staff step 5, label `C5`.
  - D5, staff step 6, label `D5`.
  - E5, staff step 7, label `top space E`.
  - F5, staff step 8, label `top line F`.
  - G5, staff step 9, label `G just above the staff`.
  - A5, staff step 10, label `A on the first ledger line above the staff`.

### Bass

- Mode id: `bass`.
- Label: `Bass`.
- Kind: single note.
- Clef: bass.
- Base points: 120.
- Pool: E2, F2, G2, A2, B2, C3, D3, E3, F3, G3, A3.
- Bass staff-step mapping anchors E2 at staff step -2 and A3 at staff step 8.

### Sharps

- Mode id: `sharps`.
- Label: `Sharps #`.
- Kind: single note.
- Clef: treble.
- Base points: 150.
- Pool: C♯4, D♯4, F♯4, G♯4, A♯4, C♯5, D♯5.
- Answer tray: C♯, D♯, F♯, G♯, A♯.
- Piano black keys answer sharp labels in this mode.

### Flats

- Mode id: `flats`.
- Label: `Flats ♭`.
- Kind: single note.
- Clef: treble.
- Base points: 150.
- Pool: D♭4, E♭4, G♭4, A♭4, B♭4, D♭5, E♭5.
- Answer tray: D♭, E♭, G♭, A♭, B♭.
- Piano black keys answer flat labels in this mode.

### Chords

- Mode id: `chords`.
- Label: `Chords`.
- Kind: chord.
- Clef: treble.
- Base points: 240.
- Current triads:
  - C major: C-E-G, staff steps -2, 0, 2; button label `C`.
  - D minor: D-F-A, staff steps -1, 1, 3; button label `Dm`.
  - E minor: E-G-B, staff steps 0, 2, 4; button label `Em`.
  - F major: F-A-C, staff steps 1, 3, 5; button label `F`.
  - G major: G-B-D, staff steps 2, 4, 6; button label `G`.
  - A minor: A-C-E, staff steps 3, 5, 7; button label `Am`.
- Chord answers normalize to dash-joined notes such as `C-E-G`.
- Microphone scoring does not score chords yet.

## Beginner lessons

Beginner lessons apply to Treble + Beginner difficulty. Other modes/difficulties use their full answer options.

### First steps

- Lesson id: `first-steps`.
- Label: First steps.
- Copy: `Start with C, D, E`.
- Answer buttons: C, D, E.
- Prompt filter: note names C, D, E.

### Line notes

- Lesson id: `line-notes`.
- Label: Line notes.
- Intro: treble staff lines are E G B D F from bottom to top.
- Answer buttons: E, G, B, D, F.
- Prompt filter: note names E, G, B, D, F.

### Space notes

- Lesson id: `space-notes`.
- Label: Space notes.
- Intro: treble spaces spell FACE from bottom to top.
- Answer buttons: F, A, C, E.
- Prompt filter: note names F, A, C, E.

### Ledger lines

- Lesson id: `ledger-notes`.
- Label: Ledger lines.
- Intro: ledger notes sit just outside the staff; short extra lines are part of the note.
- Answer buttons: C, A.
- Prompt filter: note names C/A and staff steps -2/10.

### Interval jumps

- Lesson id: `interval-jumps`.
- Label: Interval jumps.
- Intro: compare the current note to the last one as same note, step, or skip before thinking about the full mixed set.
- Answer buttons: C, D, E, F, G.
- Prompt filter: note names C, D, E, F, G on staff steps -2 through 2.
- Learning suggestion: once there is a previous completed prompt, `buildIntervalLearningHint(...)` describes same-note repeats, one-step movement, skips over one note, or larger jumps.

### Mixed notes

- Lesson id: `mixed`.
- Label: Mixed notes.
- Answer buttons: C, D, E, F, G, A, B.
- Prompt pool: full Treble pool.

## Play styles and phases

The reducer uses these phases:

- `idle`: no active round; feedback says `Tap Start when ready.`
- `practice`: untimed single-note lesson.
- `running`: 60-second Rush round.
- `ended`: Rush is complete; active notes and queue are cleared.

### Practice

- Starts with `startPractice`.
- No end time; timer display is `∞`.
- Uses Speed 1 internally and Beginner difficulty.
- Always keeps one active prompt.
- Wrong answers keep the same prompt active.
- If a correct answer empties the queue, the DOM handler spawns the next note immediately.

### Rush

- Starts with `startRound`.
- Round length: 60,000 ms.
- Notes move horizontally toward the cliff using each note's spawn/deadline timing.
- Expired notes count as missed if they reach their deadline before answer.
- On timeout, phase becomes `ended`, active notes/queue are cleared, and the time-up summary appears.
- Late answers after `ended` do not mutate the result.

## Learning recommendations

`buildLearningRecommendation(...)` turns simple progress evidence into one gentle, optional next step. It is deliberately deterministic and does not lock progression.

Current thresholds and messages:

- Practice with at least 8 correct, 0 wrong/missed, and best streak at least 8: suggest Rush on the same lesson.
- Practice with mistakes: suggest pausing on the correction and naming line/space/ledger before answering again.
- Practice before readiness: suggest practicing the current lesson until about 8 out of 10 feel easy.
- Rush below 70% accuracy: suggest repeating the current lesson in Practice.
- Rush at or above 80% accuracy with another beginner lesson available: suggest the next lesson.
- Rush at or above 80% accuracy with no next lesson: suggest changing only one setting for more challenge.
- Rush with many misses at higher speed: suggest lowering speed on the same lesson.
- Microphone mode without stable pitch: suggest using Notes first and troubleshooting Sing/Play separately.
- Sharp/flat prompts in Sharps or Flats mode: explain that the accidental uses the same staff spot as the natural note, then raises or lowers it by one small step.
- Interval jumps lesson prompts after the first completed answer: compare the current prompt against the previous prompt as same note, step up/down, skip up/down, or larger jump.

The line renders under the main feedback as `#learning-coach` with `aria-label="Learning suggestion"`. The ending splash repeats the recommendation in its detail text.

## Difficulty and speed

Speed is a clamped slider from 1 to 10. Multipliers by speed value:

- 1: 1.45
- 2: 1.32
- 3: 1.20
- 4: 1.10
- 5: 1.00
- 6: 0.92
- 7: 0.84
- 8: 0.77
- 9: 0.71
- 10: 0.65

Difficulty presets:

- Beginner: queue size 1, travel multiplier 1.2, score multiplier 1.0.
- Easy: queue size 1, travel multiplier 1.0, score multiplier 1.0.
- Normal: queue size 2, travel multiplier 0.9, score multiplier 1.35.
- Hard: queue size 3, travel multiplier 0.78, score multiplier 1.8.

Base travel time before speed/difficulty:

- Treble and Bass single notes: 5,200 ms.
- Sharps and Flats: 5,600 ms.
- Chords: 6,200 ms.

Final travel time is:

```text
round(baseTravelMs * speedMultiplier * difficultyTravelMultiplier)
```

When a queue contains multiple notes, later notes are spawned with an offset of 18% of travel time per queue slot and rendered as subdued previews. Only the front note is answerable.

## Scoring

A correct answer gives:

```text
round((modeBasePoints + speedBonus + streakBonus) * difficultyScoreMultiplier)
```

Where:

- Mode base points are 100 for Treble, 120 for Bass, 150 for Sharps/Flats, and 240 for Chords.
- Speed bonus is 0 below Speed 6, 20 for Speed 6–7, and 40 for Speed 8–10.
- Streak bonus is `min(80, currentStreak * 20)` before the current answer increments the streak.
- Difficulty score multiplier is defined above.

Correct answers:

- increment `correct`;
- increment `streak`;
- update `bestStreak`;
- add points to `score`;
- remove the front note from the queue;
- clear correction overlay.

Wrong answers:

- increment `wrong`;
- reset `streak` to 0;
- keep the active note;
- set beginner teaching feedback;
- create a correction overlay frozen for 1,400 ms.

Missed notes:

- increment `missed`;
- reset `streak` to 0;
- remove the front note from the queue;
- say `<answer> fell off the staff.` in Rush.

## Input modes

### Notes

- Default input.
- Shows large buttons for the answer options of the current mode/lesson.
- In beginner Treble lessons, the tray is narrowed by `getScaffoldedAnswerOptions`.

### Piano

- Shows a one-octave touch piano strip.
- White keys: C, D, E, F, G, A, B.
- Black keys are enabled only in Sharps/Flats modes.
- In Sharps mode black keys show C♯, D♯, F♯, G♯, A♯.
- In Flats mode black keys show D♭, E♭, G♭, A♭, B♭.
- In natural-note or chord modes black keys are disabled.

### Sing/Play microphone

- Shows the microphone status panel instead of note buttons or piano keys.
- Main readout default: `You played —`.
- A detected pitch reads as `You played A4 · 440 Hz · in tune` or with flat/sharp cents.
- A translucent green ghost note shows the detected pitch on the staff.
- The ghost note is diagnostic/readability; scoring uses the pitch classifier.
- The player is told: `Sing the front note. ClefHanger accepts a steady matching pitch class within 50 cents, in any octave for now.`

## Microphone capture and scoring

Current capture request for gameplay uses `getBuiltInVocalMicrophoneConstraints()`:

```js
{
  audio: {
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: true,
    channelCount: 1,
  },
}
```

Rationale: Android Firefox field reports showed usable built-in voice levels with AGC enabled while still disabling cleanup paths that often suppress steady music tones.

`getInstrumentMicrophoneConstraints()` still exists for the raw-instrument profile:

```js
{
  audio: {
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
    channelCount: 1,
  },
}
```

Permission flow:

- If `getUserMedia` is unavailable, the app reports blocked/unavailable.
- Before requesting, the app renders `Requesting mic… check the browser permission prompt.`
- It preflights `navigator.permissions.query({ name: 'microphone' })` when available.
- Already-denied permission throws before a new request.
- The request has an 8-second timeout with site-settings guidance.
- Permission-denied errors include Chrome and Android Settings instructions.
- Stop mic cancels the analyser animation frame and stops all stream tracks.

Audio graph:

- Uses the page `AudioContext`.
- Creates a `MediaStreamAudioSourceNode` and retains it.
- Connects source to an `AnalyserNode` with `fftSize = 4096`.
- Connects analyser through a zero-gain keepalive `GainNode` to destination so Firefox keeps pulling audio.
- Each frame reads a time-domain buffer, centers RMS, and runs the pitch detector.

Pitch detector:

- Playable/displayed frequency range: 80–1000 Hz.
- Minimum centered RMS: 0.0005.
- Lag range is derived from sample rate and the playable frequency range.
- Samples are DC-centered before autocorrelation.
- Normalized correlation threshold: 0.72.
- The detector returns the first strong local maximum.
- Flat/DC buffers and absurd high-frequency spikes are rejected.

Frequency-to-note:

- Uses equal temperament, A4 = 440 Hz, MIDI note rounding.
- Note names include sharps, not flats, at detection time.
- Flat prompts can still match via semitone equivalence; e.g. D♭ prompt can score from detected C♯.

Vocal scoring:

- Default tolerance: 50 cents.
- Stability window: 150 ms on the same answer.
- Post-hit debounce: 650 ms.
- Scoring compares pitch class/semitone and ignores octave for now.
- Chord prompts return `unsupported-chord` and are not scored by microphone.
- Wrong pitch class returns `wrong-note` but does not call `handleAnswer` from the mic loop.
- Same pitch class outside tolerance returns `out-of-tune`.
- A held note must first produce `pending-stable`, then `match` after the stability window.

Public smoke hook:

```js
window.clefhangerInjectPitch(frequency, nowMs?)
```

It calls the same `processMicrophoneFrame(frequencyOverride, nowMs)` path that real microphone frames use. It is intended for local/live browser smoke without a physical microphone.

## Mic Lab and report format

Mic Lab is an advanced diagnostic panel, not the normal player loop.

Controls:

- Label capture as Silence, Voice, Piano, or App A tone.
- Record 1-second test.
- Export mic report.

Recording test behavior:

- Requires a live microphone stream.
- Uses `MediaRecorder` if available.
- Calls `recorder.start(250)`, waits 1 second, calls `requestData` if available, then stops.
- Builds an audio blob from non-empty chunks.
- Attempts `decodeAudioData` on the recorded blob.
- Summarizes decoded RMS/peak and scans pitch windows.
- If MediaRecorder returns 0 bytes, the message includes current live mic level.

Report schema:

- `schema`: `clefhanger-mic-report-v1`.
- `appVersion`: current app marker.
- `capturedAt`: ISO timestamp.
- `capture.label`: user-selected label.
- `environment`: user agent and URL.
- `audioContext`: sample rate and state.
- `track`: readyState, muted, enabled, and browser-reported settings.
- `live`: level percent, raw input level, frequency, detected pitch, track state.
- `recording`: byte count, MIME type, decoded audio summary, pitch-window candidates, best candidate.
- `interpretation`: one of:
  - `recording-pitch-detected-live-silent`
  - `live-pitch-detected`
  - `recording-pitch-detected`
  - `no-recording-bytes`
  - `recording-silent`
  - `audio-level-no-steady-pitch`
  - `no-audio-evidence`

Export format:

- Filename: `clefhanger-mic-<label>-<timestamp>.txt`.
- MIME type: `text/plain`.
- Content: pretty-printed JSON.
- This is intentionally Telegram-friendly.

## Rendering and notation geometry

Staff layout constants:

- Clef x: 26.
- Treble G line y: 112.
- Treble clef loop offset y: 20.
- Treble clef y: 92.
- Bass clef y: 112.
- Bottom staff line y: 132.
- Staff line gap: 20.
- Half-step: 10.
- Ledger line x offset: 22.

Staff rendering:

- Draws five staff lines at y 52, 72, 92, 112, 132.
- Draws a red cliff line at x 294.
- Renders queued notes from later previews first, then lead note last so the lead stays on top.
- Lead note x-position moves from 72 toward 274 according to progress toward deadline.
- Correction labels freeze the note progress at the wrong-answer time while visible.
- Ghost note x is aligned near the active note position and clamped to at least 98.

Ledger lines:

- Staff steps <= -2 draw ledger lines from -2 downward in even steps.
- Staff steps >= 10 draw ledger lines from 10 upward in even steps.
- Other notes do not draw ledger lines.

Ghost-note mapping:

- Uses detected pitch note name/octave and current clef.
- Treble staff step = `-2 + (octave - 4) * 7 + diatonicStepFromC`.
- Bass staff step = `-2 + (octave - 2) * 7 + (diatonicStepFromC - EStep)`.
- Accidentals use the sharp label from detection.

## Audio playback

Correct answers play a synthetic piano-like voice.

Voice plan:

- Duration: 1.1 seconds.
- Envelope:
  - initial gain 0.0001;
  - attack gain 0.24 over 0.008 s;
  - decay gain 0.13 over 0.12 s;
  - release gain 0.0001 over 1.05 s.
- Partials:
  - triangle fundamental, gain 1;
  - sine 2x, gain 0.22;
  - sine 3x, gain 0.09;
  - sine 4x, gain 0.035;
  - sine 5x, gain 0.014.
- Detune cents: 0, -4, 3, -7, 5.

A4 calibration tone:

- Note: A4.
- Frequency: 440 Hz.
- Button label: `Sing A`.
- Help copy: `Listen, then sing it back.`

Chords play prompt frequencies as a short arpeggio with 0.085 seconds between notes.

## Persistence

Stored in `localStorage`:

- `clefhanger.selectedMode.v3`
- `clefhanger.selectedSpeed.v6` with migration fallback from `clefhanger.selectedSpeed.v3`
- `clefhanger.selectedDifficulty.v4`
- `clefhanger.selectedInputMode.v7` with migration fallback from `clefhanger.selectedInputMode.v5`
- `clefhanger.selectedPlayStyle.v1`
- `clefhanger.selectedLesson.v1`
- `clefhanger.showHints.v1`
- `clefhanger.lessonIntroHidden.v1`
- `clefhanger.tutorialDismissed.v1`
- high scores under `clefhanger.highScore.<mode>.speed<speed>.<difficulty>.v5`

There is no cloud sync and no account system.

## Quality gates

Project check command:

```bash
npm run check
```

It runs:

- `npm test` (`node --test tests/*.test.js`);
- syntax checks for `src/app.js`, all core JS modules, and `sw.js`;
- manifest JSON validation;
- `git diff --check`.

Current automated suite covers:

- PWA shell/manifest/service-worker contract.
- Staff/clef/ledger geometry.
- Beginner lessons, tutorial, correction overlay, scaffolded answers.
- Difficulty/queue/speed/high-score separation.
- Core scoring and round lifecycle.
- Mode-specific note pools, accidentals, chords, piano input mapping.
- Audio voice plan and A4 calibration tone.
- Microphone pitch conversion, calibration copy, constraints, pitch detector, low male voice recordings, quiet levels, recorded chunk diagnostics.
- Mic Lab report and Telegram-friendly `.txt` export.
- Microphone shell and public smoke hook markers.

## Live deploy expectations

A complete ClefHanger deploy should:

1. Pass `npm run check`.
2. Commit and push the repo.
3. Upload selected files to `/clefhanger/` on simiono FTPS hosting:
   - `index.html`
   - `manifest.webmanifest`
   - `sw.js`
   - `src/app.js`
   - `src/core/audio.js`
   - `src/core/game.js`
   - `src/core/pitch.js`
   - `src/core/mic-diagnostics.js`
   - `src/core/learning.js`
   - icons
   - current docs that should be publicly readable.
4. Verify live markers with a cache-busting query.
5. Browser-smoke `window.__clefHanger.appVersion` and one real UI path.
6. Verify the root `https://simiono.com/` still serves Quartz, not the app.

## Current known limitations

- Microphone scoring accepts any octave. This is intentional for beginner vocal play but not a full ear-training/octave drill.
- Microphone scoring supports single-note prompts only; chord singing is not implemented.
- Detected pitch names use sharps; flat prompt scoring works by semitone equivalence.
- The pitch detector is a small dependency-free autocorrelation implementation. Pitchy or another robust detector remains a possible future upgrade if field evidence warrants it.
- The app has no user accounts, cloud sync, MIDI input, VexFlow rendering, or full music-theory curriculum.
- Mic Lab reports are diagnostic evidence, not a polished player feature.
