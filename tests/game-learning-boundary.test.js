import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  answerActiveNote,
  createInitialState,
  createNote,
  missExpiredNotes,
} from '../src/core/game.js';
import { applyLearningFeedback, buildTeachingFeedback } from '../src/core/learning.js';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('game reducer exposes neutral answer outcome data instead of importing learning copy', () => {
  const gameSource = read('src/core/game.js');
  assert.doesNotMatch(gameSource, /from '\.\/learning\.js/);

  const state = createInitialState({ nowMs: 0, seed: 7, modeId: 'basics', lessonId: 'first-steps' });
  state.phase = 'practice';
  state.activeNote = createNote({ id: 'n1', noteName: 'E', octave: 4, staffStep: 0, spawnedAtMs: 0, travelMs: 5000 });

  const next = answerActiveNote(state, 'F', 1200);

  assert.deepEqual(next.lastOutcome, {
    result: 'wrong',
    prompt: next.activeNote,
    expectedAnswer: 'E',
    givenAnswer: 'F',
    pointsEarned: 0,
    streak: 0,
    modeId: 'basics',
    lessonId: 'first-steps',
    phase: 'practice',
  });
  assert.equal(next.feedback.kind, 'wrong');
  assert.doesNotMatch(next.feedback.text, /bottom line E|staff line note|That was/);
  assert.equal(next.correction, null);
});

test('learning layer converts neutral outcomes into existing beginner feedback and correction overlay', () => {
  const prompt = createNote({ id: 'n1', noteName: 'E', octave: 4, staffStep: 0, spawnedAtMs: 0, travelMs: 5000 });
  const outcome = {
    result: 'wrong',
    prompt,
    expectedAnswer: 'E',
    givenAnswer: 'F',
    pointsEarned: 0,
    streak: 0,
    modeId: 'basics',
    lessonId: 'first-steps',
    phase: 'practice',
  };

  const feedback = buildTeachingFeedback(outcome);
  assert.deepEqual(feedback.feedback, {
    kind: 'wrong',
    text: 'F is not it. That was E: a staff line note.',
    correctAnswer: 'E',
  });
  assert.deepEqual(feedback.correction, {
    answer: 'E',
    label: 'E',
    location: 'a staff line note',
    shouldFreezeNote: true,
    ariaLabel: 'Correction: E, a staff line note',
  });
});

test('applicable learning feedback preserves practice wrong-answer freeze metadata', () => {
  const state = createInitialState({ nowMs: 0, seed: 7, modeId: 'basics', lessonId: 'first-steps' });
  state.phase = 'practice';
  state.activeNote = createNote({ id: 'n1', noteName: 'E', octave: 4, staffStep: 0, spawnedAtMs: 0, travelMs: 5000 });

  const answered = answerActiveNote(state, 'F', 1200);
  const enriched = applyLearningFeedback(answered, 1200);

  assert.equal(enriched.activeNote.answer, 'E');
  assert.equal(enriched.feedback.text, 'F is not it. That was E: a staff line note.');
  assert.equal(enriched.correction.answer, 'E');
  assert.equal(enriched.correction.frozenAtMs, 1200);
  assert.equal(enriched.correction.frozenUntilMs, 2600);
});

test('missed notes also produce neutral outcome data for optional teaching copy', () => {
  const state = createInitialState({ roundLengthMs: 60000, nowMs: 0, seed: 7 });
  state.phase = 'running';
  state.activeNote = createNote({ id: 'n1', noteName: 'A', octave: 4, staffStep: 3, spawnedAtMs: 0, travelMs: 5000 });

  const next = missExpiredNotes(state, 5001);

  assert.equal(next.lastOutcome.result, 'missed');
  assert.equal(next.lastOutcome.expectedAnswer, 'A');
  assert.equal(next.feedback.text, 'A fell off the staff.');
});
