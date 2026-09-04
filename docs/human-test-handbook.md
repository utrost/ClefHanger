# ClefHanger Human Test Handbook

This handbook is a human-executable test script for the current ClefHanger build. It turns the smoke checklist and player guide into repeatable test cases with clear pass/fail evidence.

Use it when validating a local build, a live deploy, a phone browser, or a microphone change. It is intentionally practical: follow the steps, mark pass/fail, and capture screenshots or Mic Lab reports only where they help debugging.

Related docs:

- [Player and Tester Guide](./player-tester-guide.md) for normal player instructions and troubleshooting.
- [Smoke Checklist](./smoke-checklist.md) for the shorter release checklist.
- [Current State Reference](./current-state-reference.md) for exact constants and implementation rules.
- [User Journey](./user-journey.md) for the intended beginner path.

## Test session header

Copy this block into your notes before a run.

```text
Date/time:
Tester:
Build URL:
Cache-busting query:
Visible slice marker:
Device:
OS/browser:
Viewport/orientation:
Network: online / offline / flaky
Microphone tested: yes / no
Result: pass / fail / blocked
Evidence files/screenshots:
Notes:
```

## Test result language

Use these result labels consistently:

- **Pass**: expected result observed.
- **Fail**: expected result not observed; include screenshot, console error, or report if possible.
- **Blocked**: could not run because device/browser/network/permission was unavailable.
- **Not applicable**: intentionally skipped because the test does not fit this device or run.

## Before you start

1. Use a fresh URL when testing live, for example `https://simiono.com/clefhanger/?verify=<commit-or-date>`.
2. If testing local, run:

```bash
npm run serve
```

Then open `http://localhost:4173/`.

3. Use a phone-sized viewport if testing on desktop: roughly 390 x 844, portrait.
4. Keep browser devtools console visible when testing desktop.
5. On phone, take screenshots for layout problems and export Mic Lab reports for microphone problems.

## Critical pass criteria

A build should not be called ready if any critical case fails:

- HT-01 app shell loads with the current slice marker and no console errors.
- HT-03 beginner first run is usable without opening Settings.
- HT-04 Practice wrong answer teaches and keeps the note active.
- HT-05 Practice correct answer advances and plays audio.
- HT-08 Rush reaches a usable summary.
- HT-10 input switching shows exactly one answer surface.
- HT-12 microphone permission path gives visible progress or an actionable error.
- HT-16 live deploy assets and cache markers are coherent.

## Test cases

### HT-01 — App shell and mobile layout

Purpose: prove the page opens as a usable mobile-first app.

Setup:

- Open local or live app in portrait phone viewport.
- If live, use a cache-busting query.

Steps:

1. Load the app.
2. Find the visible slice marker.
3. Check that the title, timer, score/high score, compact settings summary, tutorial/lesson area, staff, feedback, start button, and answer controls are visible.
4. Check there is no horizontal scrolling.
5. Check browser console for errors if devtools are available.

Expected:

- Page loads without a blank screen.
- Visible marker says `Slice 52: hide answer reveal`.
- Main controls fit in portrait.
- Console has no runtime errors.

Evidence:

- Screenshot if layout is cramped, clipped, or horizontally scrollable.
- Console error text if present.

### HT-02 — Settings dialog and selectors

Purpose: prove all player-facing settings can be changed and reflected in the compact summary.

Steps:

1. Open **Settings**.
2. Switch difficulty through Beginner, Easy, Normal, and Hard.
3. Switch mode through Treble, Bass, Sharps #, Flats ♭, and Chords.
4. Drag speed from slow to fast.
5. Switch input through Notes, Piano, and Sing/Play.
6. Close Settings after each major change and inspect the compact summary.

Expected:

- Settings opens and closes reliably.
- Labels and compact summary update.
- No setting change causes the app to freeze or lose the main controls.

Evidence:

- Screenshot if any selector is hidden, clipped, or does not visibly update.

### HT-03 — Beginner default first run

Purpose: prove a new beginner can start without configuration.

Setup:

- Reload the app.
- If previous preferences interfere, reset to Treble, Beginner, Speed 5, Notes, First steps, Practice.

Steps:

1. Confirm Practice is selected.
2. Confirm First steps lesson is selected.
3. Confirm answer buttons are only C, D, and E.
4. Read the tiny lesson/tutorial card.
5. Tap **Start practice**.

Expected:

- Timer shows `∞`.
- A single note appears.
- No rush summary appears.
- The user can start without opening Settings.

Evidence:

- Screenshot if defaults are confusing or not visible.

### HT-04 — Practice wrong-answer teaching loop

Purpose: prove wrong answers teach instead of only punishing.

