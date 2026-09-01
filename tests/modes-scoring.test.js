import assert from 'node:assert/strict';
import test from 'node:test';
import {
  GAME_MODES,
  createInitialState,
  createNote,
  answerActiveNote,
  getHighScoreKey,
  getMode,
  getAnswerOptions,
  getStaffStepForPitch,
  createGhostNoteFromPitch,
  normalizeAnswer,
  spawnNextNote,
} from '../src/core/game.js';

test('ships selectable practice modes for basics, accidentals, flats, and chords', () => {
  assert.deepEqual(
    GAME_MODES.map((mode) => mode.id),
    ['basics', 'bass', 'sharps', 'flats', 'chords'],
  );
  assert.equal(getMode('sharps').label, 'Sharps #');
  assert.equal(getMode('flats').label, 'Flats ♭');
  assert.equal(getMode('chords').kind, 'chord');
});

test('normalizes typed accidental answers to music symbols', () => {
  assert.equal(normalizeAnswer('c#'), 'C♯');
  assert.equal(normalizeAnswer('Db'), 'D♭');
  assert.equal(normalizeAnswer(' gb '), 'G♭');
  assert.equal(normalizeAnswer('ceg'), 'C-E-G');
});

test('creates accidental notes with symbol answers and labels', () => {
  const note = createNote({ id: 's1', noteName: 'F', accidental: 'sharp', octave: 4, spawnedAtMs: 0 });
  assert.equal(note.answer, 'F♯');
  assert.equal(note.displayName, 'F♯4');
  assert.equal(note.accidental, 'sharp');
});

test('maps detected sung pitches back onto the visible staff as a ghost note', () => {
  assert.equal(getStaffStepForPitch({ noteName: 'C', octave: 4 }, 'treble'), -2);
  assert.equal(getStaffStepForPitch({ noteName: 'E', octave: 4 }, 'treble'), 0);
  assert.equal(getStaffStepForPitch({ noteName: 'A', octave: 5 }, 'treble'), 10);
  assert.equal(getStaffStepForPitch({ noteName: 'E', octave: 2 }, 'bass'), -2);
  assert.equal(getStaffStepForPitch({ noteName: 'C', octave: 3 }, 'bass'), 3);

  const ghost = createGhostNoteFromPitch({ noteName: 'C', accidental: 'sharp', answer: 'C♯', octave: 4, frequency: 277.18, cents: 2 }, 'treble');
  assert.deepEqual(ghost, {
    id: 'ghost-note',
    kind: 'note',
    clef: 'treble',
    noteName: 'C',
    accidental: 'sharp',
    octave: 4,
    answer: 'C♯',
    displayName: 'C♯4',
    staffStep: -2,
    frequency: 277.18,
    cents: 2,
    status: 'ghost',
  });
});

test('creates chord prompts with multi-note answers', () => {
  const chord = createNote({ id: 'c1', kind: 'chord', chordName: 'C', notes: ['C', 'E', 'G'], spawnedAtMs: 0 });
  assert.equal(chord.kind, 'chord');
  assert.equal(chord.answer, 'C-E-G');
  assert.equal(chord.displayName, 'C major');
});

test('chord mode remains playable from touch buttons without typed answers', () => {
  assert.deepEqual(getAnswerOptions('chords'), [
    { label: 'C', answer: 'C-E-G' },
    { label: 'Dm', answer: 'D-F-A' },
    { label: 'Em', answer: 'E-G-B' },
    { label: 'F', answer: 'F-A-C' },
    { label: 'G', answer: 'G-B-D' },
    { label: 'Am', answer: 'A-C-E' },
  ]);
});

test('mode spawning uses mode-specific answer pools', () => {
  const sharpState = createInitialState({ nowMs: 0, seed: 11, modeId: 'sharps' });
  const sharpSpawned = spawnNextNote(sharpState, 0);
  assert.ok(sharpSpawned.activeNote.answer.includes('♯'));

  const chordState = createInitialState({ nowMs: 0, seed: 11, modeId: 'chords' });
  const chordSpawned = spawnNextNote(chordState, 0);
  assert.equal(chordSpawned.activeNote.kind, 'chord');
  assert.match(chordSpawned.activeNote.answer, /^[A-G]-[A-G]-[A-G]$/);
});

test('points scale by mode and streak bonus', () => {
  const state = createInitialState({ nowMs: 0, seed: 7, modeId: 'chords' });
  state.phase = 'running';
  state.activeNote = createNote({ id: 'c1', kind: 'chord', chordName: 'C', notes: ['C', 'E', 'G'], spawnedAtMs: 0 });
  state.streak = 2;

  const next = answerActiveNote(state, 'C-E-G', 900);

  assert.equal(next.score, 280);
  assert.equal(next.pointsEarned, 280);
  assert.equal(next.feedback.text, 'C-E-G — held on! +280');
});

test('high scores are separated per mode', () => {
  assert.equal(getHighScoreKey('basics'), 'clefhanger.highScore.basics.speed5.beginner.v5');
  assert.equal(getHighScoreKey('chords', '10', 'hard'), 'clefhanger.highScore.chords.speed10.hard.v5');
});
