import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BEGINNER_LESSONS,
  applyLearningFeedback,
  buildBeginnerFeedback,
  buildBeginnerMicMessage,
  buildCorrectionOverlay,
  buildLearningRecommendation,
  buildAccidentalLearningHint,
  buildIntervalLearningHint,
  buildTutorialSteps,
  getBeginnerLesson,
  getLessonIntroCard,
  getScaffoldedAnswerOptions,
} from '../src/core/learning.js';
import { answerActiveNote, createInitialState, getAnswerOptions, startPractice, startRound } from '../src/core/game.js';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('first-run tutorial is tiny, concrete, and beginner-safe', () => {
  const steps = buildTutorialSteps();
  assert.equal(steps.length, 3);
  assert.match(steps[0].body, /Notes climb upward/i);
  assert.match(steps[1].body, /treble staff/i);
  assert.match(steps[2].body, /Guess/i);
});

test('beginner lessons start narrow before full seven-note quiz', () => {
  assert.deepEqual(BEGINNER_LESSONS.map((lesson) => lesson.id), ['first-steps', 'line-notes', 'space-notes', 'ledger-notes', 'interval-jumps', 'mixed']);
  assert.deepEqual(getBeginnerLesson('first-steps').answers, ['C', 'D', 'E']);
  assert.deepEqual(getBeginnerLesson('line-notes').answers, ['E', 'G', 'B', 'D', 'F']);
  assert.deepEqual(getBeginnerLesson('space-notes').answers, ['F', 'A', 'C', 'E']);
  assert.deepEqual(getBeginnerLesson('ledger-notes').staffSteps, [-2, 10]);
  assert.deepEqual(getBeginnerLesson('missing').answers, ['C', 'D', 'E']);
});

test('line, space, and ledger lessons have tiny intro cards before practice starts', () => {
  const lineIntro = getLessonIntroCard('line-notes');
  assert.equal(lineIntro.title, 'Line notes');
  assert.match(lineIntro.body, /sit on the staff lines/i);
  assert.deepEqual(lineIntro.examples, ['E', 'G', 'B', 'D', 'F']);

  const spaceIntro = getLessonIntroCard('space-notes');
  assert.equal(spaceIntro.title, 'Space notes');
  assert.match(spaceIntro.body, /between the lines/i);
  assert.deepEqual(spaceIntro.examples, ['F', 'A', 'C', 'E']);

  const ledgerIntro = getLessonIntroCard('ledger-notes');
  assert.equal(ledgerIntro.title, 'Ledger lines');
  assert.match(ledgerIntro.body, /short extra lines/i);
  assert.deepEqual(ledgerIntro.examples, ['C', 'A']);
});

test('scaffolded answer tray narrows buttons only for beginner treble lessons', () => {
  const allTrebleAnswers = getAnswerOptions('basics');
  assert.deepEqual(getScaffoldedAnswerOptions({ modeId: 'basics', difficultyId: 'beginner', lessonId: 'first-steps', allOptions: allTrebleAnswers }).map((option) => option.label), ['C', 'D', 'E']);
  assert.deepEqual(getScaffoldedAnswerOptions({ modeId: 'bass', difficultyId: 'beginner', lessonId: 'first-steps', allOptions: getAnswerOptions('bass') }).map((option) => option.label), ['C', 'D', 'E', 'F', 'G', 'A', 'B']);
});

test('practice mode creates an untimed single-note lesson instead of a sprint', () => {
  const idle = createInitialState({ nowMs: 1000, seed: 1975 });
  const practice = startPractice(idle, 2000, 'basics', 'first-steps');
  const rush = startRound(idle, 2000, 'basics', '5', 'beginner');

  assert.equal(practice.phase, 'practice');
  assert.equal(practice.roundLengthMs, null);
  assert.equal(practice.endsAtMs, null);
  assert.equal(practice.noteQueue.length, 1);
  assert.match(practice.feedback.text, /Practice/i);
  assert.equal(rush.phase, 'running');
});

test('ledger-line practice only drills notes that need short extra staff lines', () => {
  const seen = new Set();
  for (const seed of [1, 2, 3, 4]) {
    const state = startPractice(createInitialState({ nowMs: 1000, seed }), 2000, 'basics', 'ledger-notes');
    seen.add(`${state.activeNote.noteName}${state.activeNote.octave}:${state.activeNote.staffStep}`);
  }
  assert.deepEqual([...seen].sort(), ['A5:10', 'C4:-2']);
});

