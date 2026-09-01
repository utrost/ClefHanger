import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ACCIDENTAL_BUTTONS,
  BASS_NOTES,
  CHORDS,
  DIFFICULTY_LEVELS,
  FLAT_NOTES,
  GAME_MODES,
  LEVEL_ONE_NOTES,
  NOTE_BUTTONS,
  PIANO_BLACK_KEYS,
  PIANO_WHITE_KEYS,
  SHARP_NOTES,
  SPEED_SETTINGS,
  getAnswerOptions,
  getDifficulty,
  getMode,
  getSpeed,
} from '../src/core/content.js';
import { BEGINNER_LESSONS, getLessonPool } from '../src/core/learning.js';
import { getPromptFrequencies } from '../src/core/music-theory.js';

const expectedAnswerOptions = {
  basics: NOTE_BUTTONS.map((note) => ({ label: note, answer: note })),
  bass: NOTE_BUTTONS.map((note) => ({ label: note, answer: note })),
  sharps: ACCIDENTAL_BUTTONS.filter((note) => note.includes('♯')).map((note) => ({ label: note, answer: note })),
  flats: ACCIDENTAL_BUTTONS.filter((note) => note.includes('♭')).map((note) => ({ label: note, answer: note })),
  chords: [
    { label: 'C', answer: 'C-E-G' },
    { label: 'Dm', answer: 'D-F-A' },
    { label: 'Em', answer: 'E-G-B' },
    { label: 'F', answer: 'F-A-C' },
    { label: 'G', answer: 'G-B-D' },
    { label: 'Am', answer: 'A-C-E' },
  ],
};

test('content catalog exports the selectable controls without depending on game state', () => {
  assert.deepEqual(NOTE_BUTTONS, ['C', 'D', 'E', 'F', 'G', 'A', 'B']);
  assert.deepEqual(PIANO_WHITE_KEYS, NOTE_BUTTONS);
  assert.deepEqual(PIANO_BLACK_KEYS.map((key) => key.id), ['c-sharp', 'd-sharp', 'f-sharp', 'g-sharp', 'a-sharp']);
  assert.equal(SPEED_SETTINGS.length, 10);
  assert.deepEqual(DIFFICULTY_LEVELS.map((difficulty) => difficulty.id), ['beginner', 'easy', 'normal', 'hard']);
});

test('every mode has a stable non-empty prompt pool', () => {
  assert.deepEqual(GAME_MODES.map((mode) => mode.id), ['basics', 'bass', 'sharps', 'flats', 'chords']);
  assert.equal(getMode('missing').id, 'basics');

  for (const mode of GAME_MODES) {
    assert.ok(mode.pool.length > 0, `${mode.id} should have prompts`);
    assert.equal(getMode(mode.id).pool, mode.pool);
  }

  assert.equal(getMode('basics').pool, LEVEL_ONE_NOTES);
  assert.equal(getMode('bass').pool, BASS_NOTES);
  assert.equal(getMode('sharps').pool, SHARP_NOTES);
  assert.equal(getMode('flats').pool, FLAT_NOTES);
  assert.equal(getMode('chords').pool, CHORDS);
});

test('beginner lessons reference valid basics prompt subsets', () => {
  for (const lesson of BEGINNER_LESSONS) {
    const pool = getLessonPool(LEVEL_ONE_NOTES, lesson.id);
    assert.ok(pool.length > 0, `${lesson.id} should resolve to prompts`);
    for (const prompt of pool) {
      assert.ok(lesson.noteNames.includes(prompt.noteName) || lesson.id === 'mixed', `${lesson.id} includes ${prompt.noteName}`);
      if (lesson.staffSteps) assert.ok(lesson.staffSteps.includes(prompt.staffStep), `${lesson.id} includes staff step ${prompt.staffStep}`);
    }
  }
});

test('chord prompts remain playable audio prompts', () => {
  for (const chord of CHORDS) {
    assert.equal(chord.kind, undefined);
    assert.equal(chord.notes.length, 3);
    const frequencies = getPromptFrequencies({ kind: 'chord', notes: chord.notes, octave: 4 });
    assert.equal(frequencies.length, 3);
    assert.ok(frequencies.every((frequency) => frequency > 0));
  }
});

test('answer options and safe fallbacks are unchanged', () => {
  for (const modeId of Object.keys(expectedAnswerOptions)) {
    assert.deepEqual(getAnswerOptions(modeId), expectedAnswerOptions[modeId]);
  }
  assert.equal(getSpeed('not-a-speed').id, '5');
  assert.equal(getSpeed('99').id, '10');
  assert.equal(getDifficulty('unknown').id, 'beginner');
});
