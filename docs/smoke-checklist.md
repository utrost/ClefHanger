# ClefHanger Smoke Checklist

Use this checklist before calling a build ready for actual testing.

For exact current rules and constants, see [Current State Reference](./current-state-reference.md). For what a normal player is supposed to do, see [User Journey](./user-journey.md). For a first-time tester walkthrough, see [Player and Tester Guide](./player-tester-guide.md). For a repeatable pass/fail manual script, see [Human Test Handbook](./human-test-handbook.md).

## Local browser smoke

- Open the app in a phone-sized viewport around 390 × 844.
- The title, timer, score, compact settings summary, beginner tutorial, practice/rush controls, lesson selector, staff, feedback, start button, and answer controls are visible without horizontal scrolling.
- Open Settings.
- Switch through Beginner, Easy, Normal, and Hard.
- Switch through Treble, Bass, Sharps #, Flats ♭, and Chords.
- Drag the speed slider from slow to fast and verify the speed label and compact settings summary change.
- Treble mode shows the treble-clef loop anchored on the G line rather than floating above it.
- Bass mode shows a bass clef and lower-register natural notes.
- The beginner default shows Practice selected, First steps selected, and only C/D/E answer buttons.
- Select Line notes, Space notes, Ledger lines, and Interval jumps; each should show a small lesson intro card with concrete examples.
- Ledger lines practice should show only C/A answer buttons and notes on the first ledger lines below/above the treble staff.
- Interval jumps practice should show C/D/E/F/G buttons; after one correct answer, the learning suggestion should describe same note, step, skip, or jump movement from the previous prompt.
- Tap **Start practice**. The timer should show `∞`, the note should stay in place long enough to study it, and no sprint summary should appear.
- Tap a wrong note in Practice. The feedback should name the correct answer, the staff should show a small correction label on the note, and the correct answer button should be highlighted.
- Switch to **Rush** and tap **Start 60s sprint**.
- A treble note or triad appears and moves toward the red cliff edge.
- On Normal or Hard, extra upcoming notes appear as fainter previews; the front note remains the only answerable note.
- In Treble, tapping the correct natural note clears it, increases score, and shows positive feedback.
- In Settings, switch to Piano input, close Settings, tap the matching white key, and verify it clears the note.
- In Settings, switch to Sing/Play input; the main answer tray should show the microphone status panel and a `You played —` heard-note readout instead of note buttons or piano keys.
- A correct answer plays a short piano-like pitch cue. Wrong answers do not play the success pitch.
- In Settings, tap **Grant mic**. The settings calibration line should immediately show `Requesting mic…`; if Chrome denies or never returns a permission result it should show a site-settings hint instead of appearing dead. If the browser prompts, allow microphone access; the status should change from mic-off to listening.
- Sing any steady comfortable note and verify both the settings calibration readout and the main `You played G2 · 98 Hz · in tune` / `You played A4 · 440 Hz · in tune` style readout update with detected note, Hz, cents, and a listening level; the staff should also show a translucent green ghost note labelled `you played ...` at the detected staff position. **Play A** is only an optional reference tone. Implausible high-frequency noise spikes should fall back to the steady-pitch prompt rather than showing octave-8/9 note names. If no note appears after mic access is granted, verify the Mic panel distinguishes `level 0%` no-audio, too-quiet input, and no-steady-pitch input. Run **Record 1s test** while singing; it should report captured bytes, a decoded level if decodable, and a recorded pitch if the chunked detector can lock. Use Mic Lab to label the capture as Silence, Voice, Piano, or App A tone, then tap **Export mic report** and verify it downloads a `clefhanger-mic-...txt` JSON report. If no microphone is available, verify the blocked/unavailable message is visible and the console stays clean.
- For piano/speaker tests, prefer a steady tone from a second device or the room speaker rather than hidden system audio routing. Check the exported report's `track.settings`; `echoCancellation` and `noiseSuppression` should be false in browsers that honor the built-in-vocal profile, while `autoGainControl` may intentionally be true for phone voice input.
- With Sing/Play input selected during Practice or Rush, keep **Match any octave** checked, then sing or play the front single note on a monophonic instrument; a steady in-tune pitch should draw the green ghost note and clear the prompt when the pitch class matches, even in a different octave. Chord singing is not expected to score yet. For deterministic smoke without hardware, use `window.clefhangerInjectPitch(440)` from the console while an A prompt is active.
- In Sharps/Flats, accidental button answers such as `F♯` / `B♭` are accepted.
- In Sharps/Flats with Piano input, the black keys use sharp/flat labels for the selected mode.
- In Chords, direct triad buttons such as C, Dm, and Am are accepted.
- Tapping a wrong note leaves the note active and shows wrong-answer feedback.
- Letting a note reach the cliff records a miss.
- Let the Rush timer reach `0`; the playfield should show a centered **Time! Sprint complete** splash with points, accuracy, correct/wrong/missed counts, best streak, and a **Play another 60s rush** button.
- Browser console has no errors.

## Live smoke

- Open `https://simiono.com/clefhanger/` with a cache-busting query.
- Verify the HTML contains `clefhanger-slice51-mic-octave-match-toggle`.
- Verify `src/app.js`, `src/core/game.js`, `src/core/content.js`, `src/core/scoring.js`, `src/core/learning.js`, `src/core/lessons.js`, `src/core/audio.js`, `src/core/pitch.js`, `src/platform/storage.js`, `src/platform/microphone-session.js`, `src/platform/mic-recording-diagnostic.js`, `manifest.webmanifest`, `sw.js`, PNG icons, and SVG icons return HTTP 200.
- Verify the manifest has `id: /clefhanger/`, `start_url: ./`, `scope: ./`, `display: standalone`, and `orientation: portrait`.
- In browser devtools/Application or on a phone, verify the install/add-to-home-screen affordance appears.
- After first load, switch the browser offline and reload; the app shell should still open from the service worker cache.
- Repeat the local browser smoke steps against the live URL.
