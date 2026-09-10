# ClefHanger User Journey

This document describes what a normal ClefHanger user is supposed to do. It is written from the product/user side, not from the developer or tester side.

For detailed playtesting and microphone troubleshooting, see [Player and Tester Guide](./player-tester-guide.md). For exact implemented rules, scoring, and limits, see [Current State Reference](./current-state-reference.md).

## Who the user is

ClefHanger is for someone who wants short, low-friction sight-reading practice without setting up a keyboard, MIDI device, or notation software.

Typical users:

- a beginner learning the treble staff;
- a singer who wants to connect written notes to pitch;
- a choir member practicing note recognition;
- an acoustic instrumentalist with no MIDI gear nearby;
- someone on a phone who wants a one-minute practice round.

The app should not feel like a theory exam. It should feel like a tiny arcade drill that gradually teaches what the notes are.

## Canonical first-user workflow

The canonical first-user workflow is **Sing/Play/Practice/First steps**.

A first-time user should be able to do this without opening Settings:

1. Open `https://simiono.com/clefhanger/` on a phone.
2. Read the short tutorial card: sing or hum the note you see.
3. Stay with the default setup:
   - Practice style;
   - Treble mode;
   - Beginner difficulty;
   - Speed 5;
   - First steps lesson;
   - Sing/Play input.
4. Tap **Check mic**.
5. Allow microphone permission if the browser asks.
6. Sing or hum any comfortable steady note so the app can show what it hears.
7. Tap **Start practice**.
8. Look at the front staff note.
9. Sing, hum, or play that note steadily.
10. Read the feedback:
    - `Good — I hear E4` means the mic path is alive;
    - `I hear G2 — need E` means adjust pitch toward the shown note;
    - `Almost E — a little high/low` means keep the note name and adjust tuning.
11. Repeat until C, D, and E feel familiar.
12. Use Notes or Piano only as a quiet fallback, comparison, or debugging path.

The user is not expected to configure anything before the first practice run. The only permission step is the microphone prompt.

## The basic loop

In every practice attempt, the user does the same core action:

1. See the front note on the staff.
2. Make one steady pitch for that note.
3. Receive immediate feedback.
4. Adjust pitch or repeat.
5. Build recognition through repetition.

The app should make the next useful action obvious:

- if the mic is off, tap **Check mic**;
- if practice has not started, tap **Start practice**;
- if a note is visible, sing/hum/play the visible front note;
- if the app hears the wrong note, adjust pitch instead of speaking the note name;
- if the lesson feels easy, try Rush on the same lesson;
- if the environment is noisy, use Notes or Piano as a fallback.

## The golden path

ClefHanger is microphone-first: the intended path is to answer by singing, humming, or playing the note.

Start simple and add only one challenge at a time:

1. **First steps / Practice / Sing/Play**.
2. **Line notes / Practice / Sing/Play**.
3. **Space notes / Practice / Sing/Play**.
4. **Ledger lines / Practice / Sing/Play**.
5. **Interval jumps / Practice / Sing/Play**.
6. **Mixed notes / Practice / Sing/Play**.
7. **The same material in Rush**.
8. **Notes or Piano fallback** only when the room, browser, or voice makes microphone work impractical.

This path keeps the question clear: first connect the staff position to a sung/played pitch, then add speed, then optionally try a different input style.

## When to move on

Use this loose learning contract:

- Stay in Practice until about **8 out of 10** answers feel easy.
- Then try one Rush round on the same lesson.
- If Rush is below about **70% accuracy**, repeat that lesson in Practice.
- If Rush is above about **80% accuracy**, try the next lesson.
- If one note keeps causing mistakes, return to the lesson that isolates that note group.
- Do not increase lesson breadth, speed, and difficulty at the same time.

These numbers are guide rails, not exams. The app shows a small learning suggestion after answers and Rush summaries to help choose the next useful step without locking progress.

## Change one thing at a time

Settings can change several things at once: lesson, mode, speed, difficulty, and input mode. A beginner should change only one knob between attempts.

Good changes:

- New lesson? Keep Beginner + Sing/Play.
- Trying Rush? Keep the same lesson and input.
- Trying Piano? Keep the same lesson and difficulty.
- Trying Notes? Treat it as fallback/debug, not the main path.
- Raising speed? Do not also raise difficulty.

If the app suddenly feels too hard, return to Practice + Beginner + First steps + Sing/Play. If the room is too noisy, use Notes fallback for that session.

## How to use mistakes

A wrong note is part of the lesson.

When the app shows a correction:

1. **Pause on the correction** for a moment.
2. Read the note name.
3. Notice whether it is on a line, space, or ledger line.
4. Look at the ghost note and the feedback text.
5. Sing or play again before changing settings.

Do not rush through corrections. The small pause is where the learning happens.

## What the user should do in Practice

Practice is the default learning mode.

The user should:

1. Pick one lesson.
2. Tap **Check mic** if the mic is not already ready.
3. Tap **Start practice**.
4. Sing or hum slowly.
5. Treat wrong notes as hints.
6. Repeat until the note positions become familiar.
7. Move to a broader lesson only when the current one feels boring.

