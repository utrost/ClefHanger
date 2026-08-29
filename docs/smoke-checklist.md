# ClefHanger Smoke Checklist

Use this checklist before calling a build ready for actual testing.

## Local browser smoke

- Open the app in a phone-sized viewport around 390 × 844.
- The title, timer, score, difficulty selector, mode selector, speed selector, staff, feedback, start button, input toggle, and answer controls are visible without horizontal scrolling.
- Switch through Beginner, Easy, Normal, and Hard.
- Switch through Treble, Bass, Sharps #, Flats ♭, and Chords.
- Drag the speed slider from slow to fast and verify the speed label changes.
- Treble mode shows the treble-clef loop anchored on the G line rather than floating above it.
- Bass mode shows a bass clef and lower-register natural notes.
- Tap **Start 60s sprint**.
- A treble note or triad appears and moves toward the red cliff edge.
- On Normal or Hard, extra upcoming notes appear as fainter previews; the front note remains the only answerable note.
- In Treble, tapping the correct natural note clears it, increases score, and shows positive feedback.
- Switch to Piano input, tap the matching white key, and verify it clears the note.
- A correct answer plays a short piano-like pitch cue. Wrong answers do not play the success pitch.
- Switch to Calibrate, tap **Play A**, and verify the same piano-like voice plays a concert A prompt for singing back.
- In Sharps/Flats, accidental button answers such as `F♯` / `B♭` are accepted.
- In Sharps/Flats with Piano input, the black keys use sharp/flat labels for the selected mode.
- In Chords, direct triad buttons such as C, Dm, and Am are accepted.
- Tapping a wrong note leaves the note active and shows wrong-answer feedback.
- Letting a note reach the cliff records a miss.
- Browser console has no errors.

## Live smoke

- Open `https://simiono.com/clefhanger/` with a cache-busting query.
- Verify the HTML contains `clefhanger-slice9-calibration-a`.
- Verify `src/app.js`, `src/core/game.js`, `src/core/audio.js`, `manifest.webmanifest`, `sw.js`, PNG icons, and SVG icons return HTTP 200.
- Verify the manifest has `id: /clefhanger/`, `start_url: ./`, `scope: ./`, `display: standalone`, and `orientation: portrait`.
- In browser devtools/Application or on a phone, verify the install/add-to-home-screen affordance appears.
- After first load, switch the browser offline and reload; the app shell should still open from the service worker cache.
- Repeat the local browser smoke steps against the live URL.