test('wrong answers teach the correct note and why it was correct', () => {
  const note = { answer: 'G', noteName: 'G', octave: 4, label: 'G line', staffStep: 2 };
  const feedback = buildBeginnerFeedback({ prompt: note, givenAnswer: 'E', kind: 'wrong' });
  assert.match(feedback.text, /That was G/i);
  assert.match(feedback.text, /G line/i);
  assert.equal(feedback.correctAnswer, 'G');

  const state = { ...createInitialState(), phase: 'practice', activeNote: note, noteQueue: [note] };
  const answered = applyLearningFeedback(answerActiveNote(state, 'E', 3000), 3000);
  assert.equal(answered.feedback.kind, 'wrong');
  assert.match(answered.feedback.text, /That was G/i);
});

test('wrong answers expose a visual correction overlay contract', () => {
  const note = { answer: 'E', noteName: 'E', octave: 4, label: 'bottom line E', staffStep: 0 };
  const feedback = buildBeginnerFeedback({ prompt: note, givenAnswer: 'C', kind: 'wrong' });
  const overlay = buildCorrectionOverlay({ prompt: note, feedback });

  assert.equal(overlay.answer, 'E');
  assert.equal(overlay.label, 'E');
  assert.match(overlay.location, /bottom line/i);
  assert.equal(overlay.shouldFreezeNote, true);
  assert.equal(overlay.ariaLabel, 'Correction: E, bottom line E');
});

test('beginner microphone message hides debug details unless expanded', () => {
  const simple = buildBeginnerMicMessage({ pitchLabel: 'A2', frequency: 112, decodedLevel: 0.05, bytes: 17033, advanced: false });
  assert.equal(simple, 'I heard A2 · 112 Hz. Nice steady note.');
  const advanced = buildBeginnerMicMessage({ pitchLabel: 'A2', frequency: 112, decodedLevel: 0.05, bytes: 17033, advanced: true });
  assert.match(advanced, /captured 17033 bytes/i);
  assert.match(advanced, /decoded level 5%/i);
});

test('learning coach recommends repeat, rush, or next lesson from simple progress evidence', () => {
  const practiceReady = buildLearningRecommendation({ playStyle: 'practice', lessonId: 'first-steps', correct: 8, wrong: 0, missed: 0, bestStreak: 8 });
  assert.equal(practiceReady.kind, 'try-rush');
  assert.match(practiceReady.text, /Try Rush/i);
  assert.match(practiceReady.text, /same lesson/i);

  const rushRepeat = buildLearningRecommendation({ playStyle: 'rush', lessonId: 'line-notes', correct: 6, wrong: 3, missed: 2, accuracy: 55 });
  assert.equal(rushRepeat.kind, 'repeat-practice');
  assert.match(rushRepeat.text, /repeat Line notes in Practice/i);

  const rushAdvance = buildLearningRecommendation({ playStyle: 'rush', lessonId: 'line-notes', correct: 9, wrong: 1, missed: 0, accuracy: 90 });
  assert.equal(rushAdvance.kind, 'next-lesson');
  assert.equal(rushAdvance.nextLessonId, 'space-notes');
  assert.match(rushAdvance.text, /Try Space notes next/i);

  const tooManyMisses = buildLearningRecommendation({ playStyle: 'rush', lessonId: 'mixed', correct: 4, wrong: 0, missed: 5, accuracy: 44, speedId: '8' });
  assert.equal(tooManyMisses.kind, 'lower-speed');
  assert.match(tooManyMisses.text, /lower speed/i);
});

test('accidental learning hint explains that sharps and flats reuse staff positions', () => {
  const sharpHint = buildAccidentalLearningHint({ modeId: 'sharps', prompt: { noteName: 'C', accidental: 'sharp', answer: 'C♯' } });
  assert.match(sharpHint.text, /same staff spot as C/i);
  assert.match(sharpHint.text, /♯ raises/i);

  const flatHint = buildAccidentalLearningHint({ modeId: 'flats', prompt: { noteName: 'D', accidental: 'flat', answer: 'D♭' } });
  assert.match(flatHint.text, /same staff spot as D/i);
  assert.match(flatHint.text, /♭ lowers/i);

  assert.equal(buildAccidentalLearningHint({ modeId: 'basics', prompt: { answer: 'C' } }), null);
});

