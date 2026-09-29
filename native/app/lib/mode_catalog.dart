import 'native_core.dart';

enum NotationMode {
  treble('Treble', 100, true),
  bass('Bass', 120, true),
  sharps('Sharps #', 150, true),
  flats('Flats ♭', 150, true),
  chords('Chords', 240, false);

  const NotationMode(this.label, this.basePoints, this.supportsMic);
  final String label;
  final int basePoints;
  final bool supportsMic;
}

String modeIntroduction(NotationMode mode) => switch (mode) {
  NotationMode.treble =>
    'See the staff position first, then sing or name the note.',
  NotationMode.bass =>
    'Bass clef places F on the fourth line. Read the lower staff position, then sing, hum, or play the note.',
  NotationMode.sharps =>
    'A sharp raises the written note by one semitone. Notice its staff position before sounding it.',
  NotationMode.flats =>
    'A flat lowers the written note by one semitone. D♭ sounds like C♯ but sits at D’s staff position.',
  NotationMode.chords =>
    'Read the three-note stack and name the chord. Use the chord buttons; single-note microphone scoring cannot identify a chord.',
};

class ModeAnswer {
  const ModeAnswer(this.label, this.answer);
  final String label;
  final String answer;
}

// Keep written spelling separate from sounding MIDI: D♭ and C♯ sound alike
// but occupy different staff positions and require different touch answers.
const bassNotes = <NativeNote>[
  NativeNote(id: 100, midi: 40, staffStep: -2, clef: 'bass'),
  NativeNote(id: 101, midi: 41, staffStep: -1, clef: 'bass'),
  NativeNote(id: 102, midi: 43, staffStep: 0, clef: 'bass'),
  NativeNote(id: 103, midi: 45, staffStep: 1, clef: 'bass'),
  NativeNote(id: 104, midi: 47, staffStep: 2, clef: 'bass'),
  NativeNote(id: 105, midi: 48, staffStep: 3, clef: 'bass'),
  NativeNote(id: 106, midi: 50, staffStep: 4, clef: 'bass'),
  NativeNote(id: 107, midi: 52, staffStep: 5, clef: 'bass'),
  NativeNote(id: 108, midi: 53, staffStep: 6, clef: 'bass'),
  NativeNote(id: 109, midi: 55, staffStep: 7, clef: 'bass'),
  NativeNote(id: 110, midi: 57, staffStep: 8, clef: 'bass'),
];

const sharpNotes = <NativeNote>[
  NativeNote(
    id: 200,
    midi: 61,
    staffStep: -2,
    writtenName: 'C♯',
    accidental: '♯',
  ),
  NativeNote(
    id: 201,
    midi: 63,
    staffStep: -1,
    writtenName: 'D♯',
    accidental: '♯',
  ),
  NativeNote(
    id: 202,
    midi: 66,
    staffStep: 1,
    writtenName: 'F♯',
    accidental: '♯',
  ),
  NativeNote(
    id: 203,
    midi: 68,
    staffStep: 2,
    writtenName: 'G♯',
    accidental: '♯',
  ),
  NativeNote(
    id: 204,
    midi: 70,
    staffStep: 3,
    writtenName: 'A♯',
    accidental: '♯',
  ),
  NativeNote(
    id: 205,
    midi: 73,
    staffStep: 5,
    writtenName: 'C♯',
    accidental: '♯',
  ),
  NativeNote(
    id: 206,
    midi: 75,
    staffStep: 6,
    writtenName: 'D♯',
    accidental: '♯',
  ),
];

const flatNotes = <NativeNote>[
  NativeNote(
    id: 300,
    midi: 61,
    staffStep: -1,
    writtenName: 'D♭',
    accidental: '♭',
  ),
  NativeNote(
    id: 301,
    midi: 63,
    staffStep: 0,
    writtenName: 'E♭',
    accidental: '♭',
  ),
  NativeNote(
    id: 302,
    midi: 66,
    staffStep: 2,
    writtenName: 'G♭',
    accidental: '♭',
  ),
  NativeNote(
    id: 303,
    midi: 68,
    staffStep: 3,
    writtenName: 'A♭',
    accidental: '♭',
  ),
  NativeNote(
    id: 304,
    midi: 70,
    staffStep: 4,
    writtenName: 'B♭',
    accidental: '♭',
  ),
  NativeNote(
    id: 305,
    midi: 73,
    staffStep: 6,
    writtenName: 'D♭',
    accidental: '♭',
  ),
  NativeNote(
    id: 306,
    midi: 75,
    staffStep: 7,
    writtenName: 'E♭',
    accidental: '♭',
  ),
];