Setup:

- Treble, Beginner, First steps, Practice, Notes input.
- Start Practice.

Steps:

1. Identify the active note if possible.
2. Tap a deliberately wrong visible answer.
3. Observe feedback, staff, and answer buttons.
4. Tap the highlighted/correct answer.

Expected:

- Feedback names the correct answer and gives a location hint.
- Staff shows a small correction label near the note.
- Correct answer button is highlighted.
- The same prompt remains active after the wrong answer.
- Tapping the correct answer advances to a new prompt.

Evidence:

- Screenshot of correction overlay if it is missing, misplaced, or unreadable.

### HT-05 — Practice correct answer and audio cue

Purpose: prove correct answers score, advance, and play a pitch.

Setup:

- Notes input, Practice started.

Steps:

1. Tap the correct answer for the active prompt.
2. Watch score/streak/feedback.
3. Listen for the short piano-like pitch cue.

Expected:

- Score increases.
- Streak increases.
- Feedback is positive.
- Prompt advances.
- A short success pitch plays.

Evidence:

- Note if device is muted or audio cannot be verified.

### HT-06 — Beginner lessons

Purpose: prove the beginner ramp exposes the intended material.

Steps:

1. In Treble + Beginner + Practice + Notes, select **First steps**.
2. Confirm C/D/E buttons.
3. Select **Line notes**.
4. Confirm E/G/B/D/F buttons and an intro card.
5. Select **Space notes**.
6. Confirm F/A/C/E buttons and an intro card.
7. Select **Ledger lines**.
8. Confirm C/A buttons and ledger-line notes just outside the staff.
9. Select **Interval jumps**.
10. Confirm C/D/E/F/G buttons and an intro card.
11. Answer at least two interval prompts correctly.
12. Select **Mixed notes**.
13. Confirm C/D/E/F/G/A/B buttons.

Expected:

- Each lesson changes the answer tray and prompt pool as described.
- Line/space/ledger/interval lessons show small intro cards.
- Interval feedback mentions same note, step, skip, or jump after there is a previous prompt.

Evidence:

- Screenshots for any lesson with wrong buttons, missing intro, or unreadable note positions.

### HT-07 — Staff rendering, clefs, ledger lines, and previews

Purpose: prove notation remains visually readable across modes and difficulties.

Steps:

1. Select Treble and start a run.
2. Confirm treble clef is anchored around the G line.
3. Select Bass and start a run.
4. Confirm bass clef and lower-register notes appear.
5. Select Treble + Ledger lines.
6. Confirm only true outside-staff notes get short ledger lines.
7. Select Normal difficulty and start Rush.
8. Confirm a fainter preview note appears behind the front note.
9. Select Hard difficulty and start Rush.
10. Confirm up to three visible notes, with only the front one answerable.

Expected:

- Clefs are recognizable and aligned.
- Ledger lines are short and only appear where needed.
- Preview notes are visibly subdued.
- Answering a preview note's name early should not clear the preview unless it is also the front answer.

Evidence:

- Screenshot for visual alignment/readability problems.

### HT-08 — Rush round and summary

Purpose: prove the original 60-second game loop still works.

Setup:

- Treble, Beginner or Easy, Rush, Notes input.

Steps:

1. Tap **Start 60s sprint**.
2. Answer several notes.
3. Let at least one note reach the cliff.
4. Wait until timer reaches 0.
5. Tap **Play another 60s rush**.

Expected:

- Notes move toward the red cliff.
- Missed notes count as misses and reset streak.
- At time-up, centered summary appears with score, accuracy, correct/wrong/missed counts, and best streak.
- Replay button starts a new rush.

Evidence:

- Screenshot if summary is missing, clipped, or incorrect.

### HT-09 — Accidentals and chords

Purpose: prove non-natural modes remain playable from touch controls.

Steps:

1. Select Sharps # + Notes input.
2. Start Practice or Rush.
3. Confirm sharp answer buttons such as `F♯` appear and score when correct.
4. Select Flats ♭ + Notes input.
5. Confirm flat answer buttons such as `B♭` appear and score when correct.
6. Switch to Piano input in Sharps/Flats.
7. Confirm black keys use sharp/flat labels for the selected mode.
8. Select Chords + Notes input.
9. Confirm direct chord buttons such as C, Dm, Em, F, G, Am appear and score when correct.

Expected:

- Accidentals can be answered without typing.
- Piano black-key labels match sharp/flat mode.
- Chord mode uses direct triad buttons.
- Chord singing is not expected to score in microphone mode.

Evidence:

- Screenshot if labels are wrong or touch targets are too small.

### HT-10 — Input switching surfaces

