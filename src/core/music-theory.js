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

function ordinal(value) {
  const words = ['zeroth', 'first', 'second', 'third', 'fourth', 'fifth'];
  if (words[value]) return words[value];
  const remainder100 = value % 100;
  if (remainder100 >= 11 && remainder100 <= 13) return `${value}th`;
  if (value % 10 === 1) return `${value}st`;
  if (value % 10 === 2) return `${value}nd`;
  if (value % 10 === 3) return `${value}rd`;
  return `${value}th`;
}

export function describeStaffPosition(staffStep = 0) {
  if (staffStep === -1) return 'space immediately below staff';
  if (staffStep === 9) return 'space immediately above staff';
  if (staffStep < -1) {
    const ledgerNumber = Math.floor(Math.abs(staffStep) / 2);
    return staffStep % 2 === 0
      ? `${ordinal(ledgerNumber)} ledger line below staff`
      : `space below ${ordinal(ledgerNumber)} ledger line below staff`;
  }
  if (staffStep > 9) {
    const ledgerNumber = Math.floor((staffStep - 8) / 2);
    return staffStep % 2 === 0
      ? `${ordinal(ledgerNumber)} ledger line above staff`
      : `space above ${ordinal(ledgerNumber)} ledger line above staff`;
  }
  if (staffStep % 2 === 0) {
    const line = (staffStep / 2) + 1;
    if (line === 1) return 'bottom line of staff';
    if (line === 3) return 'middle line of staff';
    if (line === 5) return 'top line of staff';
    return `${ordinal(line)} line from bottom`;
  }
  const space = ((staffStep - 1) / 2) + 1;
  if (space === 1) return 'bottom space of staff';
  if (space === 4) return 'top space of staff';
  return `${ordinal(space)} space from bottom`;
}