test('interval practice teaches repeated notes, steps, and skips without chord theory', () => {
  assert.ok(BEGINNER_LESSONS.find((lesson) => lesson.id === 'interval-jumps'));
  assert.deepEqual(getBeginnerLesson('interval-jumps').answers, ['C', 'D', 'E', 'F', 'G']);

  const repeat = buildIntervalLearningHint({ previousPrompt: { noteName: 'C', staffStep: -2 }, prompt: { noteName: 'C', staffStep: -2 } });
  assert.equal(repeat.kind, 'same-note');
  assert.match(repeat.text, /same note/i);

  const stepUp = buildIntervalLearningHint({ previousPrompt: { noteName: 'C', staffStep: -2 }, prompt: { noteName: 'D', staffStep: -1 } });
  assert.equal(stepUp.kind, 'step-up');
  assert.match(stepUp.text, /one step up/i);

  const stepDown = buildIntervalLearningHint({ previousPrompt: { noteName: 'E', staffStep: 0 }, prompt: { noteName: 'D', staffStep: -1 } });
  assert.equal(stepDown.kind, 'step-down');
  assert.match(stepDown.text, /one step down/i);

  const skip = buildIntervalLearningHint({ previousPrompt: { noteName: 'C', staffStep: -2 }, prompt: { noteName: 'E', staffStep: 0 } });
  assert.equal(skip.kind, 'skip-up');
  assert.match(skip.text, /skips over D/i);

  assert.equal(buildIntervalLearningHint({ previousPrompt: null, prompt: { noteName: 'C', staffStep: -2 } }), null);
});

test('interval lesson appears in the documented beginner ramp', () => {
  const roadmap = read('docs/mvp-roadmap.md');
  const guide = read('docs/player-tester-guide.md');
  assert.match(roadmap, /Slice 8f .* implemented/i);
  assert.match(guide, /Interval jumps/i);
  assert.match(guide, /same note, step, or skip/i);
});

test('shell wires interval learning hints into the learning coach path', () => {
  const app = read('src/app.js');
  assert.match(app, /buildIntervalLearningHint/);
  assert.match(app, /previousPrompt/);
});

test('user journey documents the learning contract before adding more notation', () => {
  const journey = read('docs/user-journey.md');
  assert.match(journey, /golden path/i);
  assert.match(journey, /8 out of 10/i);
  assert.match(journey, /70% accuracy/i);
  assert.match(journey, /80% accuracy/i);
  assert.match(journey, /Change one thing at a time/i);
  assert.match(journey, /First three sessions/i);
  assert.match(journey, /Pause.*correction/);
});

test('shell exposes a non-blocking learning coach line', () => {
  const html = read('index.html');
  const app = read('src/app.js');
  assert.match(html, /id="learning-coach"/);
  assert.match(html, /aria-label="Learning suggestion"/);
  assert.match(app, /buildLearningRecommendation/);
  assert.match(app, /learningCoachEl/);
});

test('shell exposes beginner-friendly tutorial, practice, lesson, hint, and mic details controls', () => {
  const html = read('index.html');
  const app = read('src/app.js');
  const staffRenderer = read('src/ui/staff-renderer.js');
  assert.match(html, /id="tutorial-card"/);
  assert.match(html, /Start with a lesson/);
  assert.match(html, /data-play-style="practice"/);
  assert.match(html, /id="lesson-select"/);
  assert.match(html, /id="lesson-intro"/);
  assert.match(html, /id="lesson-intro-title"/);
  assert.match(html, /id="lesson-intro-examples"/);
  assert.match(html, /id="lesson-intro-dismiss"/);
  assert.match(html, /id="hint-toggle"/);
  assert.match(html, /<details id="microphone-debug"/);
  assert.match(app, /buildTutorialSteps/);
  assert.match(app, /getLessonIntroCard/);
  assert.match(app, /startPractice/);
  assert.match(app, /getScaffoldedAnswerOptions/);
  assert.match(app, /data-correct-answer/);
  assert.match(staffRenderer, /correction-label/);
  assert.match(staffRenderer, /data-correction-active/);
});
