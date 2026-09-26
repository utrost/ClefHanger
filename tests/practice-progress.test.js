import assert from 'node:assert/strict';
import test from 'node:test';
import { recordAttempt, summarizeProgress, normalizeProgress } from '../src/core/progress.js';
import { createStorageAdapter } from '../src/platform/storage.js';

test('recent independent success recovers from an early mistake; assistance is tracked separately', () => {
  let progress = recordAttempt({}, { correct: false });
  for (let i = 0; i < 10; i++) progress = recordAttempt(progress, { correct: true });
  progress = recordAttempt(progress, { correct: true, assisted: true });
  const summary = summarizeProgress(progress);
  assert.equal(summary.ready, true);
  assert.equal(summary.recentCorrect, 10);
  assert.equal(summary.attempts, 12);
  assert.equal(summary.assisted, 1);
  assert.equal(progress.recent.length, 10);
});

test('listening practice alone does not claim independent mastery', () => {
  let progress = {};
  for (let i = 0; i < 12; i++) progress = recordAttempt(progress, { correct: true, assisted: true });
  assert.equal(summarizeProgress(progress).ready, false);
});

test('progress persists independently per mode and lesson and tolerates corrupt storage', () => {
  const data = new Map();
  const storage = { getItem: (key) => data.get(key), setItem: (key, value) => data.set(key, value) };
  const first = createStorageAdapter(storage);
  first.writeProgress('basics', 'first-steps', recordAttempt({}, { correct: true }));
  assert.equal(createStorageAdapter(storage).readProgress('basics', 'first-steps').correct, 1);
  assert.equal(first.readProgress('basics', 'line-notes').correct, 0);
  assert.equal(first.readProgress('bass', 'first-steps').correct, 0);
  for (const key of data.keys()) data.set(key, '{bad json');
  assert.equal(first.readProgress('basics', 'first-steps').attempts, 0);
  assert.deepEqual(normalizeProgress(null), normalizeProgress({ attempts: -9, recent: 'bad' }));
});
