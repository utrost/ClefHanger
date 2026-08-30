import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BASS_NOTES,
  GAME_MODES,
  LEVEL_ONE_NOTES,
  SPEED_SETTINGS,
  STAFF_LAYOUT,
  createInitialState,
  getClefPresentation,
  getLedgerLinesForStaffStep,
  getSpeed,
  spawnNextNote,
} from '../src/core/game.js';

test('staff layout anchors treble and bass clefs on their correct staff lines', () => {
  assert.equal(STAFF_LAYOUT.trebleGLineY, 112);
  assert.equal(STAFF_LAYOUT.trebleClefY + STAFF_LAYOUT.trebleClefLoopOffsetY, STAFF_LAYOUT.trebleGLineY);
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

test('ledger-line geometry only draws short lines for notes outside the staff', () => {
  assert.deepEqual(getLedgerLinesForStaffStep(-1), []);
  assert.deepEqual(getLedgerLinesForStaffStep(9), []);
  assert.deepEqual(getLedgerLinesForStaffStep(-2), [{ staffStep: -2, y: 152 }]);
  assert.deepEqual(getLedgerLinesForStaffStep(10), [{ staffStep: 10, y: 32 }]);
  assert.deepEqual(getLedgerLinesForStaffStep(12), [{ staffStep: 10, y: 32 }, { staffStep: 12, y: 12 }]);
});

test('treble basics includes the first ledger-line notes just outside the staff', () => {
  assert.ok(LEVEL_ONE_NOTES.some((note) => note.noteName === 'C' && note.octave === 4 && note.staffStep === -2));
  assert.ok(LEVEL_ONE_NOTES.some((note) => note.noteName === 'A' && note.octave === 5 && note.staffStep === 10));
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
  assert.deepEqual(SPEED_SETTINGS.map((speed) => speed.id), ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
  assert.equal(getSpeed('1').label, 'Speed 1');

  const slow = spawnNextNote(createInitialState({ nowMs: 1000, seed: 5, modeId: 'basics', speedId: '1' }), 1000);
  const fast = spawnNextNote(createInitialState({ nowMs: 1000, seed: 5, modeId: 'basics', speedId: '10' }), 1000);

  assert.equal(slow.speedId, '1');
  assert.equal(fast.speedId, '10');
  assert.ok(slow.activeNote.deadlineMs - slow.activeNote.spawnedAtMs > fast.activeNote.deadlineMs - fast.activeNote.spawnedAtMs);
  assert.equal(slow.modeId, fast.modeId);
});