Purpose: prove only the selected answer input is visible.

Steps:

1. Select Notes input.
2. Confirm note buttons are visible, piano and mic panel are not the primary answer surface.
3. Select Piano input.
4. Confirm piano strip is visible and note buttons are hidden as the primary answer surface.
5. Select Sing/Play input.
6. Confirm microphone panel and `You played —` readout are visible instead of note buttons or piano keys.
7. Switch back to Notes.

Expected:

- Exactly one main answer surface is shown for the selected input.
- Switching does not lose current mode/speed/difficulty unexpectedly.

Evidence:

- Screenshot if multiple answer surfaces overlap.

### HT-11 — Piano input

Purpose: prove the touch piano strip answers prompts.

Setup:

- Treble, Beginner or Easy, Practice, Piano input.

Steps:

1. Start Practice.
2. Identify the active prompt.
3. Tap the matching white piano key.
4. In Sharps or Flats, tap a matching black key when a sharp/flat prompt appears.

Expected:

- Matching piano key clears the note.
- Score/streak update like note-button input.
- Black keys are useful for accidental modes and disabled/not used for natural-only modes.

Evidence:

- Screenshot if piano keys are too small or mislabeled.

### HT-12 — Microphone permission and visible status

Purpose: prove microphone setup gives visible progress or a useful error.

Setup:

- Use a device/browser with a microphone if possible.
- Select Sing/Play input.

Steps:

1. Open Settings.
2. Tap **Grant mic**.
3. Observe the calibration/status line immediately.
4. Respond to browser permission prompt.
5. Close Settings and inspect the main mic panel.

Expected:

- Status changes immediately to `Requesting mic…` or equivalent visible progress.
- If permission is granted, status becomes listening and track state remains live.
- If permission is denied/unavailable/timed out, message gives actionable site/browser/Android permission instructions.
- UI does not appear dead while waiting.

Evidence:

- Screenshot of permission or error state.
- Browser and OS version in notes.

### HT-13 — Microphone heard-note display and ghost note

Purpose: prove the app can show what it hears before judging score.

Setup:

- Sing/Play input with granted mic.
- Quiet room preferred.

Steps:

1. Sing or hum one comfortable steady note for at least one second.
2. Watch the main `You played ...` readout.
3. Watch the settings calibration readout if Settings is open.
4. Watch the green ghost note on the staff.
5. Try a comfortable low voice note such as G2/A2/B2/C3 if available.

Expected:

- Readout shows note name, Hz, cents, in-tune/sharp/flat status, and a nonzero level when audio is present.
- Staff shows a translucent green ghost note labelled `you played ...`.
- Implausible octave-8/9 spikes are not shown as the main heard note.
- If no pitch locks, panel distinguishes no audio, too quiet, or non-steady pitch.

Evidence:

- Screenshot if readout/ghost note is wrong.
- Mic Lab report if the analyser and recording disagree.

### HT-14 — Microphone scoring for single notes

Purpose: prove sung/played notes can clear matching single-note prompts.

Setup:

- Sing/Play input with granted mic.
- Treble natural-note prompt in Practice or Rush.
- Use a quiet room, voice, whistle, or monophonic acoustic instrument.

Steps:

1. Start Practice.
2. Identify the front prompt note.
3. Sing or play that note name/pitch class in any comfortable octave.
4. Confirm **Match any octave** is checked in Settings.
5. Hold it steady briefly.
6. If practical, uncheck **Match any octave** and sing the same note name in a different octave.
7. Try a wrong note and an out-of-tune/bent note if practical.

Expected:

- Matching pitch class inside tolerance clears the prompt after the stability window when **Match any octave** is checked.
- Different octave can still score while **Match any octave** is checked.
- Different octave does not score while **Match any octave** is unchecked.
- Wrong pitch class is visible but does not call a wrong answer every frame.
- Same pitch class outside tolerance reports out-of-tune and does not score until close enough.
- One held note does not clear multiple prompts rapidly.

Evidence:

- Screenshot or report if it hears pitch but does not score.

### HT-15 — Mic Lab recording report

Purpose: produce useful evidence when mic behavior is suspicious.

Setup:

- Sing/Play input.
- Microphone granted if possible.

Steps:

1. Choose a Mic Lab label: Silence, Voice, Piano, or App A tone.
2. Tap **Record 1s test** while making the chosen sound.
3. Wait for the diagnostic result.
4. Tap **Export mic report**.
5. Send or save the downloaded `clefhanger-mic-...txt` file.

Expected:

