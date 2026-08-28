import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createInitialState,
  createNote,
  NOTE_BUTTONS,
  GAME_MODES,
  getMode,
  normalizeAnswer,
  answerLabel,
  answerActiveNote,
  missExpiredNotes,
  getRoundSummary,
  getHighScoreKey,
  getPromptFrequencies,
} from '../src/core/game.js';

test('Level 1 exposes seven oversized natural-note answers', () => {
  assert.deepEqual(NOTE_BUTTONS, ['C', 'D', 'E', 'F', 'G', 'A', 'B']);
});

test('creates treble-clef notes with a deterministic answer and deadline', () => {
  const note = createNote({ id: 'n1', noteName: 'G', octave: 4, spawnedAtMs: 1000, travelMs: 5000 });
  assert.equal(note.clef, 'treble');
  assert.equal(note.kind, 'note');
  assert.equal(note.answer, 'G');
  assert.equal(note.displayName, 'G4');
  assert.equal(note.deadlineMs, 6000);
  assert.equal(note.status, 'active');
});

test('scores correct answers, advances streak, and clears the active note', () => {
  const state = createInitialState({ roundLengthMs: 60000, nowMs: 0, seed: 7 });
  state.activeNote = createNote({ id: 'n1', noteName: 'C', octave: 4, spawnedAtMs: 0, travelMs: 5000 });

  const next = answerActiveNote(state, 'C', 1200);

  assert.equal(next.score, 100);
  assert.equal(next.streak, 1);
  assert.equal(next.correct, 1);
  assert.equal(next.wrong, 0);
  assert.equal(next.activeNote, null);
  assert.equal(next.feedback.kind, 'correct');
});

test('scores wrong answers without removing the active note', () => {
  const state = createInitialState({ roundLengthMs: 60000, nowMs: 0, seed: 7 });
  state.activeNote = createNote({ id: 'n1', noteName: 'E', octave: 4, spawnedAtMs: 0, travelMs: 5000 });

  const next = answerActiveNote(state, 'F', 1200);

  assert.equal(next.score, 0);
  assert.equal(next.streak, 0);
  assert.equal(next.correct, 0);
  assert.equal(next.wrong, 1);
  assert.equal(next.activeNote.answer, 'E');
  assert.equal(next.feedback.kind, 'wrong');
});

test('marks expired active notes as missed when they reach the cliff', () => {
  const state = createInitialState({ roundLengthMs: 60000, nowMs: 0, seed: 7 });
  state.activeNote = createNote({ id: 'n1', noteName: 'A', octave: 4, spawnedAtMs: 0, travelMs: 5000 });

  const next = missExpiredNotes(state, 5001);

  assert.equal(next.missed, 1);
  assert.equal(next.streak, 0);
  assert.equal(next.activeNote, null);
  assert.equal(next.feedback.kind, 'missed');
});

test('round summary reports readiness for actual testing', () => {
  const state = createInitialState({ roundLengthMs: 60000, nowMs: 0, seed: 7 });
  const summary = getRoundSummary({ ...state, score: 300, correct: 3, wrong: 2, missed: 1 });

  assert.match(summary.title, /Sprint complete/);
  assert.equal(summary.score, 300);
  assert.equal(summary.accuracy, 50);
});

test('maps answered prompts to audible equal-tempered pitches', () => {
  const note = createNote({ id: 'note-1', noteName: 'A', octave: 4, spawnedAtMs: 0, staffStep: 3 });
  assert.deepEqual(getPromptFrequencies(note), [440]);

  const sharp = createNote({ id: 'note-2', noteName: 'C', accidental: 'sharp', octave: 4, spawnedAtMs: 0, staffStep: -2 });
  assert.equal(Math.round(getPromptFrequencies(sharp)[0] * 100) / 100, 277.18);

  const chord = createNote({ id: 'note-3', kind: 'chord', chordName: 'C', quality: 'major', notes: ['C', 'E', 'G'], staffSteps: [-2, 0, 2], spawnedAtMs: 0 });
  assert.deepEqual(getPromptFrequencies(chord).map((frequency) => Math.round(frequency)), [262, 330, 392]);
});
