import assert from 'node:assert/strict';
import test from 'node:test';
import { createInitialState, createNote } from '../src/core/game.js';
import { renderStaffSvg } from '../src/ui/staff-renderer.js';

function makeStateWithQueue(noteQueue, correction = null) {
  return {
    ...createInitialState({ nowMs: 0, seed: 1, modeId: noteQueue[0]?.clef === 'bass' ? 'bass' : 'basics' }),
    phase: 'practice',
    activeNote: noteQueue[0] || null,
    noteQueue,
    correction,
  };
}

test('staff renderer draws staff, clef, lead note, and true ledger lines', () => {
  const note = createNote({
    id: 'middle-c',
    noteName: 'C',
    octave: 4,
    staffStep: -2,
    clef: 'treble',
    spawnedAtMs: 0,
    travelMs: 5000,
  });

  const svg = renderStaffSvg({ state: makeStateWithQueue([note]), nowMs: 2500 });

  assert.match(svg, /<svg viewBox="0 0 330 180"/);
  assert.match(svg, /aria-label="treble staff with cliff edge"/);
  assert.match(svg, /class="clef clef-treble"/);
  assert.match(svg, />𝄞<\/text>/);
  assert.match(svg, /class="queue-note lead-note"/);
  assert.match(svg, /data-ledger-step="-2"/);
  assert.doesNotMatch(svg, /data-ledger-step="0"/);
});

test('staff renderer draws correction labels with escaped text', () => {
  const note = createNote({
    id: 'dangerous-label',
    noteName: 'E',
    octave: 4,
    staffStep: 0,
    clef: 'treble',
    spawnedAtMs: 0,
    travelMs: 5000,
  });
  const correction = {
    answer: 'E',
    label: 'E <line> & "space"',
    ariaLabel: 'Correct: E <line> & "space"',
    frozenUntilMs: 5000,
    shouldFreezeNote: true,
    frozenAtMs: 1000,
  };

  const svg = renderStaffSvg({ state: makeStateWithQueue([note], correction), nowMs: 2000 });

  assert.match(svg, /class="correction-label"/);
  assert.match(svg, /data-correction-active="true"/);
  assert.match(svg, /E &lt;line&gt; &amp; &quot;space&quot;/);
  assert.match(svg, /aria-label="Correct: E &lt;line&gt; &amp; &quot;space&quot;"/);
});

test('staff renderer draws chord stacks and preview notes behind the lead note', () => {
  const lead = createNote({
    id: 'lead',
    kind: 'chord',
    chordName: 'C',
    quality: 'major',
    notes: ['C', 'E', 'G'],
    staffSteps: [-2, 0, 2],
    spawnedAtMs: 0,
    travelMs: 5000,
  });
  const preview = createNote({
    id: 'preview',
    noteName: 'A',
    octave: 5,
    staffStep: 10,
    clef: 'treble',
    spawnedAtMs: 0,
    travelMs: 5000,
  });

  const svg = renderStaffSvg({ state: makeStateWithQueue([lead, preview]), nowMs: 1000 });

  assert.match(svg, /data-queue-index="1"/);
  assert.match(svg, /class="queue-note preview-note"/);
  assert.match(svg, /data-queue-index="0"/);
  assert.match(svg, /class="queue-note lead-note"/);
  assert.equal((svg.match(/<ellipse/g) || []).length, 4);
});

test('staff renderer draws microphone ghost note from detected pitch only in microphone mode', () => {
  const note = createNote({
    id: 'front',
    noteName: 'C',
    octave: 4,
    staffStep: -2,
    clef: 'treble',
    spawnedAtMs: 0,
    travelMs: 5000,
  });
  const microphoneState = {
    note: { noteName: 'A', accidental: undefined, octave: 4, answer: 'A', frequency: 440, cents: 0 },
  };

  const buttonsSvg = renderStaffSvg({ state: makeStateWithQueue([note]), selectedInputMode: 'buttons', microphoneState, nowMs: 0 });
  const micSvg = renderStaffSvg({ state: makeStateWithQueue([note]), selectedInputMode: 'microphone', microphoneState, nowMs: 0 });

  assert.doesNotMatch(buttonsSvg, /ghost-note/);
  assert.match(micSvg, /class="ghost-note"/);
  assert.match(micSvg, /you played A4/);
});