Recommended order:

1. **First steps** — only C, D, E.
2. **Line notes** — E, G, B, D, F.
3. **Space notes** — F, A, C, E.
4. **Ledger lines** — C and A just outside the staff.
5. **Interval jumps** — C through G with same-note, step, and skip hints.
6. **Mixed notes** — all seven natural note names.

Practice is not about score. It is about recognizing the note and producing a steady matching pitch quickly enough that Rush will later feel playful instead of stressful.

## What the user should do in Rush

Rush is the timed arcade mode.

The user should switch to Rush when a lesson feels familiar in Practice.

In Rush, the user should:

1. Watch the front note, not the preview notes behind it.
2. Sing or play before the note reaches the cliff.
3. Accept that missed notes reset the streak.
4. Try to improve score and accuracy over short 60-second rounds.
5. Replay immediately if the round felt close.

Rush is for fluency and recall speed. It is not the best place to learn a brand-new note position.

## What the user should do with input modes

### Sing/Play input

Use this first.

The user taps **Check mic**, allows permission, then sings, hums, whistles, or plays one steady note on a monophonic instrument.

Use Sing/Play input when:

- trying the app for the first time in a reasonably quiet place;
- learning a lesson through ear/voice connection;
- the user can hold one steady note briefly;
- the prompt is a single note, not a chord.

The user should not speak note names into the microphone. The microphone listens for pitch, not speech.

### Notes input

Use this as a fallback.

The user taps large note-name buttons. This works without audio or microphone permission.

Use Notes input when:

- the room is noisy;
- microphone permission is blocked;
- testing whether the visual game loop works;
- comparing a suspected microphone scoring issue against a known-good touch path.

### Piano input

Use this when the user wants to connect staff notes to a keyboard shape.

The user taps a tiny one-octave piano strip instead of singing or tapping note-name buttons.

Use Piano input when:

- note names are already somewhat familiar;
- the user wants to see where C, D, E, F, G, A, B sit on a keyboard;
- practicing Sharps or Flats, where black keys matter.

## What the user should do when singing or playing

In Sing/Play mode, the user should:

1. Tap **Check mic**.
2. Allow microphone permission in the browser.
3. Sing or hum any comfortable steady note until the app says what it hears.
4. Tap **Start practice**.
5. Sing or play the note shown on the staff.
6. Watch the green ghost note and `You played ...` readout.
7. Hold the note briefly and steadily.

The current microphone scoring is intentionally beginner-friendly:

- **Match any octave** is checked by default, so any octave can match;
- a singer with a deeper voice can sing a low C for a written C;
- unchecking **Match any octave** makes the octave strict;
- the note name/pitch class must match;
- the note must be roughly in tune;
- the note must be stable for a short moment;
- chords are not scored from microphone yet.

If the app hears the wrong note, the user should adjust pitch, not repeat the note name as a spoken word.

## What the user should do with lessons and difficulty

Lessons decide what material appears. Difficulty decides how much pressure there is.

A good progression:

1. Stay in **Beginner** while learning positions.
2. Move through the Treble beginner lessons.
3. Try **Easy** once Mixed notes feel familiar.
4. Try **Normal** when previewing the next note feels useful.
5. Try **Hard** only when the basic note names are automatic.

The user should not start with Hard unless they already read notes comfortably.

## What success looks like

For a beginner, success is not a huge score. Success looks like:

- recognizing C, D, and E without guessing;
- connecting a written note to a sung/hummed pitch;
- knowing whether a note is on a line, space, or ledger line;
- using microphone feedback instead of feeling blocked;
- moving from Practice to Rush for the same lesson;
- improving accuracy over several short rounds.

For a returning user, success looks like:

- doing one 60-second sprint;
- beating a local high score for the same settings;
- using speed/difficulty increases as a self-challenge;
- choosing a weak lesson for focused practice.

## What the user is not supposed to do yet

The current build does not expect the user to:

- read complex key signatures;
- sing chords into the microphone;
- practice rhythm values;
- use MIDI hardware;
- create accounts;
- sync progress across devices;
- get a full music-theory course.

Those can become future features, but they are not part of the current user journey.

## First three sessions

If the user does not know how to practice sight reading yet, use this simple three-session path:

1. **Session 1:** First steps in Practice with Sing/Play until C/D/E feel predictable, then one Rush on First steps.
2. **Session 2:** Line notes and Space notes separately in Practice. Do not mix them too early.
3. **Session 3:** Mixed notes in Practice, then Rush if accuracy is above about 80%.

If a session goes badly, repeat the same lesson rather than adding more settings.

## Fallback workflow

If the canonical Sing/Play path fails because of noise, permission, or browser behavior:

1. Switch to **Notes** input.
2. Keep the same lesson and Practice mode.
3. Prove the visual note-reading loop still works.
4. Export a Mic Lab report if the microphone path needs debugging.
5. Return to Sing/Play when the environment is quiet or the browser issue is fixed.
