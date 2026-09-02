# ClefHanger Player and Tester Guide

This guide is for someone opening the current ClefHanger build and trying to use it, test it, or send useful feedback. For a product-level description of what a normal player is supposed to do, see [User Journey](./user-journey.md). For exact constants and implementation details, see [Current State Reference](./current-state-reference.md). For repeatable manual pass/fail cases, see [Human Test Handbook](./human-test-handbook.md).

## What ClefHanger is

ClefHanger is a small mobile-first sight-reading game. Notes move across a staff toward a cliff. You name the front note before it falls.

The current build is beginner-first:

- Practice is the default.
- The first lesson only asks for C, D, and E.
- Interval jumps adds same-note, step, and skip hints before the full mixed set.
- Wrong answers teach the correct note instead of only punishing you.
- Rush mode is still available for 60-second timed play.

## First run

1. Open `https://simiono.com/clefhanger/`.
2. Leave the default settings alone at first:
   - Treble
   - Beginner
   - Speed 5
   - Notes
   - First steps
3. Read the tiny lesson card.
4. Tap **Start practice**.
5. Use the C/D/E buttons.
6. If you guess wrong, look at:
   - the feedback text;
   - the small correction label on the note;
   - the highlighted correct button.

Practice has no timer. The timer shows `∞`.

## Reading the screen

- **Score**: total points this run.
- **Streak**: current chain of correct answers.
- **High**: local best score for the current mode/speed/difficulty combination.
- **Today’s sprint**: compact summary of mode, difficulty, speed, input type, and current lesson/play style.
- **Staff**: where the prompt appears.
- **Cliff**: red line on the right. In Rush, a note is missed when it reaches the cliff.
- **Feedback**: tells you whether the answer was correct, wrong, missed, or whether a round ended.
- **Learning suggestion**: a small non-blocking hint below feedback. It may suggest repeating Practice, trying Rush, moving to the next lesson, lowering speed, or changing only one setting.

## Practice vs Rush

### Practice

Use Practice to learn.

- No timer.
- One note at a time.
- Wrong answer keeps the same note visible.
- Teaching feedback says what the note was and where it sits.
- Correct answer plays the pitch and moves to another practice note.

### Rush

Use Rush when the lesson feels familiar.

- 60-second sprint.
- Notes move toward the cliff.
- Missing a note resets the streak.
- Normal and Hard can show preview notes behind the front note.
- At time-up, the app shows score, accuracy, correct/wrong/missed counts, and best streak.

## Lessons

### First steps

- Buttons: C, D, E.
- Good first test for a new phone/browser.
- Teaches direction before the whole note alphabet appears.

### Line notes

- Buttons: E, G, B, D, F.
- Teaches the five treble staff lines from bottom to top.

### Space notes

- Buttons: F, A, C, E.
- Teaches the spaces spelling FACE.

### Ledger lines

- Buttons: C and A.
- Teaches the first short extra lines just outside the treble staff.

### Interval jumps

- Buttons: C, D, E, F, G.
- Teaches same note, step, or skip: whether the new note repeats, moves one step up/down, or skips over one note.
- This is still note-reading practice, not chord theory.

### Mixed notes

- Buttons: C, D, E, F, G, A, B.
- Uses the full natural-note set in the current beginner range.

## Modes

Open **Settings** to change modes.

- **Treble**: natural treble notes.
- **Bass**: lower-register bass-clef notes.
- **Sharps #**: sharp note names. The learning suggestion explains that `♯` keeps the note on the same staff spot as the natural note, then raises the pitch.
- **Flats ♭**: flat note names. The learning suggestion explains that `♭` keeps the note on the same staff spot as the natural note, then lowers the pitch.
- **Chords**: direct triad-name buttons such as C, Dm, Em, F, G, Am.

Beginner lesson narrowing only applies to Treble + Beginner. Other modes expose their full answer set.

## Difficulty

- **Beginner**: one note, slower travel, normal scoring.
- **Easy**: one note, normal travel, normal scoring.
- **Normal**: two visible notes; only the front one answers. Higher score multiplier.
- **Hard**: three visible notes; only the front one answers. Highest score multiplier.

The preview notes are there to let you prepare, not to be answered early.

## Speed

Speed is a 1–10 slider.

