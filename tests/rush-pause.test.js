import assert from 'node:assert/strict';
import test from 'node:test';
import { createInitialState, startRound, pauseRound, resumeRound, updateRound, getRemainingSeconds, answerActiveNote } from '../src/core/game.js';

test('pausing freezes scoring, timer and every queued note until explicit resume', () => {
  const running = startRound(createInitialState({ difficultyId: 'hard' }), 1000);
  const paused = pauseRound(running, 2000);
  assert.equal(paused.phase, 'paused');
  assert.equal(getRemainingSeconds(paused, 200000), 59);
  assert.deepEqual(updateRound(paused, 200000), paused);
  assert.equal(answerActiveNote(paused, paused.activeNote.answer, 3000).correct, 0);
  const resumed = resumeRound(paused, 12000);
  assert.equal(resumed.phase, 'running');
  assert.equal(resumed.endsAtMs, running.endsAtMs + 10000);
  for (let i = 0; i < running.noteQueue.length; i++) {
    assert.equal(resumed.noteQueue[i].deadlineMs, running.noteQueue[i].deadlineMs + 10000);
    assert.equal(resumed.noteQueue[i].spawnedAtMs, running.noteQueue[i].spawnedAtMs + 10000);
  }
  assert.equal(running.phase, 'running');
  assert.equal(resumed.activeNote.deadlineMs, resumed.noteQueue[0].deadlineMs);
});