const chordNotes = <NativeNote>[
  NativeNote(
    id: 400,
    midi: 60,
    staffStep: -2,
    writtenName: 'C major',
    chordStaffSteps: [-2, 0, 2],
    chordMidis: [60, 64, 67],
  ),
  NativeNote(
    id: 401,
    midi: 62,
    staffStep: -1,
    writtenName: 'D minor',
    chordStaffSteps: [-1, 1, 3],
    chordMidis: [62, 65, 69],
  ),
  NativeNote(
    id: 402,
    midi: 64,
    staffStep: 0,
    writtenName: 'E minor',
    chordStaffSteps: [0, 2, 4],
    chordMidis: [64, 67, 71],
  ),
  NativeNote(
    id: 403,
    midi: 65,
    staffStep: 1,
    writtenName: 'F major',
    chordStaffSteps: [1, 3, 5],
    chordMidis: [65, 69, 72],
  ),
  NativeNote(
    id: 404,
    midi: 67,
    staffStep: 2,
    writtenName: 'G major',
    chordStaffSteps: [2, 4, 6],
    chordMidis: [67, 71, 74],
  ),
  NativeNote(
    id: 405,
    midi: 69,
    staffStep: 3,
    writtenName: 'A minor',
    chordStaffSteps: [3, 5, 7],
    chordMidis: [69, 72, 76],
  ),
];

List<NativeNote> modeNotes(NotationMode mode) => switch (mode) {
  NotationMode.treble => const [], // Rust owns treble lesson pools.
  NotationMode.bass => bassNotes,
  NotationMode.sharps => sharpNotes,
  NotationMode.flats => flatNotes,
  NotationMode.chords => chordNotes,
};

String writtenNoteHint(NativeNote note) {
  if (note.isChord) return 'The three noteheads form a ${note.name} stack.';
  final step = note.staffStep;
  final place = step == -2
      ? 'the ledger line below the staff'
      : step == -1
      ? 'the space below the staff'
      : step == 10
      ? 'the first ledger line above the staff'
      : step > 8
      ? 'above the staff'
      : '${step.isEven ? 'line' : 'space'} ${(step ~/ 2) + 1} from the bottom';
  final accidental = note.accidental == '♯'
      ? ' The sharp raises the written note by one semitone.'
      : note.accidental == '♭'
      ? ' The flat lowers the written note by one semitone.'
      : '';
  return '${note.name} sits at $place in the ${note.clef} clef.$accidental';
}

List<ModeAnswer> modeAnswers(NotationMode mode) => switch (mode) {
  NotationMode.sharps => const [
    ModeAnswer('C♯', 'C♯'),
    ModeAnswer('D♯', 'D♯'),
    ModeAnswer('F♯', 'F♯'),
    ModeAnswer('G♯', 'G♯'),
    ModeAnswer('A♯', 'A♯'),
  ],
  NotationMode.flats => const [
    ModeAnswer('D♭', 'D♭'),
    ModeAnswer('E♭', 'E♭'),
    ModeAnswer('G♭', 'G♭'),
    ModeAnswer('A♭', 'A♭'),
    ModeAnswer('B♭', 'B♭'),
  ],
  NotationMode.chords => const [
    ModeAnswer('C', 'C major'),
    ModeAnswer('Dm', 'D minor'),
    ModeAnswer('Em', 'E minor'),
    ModeAnswer('F', 'F major'),
    ModeAnswer('G', 'G major'),
    ModeAnswer('Am', 'A minor'),
  ],
  _ => const [
    ModeAnswer('C', 'C'),
    ModeAnswer('D', 'D'),
    ModeAnswer('E', 'E'),
    ModeAnswer('F', 'F'),
    ModeAnswer('G', 'G'),
    ModeAnswer('A', 'A'),
    ModeAnswer('B', 'B'),
  ],
};

NativeNote promptForMode(
  PracticeCore core,
  NotationMode mode,
  int lesson,
  int seed,
) {
  if (mode == NotationMode.treble) return core.promptNote(lesson, seed);
  final pool = modeNotes(mode);
  return pool[core.nextSeed(seed) % pool.length];
}
