import assert from 'node:assert/strict';
import test from 'node:test';
import { createInitialState, createNote } from '../src/core/game.js';
import {
  buildNotationPromptDescription,
  buildStageAccessibleLabel,
  renderStaffSvg,
  syncLiveRegionText,
  syncNotationAccessibility,
} from '../src/ui/staff-renderer.js';

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
  assert.match(svg, /aria-hidden="true"/);
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
  assert.doesNotMatch(svg, /aria-label=/);
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

test('notation prompt describes line, space, ledger, accidental, and clef without revealing answers', () => {
  const cases = [
    {
      note: createNote({ id: 'line', noteName: 'E', octave: 4, staffStep: 0, clef: 'treble', spawnedAtMs: 0 }),
      expected: 'Lead single note: treble clef, bottom line of staff, natural.',
    },
    {
      note: createNote({ id: 'space', noteName: 'F', octave: 4, staffStep: 1, clef: 'treble', spawnedAtMs: 0 }),
      expected: 'Lead single note: treble clef, bottom space of staff, natural.',
    },
    {
      note: createNote({ id: 'ledger', noteName: 'C', octave: 4, staffStep: -2, clef: 'treble', spawnedAtMs: 0 }),
      expected: 'Lead single note: treble clef, first ledger line below staff, natural.',
    },
    {
      note: createNote({ id: 'sharp', noteName: 'F', accidental: 'sharp', octave: 3, staffStep: 6, clef: 'bass', spawnedAtMs: 0 }),
      expected: 'Lead single note: bass clef, fourth line from bottom, sharp accidental.',
    },
    {
      note: createNote({ id: 'flat', noteName: 'B', accidental: 'flat', octave: 3, staffStep: 4, clef: 'bass', spawnedAtMs: 0 }),
      expected: 'Lead single note: bass clef, middle line of staff, flat accidental.',
    },
  ];

  for (const { note, expected } of cases) {
    const description = buildNotationPromptDescription(makeStateWithQueue([note]));
    assert.equal(description, expected);
    assert.doesNotMatch(description, new RegExp(`\\b${note.noteName}\\b|${note.answer}|${note.displayName}`));
  }
});

test('notation prompt describes chord and preview positions and accidentals without exposing answers', () => {
  const lead = createNote({
    id: 'chord-lead',
    kind: 'chord',
    chordName: 'C',
    quality: 'major',
    notes: ['C', 'E', 'G'],
    staffSteps: [-2, 0, 2],
    clef: 'treble',
    spawnedAtMs: 0,
  });
  const preview = createNote({ id: 'secret-preview', noteName: 'A', accidental: 'sharp', octave: 5, staffStep: 10, clef: 'treble', spawnedAtMs: 0 });

  const description = buildNotationPromptDescription(makeStateWithQueue([lead, preview]));

  assert.equal(description, 'Lead chord with 3 notes: treble clef; first ledger line below staff, bottom line of staff, second line from bottom; natural. Preview 1: treble clef, first ledger line above staff, sharp accidental.');
  assert.doesNotMatch(description, /C major|C-E-G|A5|secret-preview/);
});

test('stage accessible label stays synchronized with clef, mode, and play style', () => {
  assert.equal(buildStageAccessibleLabel({ clef: 'treble', modeLabel: 'Sharps', playStyle: 'rush' }), 'Treble clef · Sharps mode · Rush playfield');
  assert.equal(buildStageAccessibleLabel({ clef: 'bass', modeLabel: 'Bass', playStyle: 'practice' }), 'Bass clef · Bass mode · Practice playfield');
  assert.equal(buildStageAccessibleLabel({ clef: 'treble', modeLabel: 'Chords', playStyle: 'practice' }), 'Treble clef · Chords mode · Practice playfield');
});

test('notation accessibility writes once per prompt rather than once per animation frame', () => {
  const note = createNote({ id: 'prompt-1', noteName: 'C', octave: 4, staffStep: -2, clef: 'treble', spawnedAtMs: 0 });
  const next = createNote({ id: 'prompt-2', noteName: 'D', octave: 4, staffStep: -1, clef: 'treble', spawnedAtMs: 1000 });
  const writes = [];
  const promptElement = {
    dataset: {},
    get textContent() { return writes.at(-1) || ''; },
    set textContent(value) { writes.push(value); },
  };
  const stageElement = {
    ariaLabel: '',
    setAttribute(name, value) {
      assert.equal(name, 'aria-label');
      this.ariaLabel = value;
    },
  };
  const options = { promptElement, stageElement, modeLabel: 'Treble', playStyle: 'rush' };

  syncNotationAccessibility({ ...options, state: makeStateWithQueue([note]), nowMs: 100 });
  syncNotationAccessibility({ ...options, state: makeStateWithQueue([note]), nowMs: 200 });
  syncNotationAccessibility({ ...options, state: makeStateWithQueue([next]), nowMs: 1100 });

  assert.equal(writes.length, 2);
  assert.match(writes[0], /first ledger line below staff/);
  assert.match(writes[1], /space immediately below staff/);
  assert.equal(stageElement.ariaLabel, 'Treble clef · Treble mode · Rush playfield');
});

