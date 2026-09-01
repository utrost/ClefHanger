export function accidentalSymbol(accidental) {
  if (accidental === 'sharp') return '♯';
  if (accidental === 'flat') return '♭';
  return '';
}

export function answerLabel(noteName, accidental) {
  return `${noteName}${accidentalSymbol(accidental)}`;
}

export const SEMITONES_FROM_C = {
  C: 0,
  'C♯': 1,
  'D♭': 1,
  D: 2,
  'D♯': 3,
  'E♭': 3,
  E: 4,
  F: 5,
  'F♯': 6,
  'G♭': 6,
  G: 7,
  'G♯': 8,
  'A♭': 8,
  A: 9,
  'A♯': 10,
  'B♭': 10,
  B: 11,
};

const DIATONIC_STEPS_FROM_C = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };

export function getStaffStepForPitch({ noteName, octave } = {}, clef = 'treble') {
  if (!noteName || octave === undefined) return null;
  const diatonicStep = DIATONIC_STEPS_FROM_C[noteName[0]];
  if (diatonicStep === undefined || !Number.isFinite(octave)) return null;
  if (clef === 'bass') {
    return -2 + (octave - 2) * 7 + (diatonicStep - DIATONIC_STEPS_FROM_C.E);
  }
  return -2 + (octave - 4) * 7 + diatonicStep;
}

export function createGhostNoteFromPitch(pitch, clef = 'treble') {
  if (!pitch) return null;
  const staffStep = getStaffStepForPitch(pitch, clef);
  if (staffStep === null) return null;
  return {
    id: 'ghost-note',
    kind: 'note',
    clef,
    noteName: pitch.noteName,
    accidental: pitch.accidental,
    octave: pitch.octave,
    answer: pitch.answer,
    displayName: `${pitch.answer}${pitch.octave}`,
    staffStep,
    frequency: pitch.frequency,
    cents: pitch.cents,
    status: 'ghost',
  };
}

export function getPitchFrequency(noteName, octave = 4, accidental) {
  const label = answerLabel(noteName, accidental);
  const semitone = SEMITONES_FROM_C[label];
  if (semitone === undefined) return null;
  const midi = (octave + 1) * 12 + semitone;
  return 440 * (2 ** ((midi - 69) / 12));
}

export function getPromptFrequencies(prompt) {
  if (!prompt) return [];
  if (prompt.kind === 'chord') {
    return (prompt.notes || [])
      .map((noteName) => getPitchFrequency(noteName, 4))
      .filter((frequency) => frequency !== null);
  }
  const frequency = getPitchFrequency(prompt.noteName, prompt.octave, prompt.accidental);
  return frequency === null ? [] : [frequency];
}