- Lower numbers give more time.
- Higher numbers move notes faster.
- Higher speeds can add a small score bonus.
- High scores are separated by exact speed value, so a Speed 10 score is not compared to Speed 1.

## Input modes

### Notes

This is the default and the best mode for first testing.

- Large touch buttons.
- Lesson-aware narrowing in beginner Treble.
- Works without audio or microphone permission.

### Piano

Use this if you want to connect staff notes to a tiny keyboard shape.

- White keys are C, D, E, F, G, A, B.
- Black keys only become useful in Sharps and Flats modes.
- In natural-note or chord modes, black keys are disabled.

### Sing/Play

Use this to hum, sing, or play a steady single note on a monophonic instrument.

- Select **Sing/Play** in Settings.
- Tap **Grant mic**.
- Allow the browser permission prompt.
- Close Settings if needed.
- Start Practice or Rush.
- Sing or play the front note.

The main mic panel shows what the phone thinks it heard:

```text
You played A4 · 440 Hz · in tune
```

The staff also shows a translucent green ghost note for the detected pitch.

Current scoring rule:

- matching note name/pitch class scores;
- any octave is accepted for now;
- the note must be within about 50 cents;
- the app waits briefly for the same note to be stable;
- one held note is debounced so it does not clear several prompts at once;
- chords are not scored from microphone yet.

## Microphone troubleshooting

### If permission is denied

Use the browser/site settings, not only Android's global settings.

In Chrome-like browsers:

1. Tap the lock/site icon in the address bar.
2. Open Permissions or Site settings.
3. Set Microphone to Allow.
4. Reload the page.

If that still fails, check Android Settings → Apps → browser → Permissions → Microphone.

### If the app says level 0%

That means the browser granted a track but the app is not receiving meaningful audio from the Web Audio analyser.

Try:

- stop mic, grant again;
- reload the page;
- try Firefox if Chrome is stuck, or Chrome if Firefox is stuck;
- run **Record 1s test** while singing.

### If it says too quiet

The app sees audio level, but probably not enough for stable pitch.

Try:

- sing closer to the phone;
- hold one note longer;
- avoid speaking words; hum or sing a vowel;
- try a comfortable low note rather than forcing A4.

### If it hears a note but does not score

Possible reasons:

- It is the wrong note name.
- It is more than about 50 cents sharp/flat.
- The note did not stay stable long enough.
- The current prompt is a chord; mic scoring does not support chords yet.

## Mic Lab reports

Mic Lab is for debugging browser/phone behavior.

Use it when the normal mic panel does not explain what happened.

1. Select a label: Silence, Voice, Piano, or App A tone.
2. Tap **Record 1s test** while making the sound.
3. Tap **Export mic report**.
4. Send back the downloaded `.txt` file.

A useful report contains:

- browser and URL;
- app version;
- actual microphone track settings;
- live analyser level/pitch;
- recorded byte count;
- decoded RMS/peak;
- recorded pitch-window candidates;
- interpretation such as `live-pitch-detected` or `recording-pitch-detected-live-silent`.

## Good manual smoke test

Use this when checking a fresh deploy.

1. Open a cache-busted URL, e.g. `https://simiono.com/clefhanger/?verify=<commit>`.
2. Confirm the page shows `Slice 50: mic recording diagnostic adapter`.
3. Tap **Start practice**.
4. Tap a wrong C/D/E answer and verify teaching feedback plus highlighted correct answer.
5. Tap the correct answer and verify score increases and a pitch plays.
6. Open Settings.
7. Switch to Piano, close Settings, and answer with a piano key.
8. Open Settings.
9. Switch to Sing/Play.
10. If no physical mic test is possible, open DevTools console and run:

```js
window.__clefHanger.selectInputMode('microphone')
window.__clefHanger.startPractice()
window.clefhangerInjectPitch(440, 1000)
window.clefhangerInjectPitch(440, 1160)
```

If the active prompt is A, this should score after the stability window. If the prompt is not A, use the frequency for the active note or use the visual readout only.

## Known rough edges

- It is still a hand-made SVG notation prototype, not a full notation engine.
- Microphone scoring is intentionally forgiving and octave-agnostic for beginner play.
- Chord singing is not designed yet.
- Phone/browser microphone behavior varies; Mic Lab exists because real devices disagree.
- All high scores are local to the browser/device.
