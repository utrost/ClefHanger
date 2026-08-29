# ClefHanger Smoke Checklist

Use this checklist before calling a build ready for actual testing.

## Local browser smoke

- Open the app in a phone-sized viewport around 390 × 844.
- The title, timer, score, compact settings summary, staff, feedback, start button, and answer controls are visible without horizontal scrolling.
- Open Settings.
- Switch through Beginner, Easy, Normal, and Hard.
- Switch through Treble, Bass, Sharps #, Flats ♭, and Chords.
- Drag the speed slider from slow to fast and verify the speed label and compact settings summary change.
- Treble mode shows the treble-clef loop anchored on the G line rather than floating above it.
- Bass mode shows a bass clef and lower-register natural notes.
- Tap **Start 60s sprint**.
- A treble note or triad appears and moves toward the red cliff edge.
- On Normal or Hard, extra upcoming notes appear as fainter previews; the front note remains the only answerable note.
- In Treble, tapping the correct natural note clears it, increases score, and shows positive feedback.
- In Settings, switch to Piano input, close Settings, tap the matching white key, and verify it clears the note.
- In Settings, switch to Mic input; the main answer tray should show the microphone status panel and a `You played —` heard-note readout instead of note buttons or piano keys.
- A correct answer plays a short piano-like pitch cue. Wrong answers do not play the success pitch.
- In Settings, tap **Grant mic**. If the browser prompts, allow microphone access; the status should change from mic-off to listening.
- Tap **Play A**, sing A back, and verify both the settings calibration readout and the main `You played A4 · 440 Hz · in tune` style readout update with detected note, Hz, and cents. Implausible high-frequency noise spikes should fall back to the steady-pitch prompt rather than showing octave-8/9 note names. If no microphone is available, verify the blocked/unavailable message is visible and the console stays clean.
- With Mic input selected during a round, sing the front natural note; a steady in-tune pitch should clear it. Chord singing is not expected to score yet.
- In Sharps/Flats, accidental button answers such as `F♯` / `B♭` are accepted.
- In Sharps/Flats with Piano input, the black keys use sharp/flat labels for the selected mode.
- In Chords, direct triad buttons such as C, Dm, and Am are accepted.
- Tapping a wrong note leaves the note active and shows wrong-answer feedback.
- Letting a note reach the cliff records a miss.
- Browser console has no errors.

## Live smoke

- Open `https://simiono.com/clefhanger/` with a cache-busting query.
- Verify the HTML contains `clefhanger-slice13-mic-noise-range-filter`.
- Verify `src/app.js`, `src/core/game.js`, `src/core/audio.js`, `src/core/pitch.js`, `manifest.webmanifest`, `sw.js`, PNG icons, and SVG icons return HTTP 200.
- Verify the manifest has `id: /clefhanger/`, `start_url: ./`, `scope: ./`, `display: standalone`, and `orientation: portrait`.
- In browser devtools/Application or on a phone, verify the install/add-to-home-screen affordance appears.
- After first load, switch the browser offline and reload; the app shell should still open from the service worker cache.
- Repeat the local browser smoke steps against the live URL.
