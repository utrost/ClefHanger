import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DIFFICULTY_LEVELS,
  createInitialState,
  getDifficulty,
  getHighScoreKey,
  spawnNextNote,
  answerActiveNote,
  updateRound,
} from '../src/core/game.js';

test('ships a guided difficulty ladder from beginner to hard', () => {
  assert.deepEqual(
    DIFFICULTY_LEVELS.map((difficulty) => difficulty.id),
    ['beginner', 'easy', 'normal', 'hard'],
  );
  assert.equal(getDifficulty('beginner').noteQueueSize, 1);
  assert.equal(getDifficulty('easy').noteQueueSize, 1);
  assert.equal(getDifficulty('normal').noteQueueSize, 2);
  assert.equal(getDifficulty('hard').noteQueueSize, 3);
  assert.equal(getDifficulty('missing').id, 'beginner');
});

test('difficulty presets initialize state and separate high scores', () => {
  const state = createInitialState({ nowMs: 0, seed: 1975, difficultyId: 'hard' });

  assert.equal(state.difficultyId, 'hard');
  assert.deepEqual(state.noteQueue, []);
  assert.equal(getHighScoreKey('bass', 'fast', 'hard'), 'clefhanger.highScore.bass.fast.hard.v4');
});

test('normal difficulty keeps two concurrent notes with the first note answerable', () => {
  const state = createInitialState({ nowMs: 0, seed: 11, modeId: 'basics', difficultyId: 'normal' });
  const spawned = spawnNextNote({ ...state, phase: 'running' }, 100);

  assert.equal(spawned.noteQueue.length, 2);
  assert.equal(spawned.activeNote.id, spawned.noteQueue[0].id);
  assert.ok(spawned.noteQueue[1].spawnedAtMs > spawned.noteQueue[0].spawnedAtMs);
});

test('answering the lead note advances the queue and refills to the difficulty size', () => {
  const state = createInitialState({ nowMs: 0, seed: 11, modeId: 'basics', difficultyId: 'normal' });
  let running = spawnNextNote({ ...state, phase: 'running' }, 100);
  const secondId = running.noteQueue[1].id;

  running = answerActiveNote(running, running.activeNote.answer, 250);
  assert.equal(running.activeNote.id, secondId);
  assert.equal(running.noteQueue.length, 1);

  const updated = updateRound(running, 260);
  assert.equal(updated.noteQueue.length, 2);
  assert.equal(updated.activeNote.id, secondId);
});

test('difficulty multiplier increases points without changing speed preset identity', () => {
  const easy = spawnNextNote({ ...createInitialState({ nowMs: 0, seed: 11, modeId: 'basics', difficultyId: 'easy' }), phase: 'running' }, 100);
  const hard = spawnNextNote({ ...createInitialState({ nowMs: 0, seed: 11, modeId: 'basics', difficultyId: 'hard' }), phase: 'running' }, 100);

  const easyAnswered = answerActiveNote(easy, easy.activeNote.answer, 500);
  const hardAnswered = answerActiveNote(hard, hard.activeNote.answer, 500);

  assert.equal(easyAnswered.pointsEarned, 100);
  assert.equal(hardAnswered.pointsEarned, 180);
});
