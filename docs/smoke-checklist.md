# ClefHanger Smoke Checklist

Use this checklist before calling a build ready for actual testing.

## Local browser smoke

- Open the app in a phone-sized viewport around 390 × 844.
- The title, timer, score, mode selector, staff, feedback, start button, typed-answer row, and answer buttons are visible without horizontal scrolling.
- Switch through Basics, Sharps #, Flats ♭, and Chords.
- Tap **Start 60s sprint**.
- A treble note or triad appears and moves toward the red cliff edge.
- In Basics, tapping the correct natural note clears it, increases score, and shows positive feedback.
- In Sharps/Flats, accidental button answers and typed answers such as `F#` / `Bb` are accepted.
- In Chords, typed answers such as `C-E-G` are accepted.
- Tapping a wrong note leaves the note active and shows wrong-answer feedback.
- Letting a note reach the cliff records a miss.
- Browser console has no errors.

## Live smoke

- Open `https://simiono.com/clefhanger/` with a cache-busting query.
- Verify the HTML contains `clefhanger-slice2`.
- Verify `src/app.js`, `src/core/game.js`, `manifest.webmanifest`, `sw.js`, and both icons return HTTP 200.
- Repeat the local browser smoke steps against the live URL.
