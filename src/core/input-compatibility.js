const INPUT_MODE_LABELS = Object.freeze({
  microphone: 'Sing/Play',
  piano: 'Piano',
  buttons: 'Notes',
});

export function isInputModePlayableForMode(modeId, inputMode) {
  return !(modeId === 'chords' && (inputMode === 'microphone' || inputMode === 'piano'));
}

export function resolvePlayableInputMode({ modeId, inputMode }) {
  return isInputModePlayableForMode(modeId, inputMode) ? inputMode : 'buttons';
}

export function buildInputCompatibilityMessage({ modeId, requestedInputMode, resolvedInputMode }) {
  if (modeId === 'chords' && requestedInputMode !== resolvedInputMode) {
    const requestedLabel = INPUT_MODE_LABELS[requestedInputMode] || requestedInputMode;
    return {
      kind: 'input-compatibility',
      text: `Chord mode needs Notes. Switched from ${requestedLabel} to Notes so every chord has answer buttons.`,
    };
  }
  return null;
}
