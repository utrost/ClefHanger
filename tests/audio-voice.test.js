import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPianoVoicePlan } from '../src/core/audio.js';

test('piano voice uses layered partials instead of a single beep oscillator', () => {
  const plan = buildPianoVoicePlan(440, 0.5);

  assert.equal(plan.frequency, 440);
  assert.equal(plan.durationSeconds, 1.1);
  assert.equal(plan.partials.length, 5);
  assert.deepEqual(plan.partials.map((partial) => partial.type), ['triangle', 'sine', 'sine', 'sine', 'sine']);
  assert.deepEqual(plan.partials.map((partial) => partial.frequencyMultiplier), [1, 2, 3, 4, 5]);
  assert.ok(plan.partials[0].gain > plan.partials[1].gain, 'fundamental stays stronger than first overtone');
  assert.ok(plan.partials.at(-1).gain < 0.02, 'upper partials stay quiet');
});

test('piano voice has a hammer-like attack and a longer natural decay', () => {
  const plan = buildPianoVoicePlan(261.63, 0.25);

  assert.deepEqual(plan.envelope, {
    initialGain: 0.0001,
    attackGain: 0.24,
    attackSeconds: 0.008,
    decayGain: 0.13,
    decaySeconds: 0.12,
    releaseGain: 0.0001,
    releaseSeconds: 1.05,
  });
  assert.equal(plan.detuneCents.length, plan.partials.length);
  assert.ok(plan.detuneCents.some((cents) => cents !== 0), 'small detune offsets make the cue less sterile');
});
