export const NOTE_BUTTONS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
export const ACCIDENTAL_BUTTONS = ['C♯', 'D♯', 'F♯', 'G♯', 'A♯', 'D♭', 'E♭', 'G♭', 'A♭', 'B♭'];
export const PIANO_WHITE_KEYS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
export const PIANO_BLACK_KEYS = [
  { id: 'c-sharp', sharp: 'C♯', flat: 'D♭', after: 'C' },
  { id: 'd-sharp', sharp: 'D♯', flat: 'E♭', after: 'D' },
  { id: 'f-sharp', sharp: 'F♯', flat: 'G♭', after: 'F' },
  { id: 'g-sharp', sharp: 'G♯', flat: 'A♭', after: 'G' },
  { id: 'a-sharp', sharp: 'A♯', flat: 'B♭', after: 'A' },
];

const SPEED_MULTIPLIERS = [1.45, 1.32, 1.2, 1.1, 1, 0.92, 0.84, 0.77, 0.71, 0.65];

export const SPEED_SETTINGS = SPEED_MULTIPLIERS.map((multiplier, index) => {
  const value = index + 1;
  return { id: String(value), value, label: `Speed ${value}`, multiplier };
});

export const DIFFICULTY_LEVELS = [
  { id: 'beginner', label: 'Beginner', noteQueueSize: 1, travelMultiplier: 1.2, scoreMultiplier: 1, help: 'Slow single notes in a forgiving starter lane.' },
  { id: 'easy', label: 'Easy', noteQueueSize: 1, travelMultiplier: 1, scoreMultiplier: 1, help: 'Classic one-note rush with normal scoring.' },
  { id: 'normal', label: 'Normal', noteQueueSize: 2, travelMultiplier: 0.9, scoreMultiplier: 1.35, help: 'Two-note preview: answer the front note first.' },
  { id: 'hard', label: 'Hard', noteQueueSize: 3, travelMultiplier: 0.78, scoreMultiplier: 1.8, help: 'Three notes on the staff and higher reward.' },
];

export function getSpeed(speedId = '5') {
  const parsed = Number.parseInt(speedId, 10);
  if (Number.isNaN(parsed)) return SPEED_SETTINGS[4];
  const clamped = Math.min(10, Math.max(1, parsed));
  return SPEED_SETTINGS[clamped - 1];
}

export function getDifficulty(difficultyId = 'beginner') {
  return DIFFICULTY_LEVELS.find((difficulty) => difficulty.id === difficultyId) || DIFFICULTY_LEVELS[0];
}

export const LEVEL_ONE_NOTES = [
  { clef: 'treble', noteName: 'C', octave: 4, staffStep: -2, label: 'middle C' },
  { clef: 'treble', noteName: 'D', octave: 4, staffStep: -1, label: 'D4' },
  { clef: 'treble', noteName: 'E', octave: 4, staffStep: 0, label: 'bottom line E' },
  { clef: 'treble', noteName: 'F', octave: 4, staffStep: 1, label: 'F4' },
  { clef: 'treble', noteName: 'G', octave: 4, staffStep: 2, label: 'G4' },
  { clef: 'treble', noteName: 'A', octave: 4, staffStep: 3, label: 'A4' },
  { clef: 'treble', noteName: 'B', octave: 4, staffStep: 4, label: 'B4' },
  { clef: 'treble', noteName: 'C', octave: 5, staffStep: 5, label: 'C5' },
  { clef: 'treble', noteName: 'D', octave: 5, staffStep: 6, label: 'D5' },
  { clef: 'treble', noteName: 'E', octave: 5, staffStep: 7, label: 'top space E' },
  { clef: 'treble', noteName: 'F', octave: 5, staffStep: 8, label: 'top line F' },
  { clef: 'treble', noteName: 'G', octave: 5, staffStep: 9, label: 'G just above the staff' },
  { clef: 'treble', noteName: 'A', octave: 5, staffStep: 10, label: 'A on the first ledger line above the staff' },
];

export const BASS_NOTES = [
  { clef: 'bass', noteName: 'E', octave: 2, staffStep: -2, label: 'low E' },
  { clef: 'bass', noteName: 'F', octave: 2, staffStep: -1, label: 'F2' },
  { clef: 'bass', noteName: 'G', octave: 2, staffStep: 0, label: 'bottom line G' },
  { clef: 'bass', noteName: 'A', octave: 2, staffStep: 1, label: 'A2' },
  { clef: 'bass', noteName: 'B', octave: 2, staffStep: 2, label: 'B2' },
  { clef: 'bass', noteName: 'C', octave: 3, staffStep: 3, label: 'C3' },
  { clef: 'bass', noteName: 'D', octave: 3, staffStep: 4, label: 'D3' },
  { clef: 'bass', noteName: 'E', octave: 3, staffStep: 5, label: 'E3' },
  { clef: 'bass', noteName: 'F', octave: 3, staffStep: 6, label: 'F3' },
  { clef: 'bass', noteName: 'G', octave: 3, staffStep: 7, label: 'G3' },
  { clef: 'bass', noteName: 'A', octave: 3, staffStep: 8, label: 'A3' },
];

