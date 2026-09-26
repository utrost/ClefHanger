import assert from 'node:assert/strict';
import test from 'node:test';
import { LEVEL_ONE_NOTES } from '../src/core/content.js';
import { getLessonPool } from '../src/core/lessons.js';
import { describeStaffPosition } from '../src/core/music-theory.js';
import { buildBeginnerFeedback } from '../src/core/learning.js';
import { renderLessonGuide } from '../src/ui/lesson-guide.js';

for (const [lesson, positions] of [
  ['first-steps', [-2, -1, 0]],
  ['line-notes', [0, 2, 4, 6, 8]],
  ['space-notes', [1, 3, 5, 7]],
]) {
  test(`${lesson} uses the intended staff positions, not just matching letter names`, () => {
    assert.deepEqual(getLessonPool(LEVEL_ONE_NOTES, lesson).map((note) => note.staffStep), positions);
  });
}

test('corrections explain the actual staff position even when the catalog label is only D4', () => {
  const prompt = { ...LEVEL_ONE_NOTES.find((note) => note.noteName === 'D' && note.octave === 4), answer: 'D' };
  const feedback = buildBeginnerFeedback({ prompt, givenAnswer: 'E' });
  assert.match(feedback.text, /space immediately below staff/);
  assert.equal(describeStaffPosition(2), 'second line from bottom');
  assert.equal(describeStaffPosition(10), 'first ledger line above staff');
  assert.equal(describeStaffPosition(-2), 'first ledger line below staff');
});

test('the guide labels every lesson note accessibly and splits large lessons into readable rows', () => {
  const first = renderLessonGuide(getLessonPool(LEVEL_ONE_NOTES, 'first-steps'));
  assert.match(first, /role="img"/);
  assert.match(first, /C4/);
  assert.match(first, /D4/);
  assert.match(first, /E4/);
  assert.match(first, /first ledger line below staff/);
  assert.equal((first.match(/class="guide-note"/g) || []).length, 3);
  const mixed = renderLessonGuide(LEVEL_ONE_NOTES);
  assert.equal((mixed.match(/class="guide-note"/g) || []).length, LEVEL_ONE_NOTES.length);
  assert.equal((mixed.match(/<svg /g) || []).length, 3);
  assert.doesNotMatch(renderLessonGuide([{ ...LEVEL_ONE_NOTES[0], noteName: '<script>' }]), /<script>/);
});

test('turning off correction hints hides both the answer copy and the correction overlay', async () => {
  const { applyLearningFeedback } = await import('../src/core/learning.js');
  const state = { lastOutcome: { result: 'wrong', prompt: { answer: 'E', noteName: 'E', octave: 4, staffStep: 0 }, givenAnswer: 'D' } };
  const result = applyLearningFeedback(state, 100, { showHints: false });
  assert.equal(result.correction, null);
  assert.equal(result.feedback.text, 'D is not it. Try again.');
  assert.equal(result.feedback.correctAnswer, undefined);
});
