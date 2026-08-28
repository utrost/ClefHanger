# ClefHanger Smoke Checklist

Use this checklist before calling a build ready for actual testing.

## Local browser smoke

- Open the app in a phone-sized viewport around 390 × 844.
- The title, timer, score, staff, feedback, start button, and all seven answer buttons are visible without horizontal scrolling.
- Tap **Start 60s sprint**.
- A treble note appears and moves toward the red cliff edge.
- Tapping the correct note clears it, increases score, and shows positive feedback.
- Tapping a wrong note leaves the note active and shows wrong-answer feedback.
- Letting a note reach the cliff records a miss.
- Browser console has no errors.

## Live smoke

- Open `https://simiono.com/clefhanger/` with a cache-busting query.
- Verify the HTML contains `clefhanger-slice1`.
- Verify `src/app.js`, `src/core/game.js`, `manifest.webmanifest`, `sw.js`, and both icons return HTTP 200.
- Repeat the local browser smoke steps against the live URL.
