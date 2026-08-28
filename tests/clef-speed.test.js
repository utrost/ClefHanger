import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BASS_NOTES,
  GAME_MODES,
  SPEED_SETTINGS,
  STAFF_LAYOUT,
  createInitialState,
  getClefPresentation,
  getSpeed,
  spawnNextNote,
} from '../src/core/game.js';

test('staff layout anchors treble and bass clefs on their correct staff lines', () => {
  assert.deepEqual(getClefPresentation('treble'), {
    clef: 'treble',
    glyph: '𝄞',
    x: STAFF_LAYOUT.clefX,
    y: STAFF_LAYOUT.trebleClefY,
    anchorLine: 'G4 line',
  });
  assert.deepEqual(getClefPresentation('bass'), {
    clef: 'bass',
    glyph: '𝄢',
    x: STAFF_LAYOUT.clefX,
    y: STAFF_LAYOUT.bassClefY,
    anchorLine: 'F3 line',
  });
});

test('ships a bass-clef basics mode with lower-register natural notes', () => {
  assert.ok(GAME_MODES.some((mode) => mode.id === 'bass'));
  assert.deepEqual(BASS_NOTES.map((note) => `${note.noteName}${note.octave}`), ['E2', 'F2', 'G2', 'A2', 'B2', 'C3', 'D3', 'E3', 'F3', 'G3', 'A3']);
  const bassState = createInitialState({ nowMs: 0, seed: 3, modeId: 'bass' });
  const spawned = spawnNextNote(bassState, 0);
  assert.equal(spawned.activeNote.clef, 'bass');
  assert.match(spawned.activeNote.displayName, /^[A-G][23]$/);
});

test('speed settings regulate travel deadlines without changing scoring mode', () => {
  assert.deepEqual(SPEED_SETTINGS.map((speed) => speed.id), ['slow', 'normal', 'fast']);
  assert.equal(getSpeed('slow').label, 'Slow');

  const slow = spawnNextNote(createInitialState({ nowMs: 1000, seed: 5, modeId: 'basics', speedId: 'slow' }), 1000);
  const fast = spawnNextNote(createInitialState({ nowMs: 1000, seed: 5, modeId: 'basics', speedId: 'fast' }), 1000);

  assert.equal(slow.speedId, 'slow');
  assert.equal(fast.speedId, 'fast');
  assert.ok(slow.activeNote.deadlineMs - slow.activeNote.spawnedAtMs > fast.activeNote.deadlineMs - fast.activeNote.spawnedAtMs);
  assert.equal(slow.modeId, fast.modeId);
});