- Diagnostic records byte count.
- If decodable, report includes decoded RMS/peak.
- If a steady pitch is present, report includes pitch-window candidates and a best candidate.
- Exported file is `.txt` containing JSON with schema `clefhanger-mic-report-v1`.
- Report includes browser URL, app version, track settings, live analyser evidence, recording evidence, and interpretation.

Evidence:

- The exported `.txt` report.

### HT-16 — Live deploy asset and cache check

Purpose: prove the live site serves a coherent app shell after deploy.

Setup:

- Use terminal or browser network panel.
- Replace `<verify>` with a commit SHA or timestamp.

Steps:

1. Open `https://simiono.com/clefhanger/?verify=<verify>`.
2. Confirm the HTML contains `clefhanger-slice52-hide-answer-reveal`.
3. Confirm these assets return HTTP 200:
   - `manifest.webmanifest`
   - `sw.js`
   - `src/app.js`
   - `src/core/audio.js`
   - `src/core/content.js`
   - `src/core/game.js`
   - `src/core/learning.js`
   - `src/core/lessons.js`
   - `src/core/mic-diagnostics.js`
   - `src/core/music-theory.js`
   - `src/core/pitch.js`
   - `src/core/scoring.js`
   - `src/platform/mic-recording-diagnostic.js`
   - `src/platform/microphone-session.js`
   - `src/platform/storage.js`
   - `src/ui/staff-renderer.js`
   - icons
4. Confirm `sw.js` contains `clefhanger-pwa-v46`.
5. Confirm `https://simiono.com/` still serves the main Garden site, not the ClefHanger app.

Expected:

- App marker, module files, manifest, service worker, and icons are all reachable.
- Root site remains unaffected.

Evidence:

- Terminal output or browser screenshots for failed requests.

### HT-17 — Offline/installable PWA behavior

Purpose: prove the app can be installed and at least shell-load offline.

Setup:

- Use browser devtools Application panel or phone add-to-home-screen flow.

Steps:

1. Open live app online.
2. Confirm browser shows install/add-to-home-screen affordance if supported.
3. Let the app load once.
4. Switch browser/network offline.
5. Reload the app URL or open installed app shortcut.

Expected:

- Manifest has app identity/scope/start URL/display/orientation suitable for install.
- Offline reload still opens the app shell from service-worker cache.
- No stale mixed-module crash appears after reload.

Evidence:

- Screenshot if install affordance is missing or offline load fails.

### HT-18 — Deterministic no-hardware pitch smoke

Purpose: test the microphone scoring path without physical microphone hardware.

Setup:

- Desktop browser with devtools console.
- App loaded.

Steps:

1. Run this in console:

```js
const app = window.__clefHanger
app.selectInputMode('microphone')
app.startPractice()
app.getState().activeNote.answer
```

2. Pick the matching frequency for the active note:

```js
const freqs = { C: 130.81, D: 146.83, E: 164.81, F: 174.61, G: 196, A: 220, B: 246.94 }
const answer = app.getState().activeNote.answer.replace(/[♯♭]/g, '')
const freq = freqs[answer]
window.clefhangerInjectPitch(freq, 1000)
window.clefhangerInjectPitch(freq, 1160)
app.getState().correct
```

Expected:

- First injection alone does not score because the stability window has not completed.
- Second injection scores a matching single-note prompt.
- `app.getState().correct` increases.
- This path must remain the same scoring path as live mic frames.

Evidence:

- Console output if scoring does not increment.

## Exploratory phone dogfood script

Use this when the goal is product feel, not only pass/fail correctness.

1. Open live app on a real phone.
2. Do not open Settings.
3. Play First steps in Practice for one minute.
4. Intentionally make one wrong answer and read the correction.
5. Switch to Line notes and play until one correction appears.
6. Try one Rush on the same material.
7. Switch to Piano input for the same lesson.
8. Switch to Sing/Play only after Notes input feels understood.
9. If the mic feels wrong, export a Voice Mic Lab report.
10. Write three notes:
    - What was obvious?
    - What was cramped/confusing?
    - What would you change first?

Capture screenshots for cramped screens, unreadable notes, hidden controls, or confusing copy.

## Failure report template

```text
Test case ID:
Result: fail / blocked
Build URL:
Device/browser:
Steps completed:
Expected:
Actual:
Screenshot/report path:
Console errors:
Can reproduce: yes / no / unknown
Notes:
```

## Quick release run

For a small docs-only change, run HT-01 and HT-16.

For a UI/CSS change, run HT-01 through HT-11 plus HT-17.

For a game/core/scoring/lesson change, run HT-03 through HT-11 and HT-18.

For a microphone change, run HT-10 through HT-15 and HT-18 on desktop, then at least HT-12 through HT-15 on one real phone.

For a full release candidate, run all test cases.