test('Rush announces bounded movement and urgency transitions instead of every frame', () => {
  const note = createNote({ id: 'rush-prompt', noteName: 'C', octave: 4, staffStep: -2, clef: 'treble', spawnedAtMs: 1000, travelMs: 4000 });
  const writes = [];
  const promptElement = {
    dataset: {},
    get textContent() { return writes.at(-1) || ''; },
    set textContent(value) { writes.push(value); },
  };
  const stageElement = { setAttribute() {} };
  const options = { promptElement, stageElement, state: makeStateWithQueue([note]), modeLabel: 'Treble', playStyle: 'rush' };

  for (const nowMs of [1000, 1200, 2500, 3100, 3300, 4200, 4300]) {
    syncNotationAccessibility({ ...options, nowMs });
  }

  assert.equal(writes.length, 3);
  assert.match(writes[0], /moving toward the cliff/i);
  assert.match(writes[1], /halfway to the cliff/i);
  assert.match(writes[2], /urgent.*near the cliff/i);
});

test('reduced-motion Rush uses stepped note positions and non-motion urgency cues', () => {
  const note = createNote({ id: 'reduced-motion-rush', noteName: 'C', octave: 4, staffStep: -2, clef: 'treble', spawnedAtMs: 1000, travelMs: 4000 });
  const state = { ...makeStateWithQueue([note]), phase: 'running' };

  const early = renderStaffSvg({ state, nowMs: 1200, reducedMotion: true });
  const sameStep = renderStaffSvg({ state, nowMs: 2400, reducedMotion: true });
  const later = renderStaffSvg({ state, nowMs: 3300, reducedMotion: true });
  const urgent = renderStaffSvg({ state, nowMs: 4300, reducedMotion: true });

  const firstX = early.match(/<ellipse cx="([0-9.]+)"/)?.[1];
  const firstProgressWidth = early.match(/width="([0-9.]+)" height="8" rx="4" class="rush-progress"/)?.[1];
  assert.equal(sameStep.match(/<ellipse cx="([0-9.]+)"/)?.[1], firstX, 'reduced-motion Rush does not continuously translate within a step');
  assert.equal(sameStep.match(/width="([0-9.]+)" height="8" rx="4" class="rush-progress"/)?.[1], firstProgressWidth, 'reduced-motion Rush progress cue is stepped, not continuously resizing');
  assert.notEqual(later.match(/<ellipse cx="([0-9.]+)"/)?.[1], firstX, 'reduced-motion Rush can still step progress forward');
  assert.match(urgent, /data-motion="reduced"/);
  assert.match(urgent, /data-urgency="urgent"/);
  assert.match(urgent, /Rush urgency: urgent/);
  assert.match(urgent, /<rect[^>]+class="rush-progress"/);
});

test('practice rendering stays continuous when reduced motion is requested', () => {
  const note = createNote({ id: 'reduced-motion-practice', noteName: 'C', octave: 4, staffStep: -2, clef: 'treble', spawnedAtMs: 1000, travelMs: 4000 });
  const state = makeStateWithQueue([note]);

  const normal = renderStaffSvg({ state, nowMs: 2400 });
  const reduced = renderStaffSvg({ state, nowMs: 2400, reducedMotion: true });

  assert.equal(reduced.match(/<ellipse cx="([0-9.]+)"/)?.[1], normal.match(/<ellipse cx="([0-9.]+)"/)?.[1]);
  assert.doesNotMatch(reduced, /data-motion="reduced"|rush-progress/);
});

test('practice prompts do not emit Rush movement updates', () => {
  const note = createNote({ id: 'practice-prompt', noteName: 'C', octave: 4, staffStep: -2, clef: 'treble', spawnedAtMs: 1000, travelMs: 4000 });
  const writes = [];
  const promptElement = {
    dataset: {},
    get textContent() { return writes.at(-1) || ''; },
    set textContent(value) { writes.push(value); },
  };
  const options = { promptElement, stageElement: { setAttribute() {} }, state: makeStateWithQueue([note]), modeLabel: 'Treble', playStyle: 'practice' };

  syncNotationAccessibility({ ...options, nowMs: 1000 });
  syncNotationAccessibility({ ...options, nowMs: 4500 });

  assert.equal(writes.length, 1);
  assert.doesNotMatch(writes[0], /cliff|urgent/i);
});

test('live region text is only replaced when its value changes', () => {
  const writes = [];
  const element = {
    value: '',
    get textContent() { return this.value; },
    set textContent(value) { this.value = value; writes.push(value); },
  };

  syncLiveRegionText(element, 'Keep going.');
  syncLiveRegionText(element, 'Keep going.');
  syncLiveRegionText(element, 'Nice work.');

  assert.deepEqual(writes, ['Keep going.', 'Nice work.']);
});

test('animated notation and microphone ghost are hidden behind one deliberate prompt description', () => {
  const note = createNote({ id: 'front', noteName: 'C', octave: 4, staffStep: -2, clef: 'treble', spawnedAtMs: 0 });
  const svg = renderStaffSvg({
    state: makeStateWithQueue([note]),
    selectedInputMode: 'microphone',
    microphoneState: { note: { noteName: 'A', octave: 4, answer: 'A', frequency: 440, cents: 0 } },
    nowMs: 1000,
  });

  assert.match(svg, /<svg[^>]+aria-hidden="true"/);
  assert.doesNotMatch(svg, /role="img"|aria-label=/);
});