export const SHARP_NOTES = [
  { clef: 'treble', noteName: 'C', accidental: 'sharp', octave: 4, staffStep: -2 },
  { clef: 'treble', noteName: 'D', accidental: 'sharp', octave: 4, staffStep: -1 },
  { clef: 'treble', noteName: 'F', accidental: 'sharp', octave: 4, staffStep: 1 },
  { clef: 'treble', noteName: 'G', accidental: 'sharp', octave: 4, staffStep: 2 },
  { clef: 'treble', noteName: 'A', accidental: 'sharp', octave: 4, staffStep: 3 },
  { clef: 'treble', noteName: 'C', accidental: 'sharp', octave: 5, staffStep: 5 },
  { clef: 'treble', noteName: 'D', accidental: 'sharp', octave: 5, staffStep: 6 },
];

export const FLAT_NOTES = [
  { clef: 'treble', noteName: 'D', accidental: 'flat', octave: 4, staffStep: -1 },
  { clef: 'treble', noteName: 'E', accidental: 'flat', octave: 4, staffStep: 0 },
  { clef: 'treble', noteName: 'G', accidental: 'flat', octave: 4, staffStep: 2 },
  { clef: 'treble', noteName: 'A', accidental: 'flat', octave: 4, staffStep: 3 },
  { clef: 'treble', noteName: 'B', accidental: 'flat', octave: 4, staffStep: 4 },
  { clef: 'treble', noteName: 'D', accidental: 'flat', octave: 5, staffStep: 6 },
  { clef: 'treble', noteName: 'E', accidental: 'flat', octave: 5, staffStep: 7 },
];

export const CHORDS = [
  { clef: 'treble', chordName: 'C', quality: 'major', notes: ['C', 'E', 'G'], staffSteps: [-2, 0, 2] },
  { clef: 'treble', chordName: 'D', quality: 'minor', notes: ['D', 'F', 'A'], staffSteps: [-1, 1, 3] },
  { clef: 'treble', chordName: 'E', quality: 'minor', notes: ['E', 'G', 'B'], staffSteps: [0, 2, 4] },
  { clef: 'treble', chordName: 'F', quality: 'major', notes: ['F', 'A', 'C'], staffSteps: [1, 3, 5] },
  { clef: 'treble', chordName: 'G', quality: 'major', notes: ['G', 'B', 'D'], staffSteps: [2, 4, 6] },
  { clef: 'treble', chordName: 'A', quality: 'minor', notes: ['A', 'C', 'E'], staffSteps: [3, 5, 7] },
];

export const GAME_MODES = [
  { id: 'basics', label: 'Treble', shortLabel: 'Treble', kind: 'note', clef: 'treble', pool: LEVEL_ONE_NOTES, basePoints: 100, help: 'Natural treble notes.' },
  { id: 'bass', label: 'Bass', shortLabel: 'Bass', kind: 'note', clef: 'bass', pool: BASS_NOTES, basePoints: 120, help: 'Natural bass-clef notes.' },
  { id: 'sharps', label: 'Sharps #', shortLabel: '#', kind: 'note', clef: 'treble', pool: SHARP_NOTES, basePoints: 150, help: 'Treble notes with sharps.' },
  { id: 'flats', label: 'Flats ♭', shortLabel: '♭', kind: 'note', clef: 'treble', pool: FLAT_NOTES, basePoints: 150, help: 'Treble notes with flats.' },
  { id: 'chords', label: 'Chords', shortLabel: 'Chords', kind: 'chord', clef: 'treble', pool: CHORDS, basePoints: 240, help: 'Name the three-note stack.' },
];

export function getMode(modeId = 'basics') {
  return GAME_MODES.find((mode) => mode.id === modeId) || GAME_MODES[0];
}

export function getAnswerOptions(modeId = 'basics') {
  const mode = getMode(modeId);
  if (mode.id === 'sharps') return ACCIDENTAL_BUTTONS.filter((note) => note.includes('♯')).map((note) => ({ label: note, answer: note }));
  if (mode.id === 'flats') return ACCIDENTAL_BUTTONS.filter((note) => note.includes('♭')).map((note) => ({ label: note, answer: note }));
  if (mode.kind === 'chord') {
    return mode.pool.map((chord) => ({
      label: `${chord.chordName}${chord.quality === 'minor' ? 'm' : ''}`,
      answer: chord.notes.join('-'),
    }));
  }
  return NOTE_BUTTONS.map((note) => ({ label: note, answer: note }));
}
