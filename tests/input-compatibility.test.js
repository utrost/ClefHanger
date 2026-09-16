import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildInputCompatibilityMessage,
  isInputModePlayableForMode,
  resolvePlayableInputMode,
} from '../src/core/input-compatibility.js';

test('chord mode cannot use Sing/Play because microphone scoring is single-note only', () => {
  assert.equal(isInputModePlayableForMode('chords', 'microphone'), false);
  assert.equal(isInputModePlayableForMode('chords', 'buttons'), true);
  assert.equal(isInputModePlayableForMode('chords', 'piano'), false);

  for (const modeId of ['basics', 'bass', 'sharps', 'flats']) {
    assert.equal(isInputModePlayableForMode(modeId, 'microphone'), true, `${modeId} remains sing/playable`);
  }
});

test('unplayable Chords plus Sing/Play resolves to Notes with player-facing copy', () => {
  assert.equal(resolvePlayableInputMode({ modeId: 'chords', inputMode: 'microphone' }), 'buttons');
  assert.equal(resolvePlayableInputMode({ modeId: 'chords', inputMode: 'piano' }), 'buttons');
  assert.equal(resolvePlayableInputMode({ modeId: 'basics', inputMode: 'microphone' }), 'microphone');

  assert.deepEqual(buildInputCompatibilityMessage({ modeId: 'chords', requestedInputMode: 'microphone', resolvedInputMode: 'buttons' }), {
    kind: 'input-compatibility',
    text: 'Chord mode needs Notes. Switched from Sing/Play to Notes so every chord has answer buttons.',
  });
  assert.deepEqual(buildInputCompatibilityMessage({ modeId: 'chords', requestedInputMode: 'piano', resolvedInputMode: 'buttons' }), {
    kind: 'input-compatibility',
    text: 'Chord mode needs Notes. Switched from Piano to Notes so every chord has answer buttons.',
  });
  assert.equal(buildInputCompatibilityMessage({ modeId: 'basics', requestedInputMode: 'microphone', resolvedInputMode: 'microphone' }), null);
});
