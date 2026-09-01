import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  SEMITONES_FROM_C,
  accidentalSymbol,
  answerLabel,
  createGhostNoteFromPitch,
  getPitchFrequency,
  getPromptFrequencies,
  getStaffStepForPitch,
} from '../src/core/music-theory.js';

test('music theory exposes stable pitch-class labels and enharmonic semitones', () => {
  assert.equal(accidentalSymbol('sharp'), '♯');
  assert.equal(accidentalSymbol('flat'), '♭');
  assert.equal(accidentalSymbol(undefined), '');
  assert.equal(answerLabel('D', 'flat'), 'D♭');
  assert.equal(answerLabel('C', 'sharp'), 'C♯');
  assert.equal(SEMITONES_FROM_C['C♯'], SEMITONES_FROM_C['D♭']);
  assert.equal(SEMITONES_FROM_C.B, 11);
});

test('music theory maps notes and prompt chords to equal-tempered frequencies', () => {
  assert.equal(Math.round(getPitchFrequency('A', 4)), 440);
  assert.equal(Math.round(getPitchFrequency('C', 4)), 262);
  assert.equal(Math.round(getPitchFrequency('D', 4, 'flat')), 277);
  assert.deepEqual(getPromptFrequencies(null), []);

  const chordFrequencies = getPromptFrequencies({ kind: 'chord', notes: ['C', 'E', 'G'] }).map(Math.round);
  assert.deepEqual(chordFrequencies, [262, 330, 392]);
});

test('music theory maps detected pitches to staff steps and ghost notes', () => {
  assert.equal(getStaffStepForPitch({ noteName: 'C', octave: 4 }, 'treble'), -2);
  assert.equal(getStaffStepForPitch({ noteName: 'A', octave: 5 }, 'treble'), 10);
  assert.equal(getStaffStepForPitch({ noteName: 'G', octave: 2 }, 'bass'), 0);
  assert.equal(getStaffStepForPitch({ noteName: 'Q', octave: 4 }, 'treble'), null);

  assert.deepEqual(createGhostNoteFromPitch({ noteName: 'A', octave: 4, answer: 'A', frequency: 440, cents: 0 }, 'treble'), {
    id: 'ghost-note',
    kind: 'note',
    clef: 'treble',
    noteName: 'A',
    accidental: undefined,
    octave: 4,
    answer: 'A',
    displayName: 'A4',
    staffStep: 3,
    frequency: 440,
    cents: 0,
    status: 'ghost',
  });
});

test('pitch and staff renderer use music theory without depending on the broad game module for pitch naming', () => {
  const pitch = readFileSync(new URL('../src/core/pitch.js', import.meta.url), 'utf8');
  const renderer = readFileSync(new URL('../src/ui/staff-renderer.js', import.meta.url), 'utf8');

  assert.match(pitch, /\.\/music-theory\.js\?v=/);
  assert.doesNotMatch(pitch, /from '\.\/game\.js/);
  assert.match(renderer, /\.\.\/core\/music-theory\.js\?v=/);
  assert.match(renderer, /createGhostNoteFromPitch/);
});
