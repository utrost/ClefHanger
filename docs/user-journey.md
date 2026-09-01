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

The current app should not feel like a theory exam. It should feel like a tiny arcade drill that gradually teaches what the notes are.

## The intended first session

A first-time user should be able to do this:

1. Open `https://simiono.com/clefhanger/` on a phone.
2. Read the short tutorial card.
3. Stay with the default setup:
   - Practice style;
   - Treble mode;
   - Beginner difficulty;
   - First steps lesson;
   - Notes input.
4. Tap **Start practice**.
5. Look at the note on the staff.
6. Choose one of the visible answer buttons.
7. If the answer is wrong, use the feedback to learn:
   - the correct note name;
   - where the note sits on the staff;
   - which button would have been correct.
8. Keep practicing without a timer until C, D, and E feel familiar.

The user is not expected to configure anything before the first practice run.

## The basic loop

In every round, the user does the same core action:

1. See the front note on the staff.
2. Name it before it falls or before moving on.
3. Receive immediate feedback.
4. Hear correct answers as pitch.
5. Build recognition through repetition.

The app should make the next useful action obvious:

- if practice has not started, start practice;
- if a note is visible, answer the visible/front note;
- if the answer was wrong, read the correction and try again;
- if the lesson feels easy, switch lesson or try Rush;
- if using microphone mode, watch what note the phone thinks it heard.

## The golden path

Start simple and add only one challenge at a time:

1. **First steps / Practice / Notes**.
2. **Line notes / Practice / Notes**.
3. **Space notes / Practice / Notes**.
4. **Ledger lines / Practice / Notes**.
5. **Mixed notes / Practice / Notes**.
6. Try the same lessons in **Rush**.
7. Try **Piano** or **Sing/Play** only after the written-note loop is understood.

This path keeps the question clear: first learn the staff position, then add speed, then add a different input style.

## When to move on

Use this loose learning contract:

- Stay in Practice until about **8 out of 10** answers feel easy.
- Then try one Rush round on the same lesson.
- If Rush is below about **70% accuracy**, repeat that lesson in Practice.
- If Rush is above about **80% accuracy**, try the next lesson.
- If one note keeps causing mistakes, return to the lesson that isolates that note group.
- Do not increase lesson breadth, speed, and difficulty at the same time.

These numbers are guide rails, not exams. The app now shows a small learning suggestion after answers and Rush summaries to help choose the next useful step without making progress feel locked.

## Change one thing at a time

Settings can change several things at once: lesson, mode, speed, difficulty, and input mode. A beginner should change only one knob between attempts.

Good changes:

- New lesson? Keep Beginner + Notes.
- Trying Rush? Keep the same lesson.
- Trying Piano? Keep the same lesson and difficulty.
- Trying Sing/Play? First prove the same lesson with Notes.
- Raising speed? Do not also raise difficulty.

If the app suddenly feels too hard, return to Practice + Beginner + Notes input.

## How to use mistakes

A wrong answer is part of the lesson.

When the app shows a correction:

1. Pause on the correction for a moment.
2. Read the note name.
3. Notice whether it is on a line, space, or ledger line.
4. Look at the highlighted answer button.
5. Answer again before changing settings.

Do not tap randomly through corrections. The small pause is where the learning happens.

## What the user should do in Practice

Practice is the default learning mode.

The user should:

1. Pick one lesson.
2. Answer slowly.
3. Treat wrong answers as hints.
4. Repeat until the note positions become familiar.
5. Move to a broader lesson only when the current one feels boring.

Recommended order:

1. **First steps** — only C, D, E.
2. **Line notes** — E, G, B, D, F.
3. **Space notes** — F, A, C, E.
4. **Ledger lines** — C and A just outside the staff.
5. **Mixed notes** — full beginner natural-note set.

Practice is not about score. It is about recognizing the note quickly enough that Rush will later feel playful instead of stressful.

## What the user should do in Rush

Rush is the timed arcade mode.

The user should switch to Rush when a lesson feels familiar in Practice.

In Rush, the user should:

1. Watch the front note, not the preview notes behind it.
2. Answer before the note reaches the cliff.
3. Accept that missed notes reset the streak.
4. Try to improve score and accuracy over short 60-second rounds.
5. Replay immediately if the round felt close.

Rush is for fluency and recall speed. It is not the best place to learn a brand-new note position.

## What the user should do with input modes

### Notes input

Use this first.

The user taps large note-name buttons. This is the intended default because it works on every phone and requires no permissions.

Use Notes input when:

- trying the app for the first time;
- learning a new lesson;
- testing whether the visual game loop works;
- playing somewhere noisy.

### Piano input

Use this when the user wants to connect staff notes to a keyboard shape.

The user taps a tiny one-octave piano strip instead of note-name buttons.

Use Piano input when:

- note names are already somewhat familiar;
- the user wants to see where C, D, E, F, G, A, B sit on a keyboard;
- practicing Sharps or Flats, where black keys matter and the suggestion line explains how `♯` and `♭` modify the same staff position.

### Sing/Play input

Use this when the user wants to answer by making sound.

The user grants microphone permission, then sings, hums, whistles, or plays one steady note on an acoustic instrument.

Use Sing/Play input when:

- the user wants ear/voice connection, not only symbol recognition;
- the environment is quiet enough;
- the user can hold one steady note briefly;
- the prompt is a single note, not a chord.

The user should not speak note names into the microphone. The microphone listens for pitch, not speech.

## What the user should do when singing or playing

In Sing/Play mode, the user should:

1. Select **Sing/Play** in Settings.
2. Tap **Grant mic**.
3. Allow microphone permission in the browser.
4. Start Practice.
5. Sing or play the note shown on the staff.
6. Watch the green ghost note and `You played ...` readout.
7. Hold the note briefly and steadily.

The current microphone scoring is intentionally beginner-friendly:

- any octave can match;
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
- knowing whether a note is on a line, space, or ledger line;
- using wrong-answer feedback instead of feeling blocked;
- moving from Practice to Rush for the same lesson;
- improving accuracy over several short rounds;
- optionally singing or playing the note and seeing the ghost note line up.

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

1. **Session 1:** First steps in Practice until C/D/E feel predictable, then one Rush on First steps.
2. **Session 2:** Line notes and Space notes separately in Practice. Do not mix them too early.
3. **Session 3:** Mixed notes in Practice, then Rush if accuracy is around 80% or better.

After that, the user can cycle weak lessons, try Piano, or try Sing/Play.

## A good 5-minute practice session

1. Open the app.
2. Practice **First steps** for one minute.
3. Switch to **Line notes** or **Space notes**.
4. Practice until the corrections feel repetitive.
5. Run one **Rush** round on the same material.
6. If using Sing/Play, repeat one Practice run by singing or humming the notes.
7. Stop while it still feels light.

ClefHanger is meant to be used often in tiny sessions, not as a long study grind.

## If the user gets stuck

- Too many wrong answers: go back to Practice and a narrower lesson.
- Notes move too fast: lower speed or use Beginner.
- Preview notes are confusing: use Beginner or Easy, where only one note appears.
- Microphone does not score: switch back to Notes input first, then troubleshoot microphone separately.
- Chords are confusing: return to Treble natural notes; chord mode is a later challenge.

The escape hatch should always be simple: Practice + Beginner + Notes input.
