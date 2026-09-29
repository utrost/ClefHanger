import 'dart:ffi';
import 'dart:io';
import 'dart:typed_data';

import 'package:ffi/ffi.dart';

const lessonIds = <String>[
  'first-steps',
  'line-notes',
  'space-notes',
  'ledger-notes',
  'interval-jumps',
  'mixed',
];
const lessonLabels = <String>[
  'First steps',
  'Line notes',
  'Space notes',
  'Ledger lines',
  'Interval jumps',
  'Mixed notes',
];
const lessonIntroductions = <String>[
  'Start with middle C, the space above it (D), and the bottom line (E). Hear a note, then sing it back.',
  'See each staff line, then sing E G B D F from bottom to top.',
  'See the space between the lines, then sing F A C E.',
  'Find the short extra line just outside the staff, then aim for C or A.',
  'Hear the distance: repeat, take a step, or skip one note.',
  'Practise all seven natural note names across the treble staff.',
];

typedef _Int0Native = Int32 Function();
typedef _Int0 = int Function();
typedef _Int1Native = Int32 Function(Int32);
typedef _Int1 = int Function(int);
typedef _Int2Native = Int32 Function(Int32, Int32);
typedef _Int2 = int Function(int, int);
typedef _PromptNative = Int32 Function(Int32, Uint32);
typedef _Prompt = int Function(int, int);
typedef _SeedNative = Uint32 Function(Uint32);
typedef _Seed = int Function(int);
typedef _FrequencyNative = Double Function(Int32);
typedef _Frequency = double Function(int);
typedef _MidiNative = Int32 Function(Double);
typedef _Midi = int Function(double);
typedef _CentsNative = Int32 Function(Double, Int32);
typedef _Cents = int Function(double, int);
typedef _ClassifyNative = Int32 Function(Double, Int32, Int32);
typedef _Classify = int Function(double, int, int);
typedef _DetectNative = Double Function(Pointer<Int16>, Int32, Int32);
typedef _Detect = double Function(Pointer<Int16>, int, int);

class NativeNote {
  const NativeNote({
    required this.id,
    required this.midi,
    required this.staffStep,
    this.writtenName,
    this.clef = 'treble',
    this.accidental,
    this.chordStaffSteps = const [],
    this.chordMidis = const [],
  });
  final int id;
  final int midi;
  final int staffStep;
  final String? writtenName;
  final String clef;
  final String? accidental;
  final List<int> chordStaffSteps;
  final List<int> chordMidis;
  bool get isChord => chordStaffSteps.isNotEmpty;
  String get name =>
      writtenName ??
      const [
        'C',
        'C♯',
        'D',
        'D♯',
        'E',
        'F',
        'F♯',
        'G',
        'G♯',
        'A',
        'A♯',
        'B',
      ][midi % 12];
  int get octave => midi ~/ 12 - 1;
  String get displayName => isChord ? name : '$name$octave';
}

abstract class PracticeCore {
  int get lessonCount;
  int lessonLength(int lesson);
  NativeNote lessonNote(int lesson, int index);
  NativeNote promptNote(int lesson, int seed);
  int nextSeed(int seed);
  double frequency(int midi);
  int nearestMidi(double hz);
  int cents(double hz, int midi);
  int classify(double hz, int targetMidi, {bool anyOctave = true});
  double detect(Uint8List littleEndianPcm16, int sampleRate);
  void dispose();
}

/// C ABI boundary, following the other Flutter/Rust project's explicit FFI pattern.
class RustPracticeCore implements PracticeCore {
  RustPracticeCore._(DynamicLibrary library)
    : _abi = library.lookupFunction<_Int0Native, _Int0>(
        'clef_core_abi_version',
      ),
      _lessonCount = library.lookupFunction<_Int0Native, _Int0>(
        'clef_lesson_count',
      ),
      _lessonLength = library.lookupFunction<_Int1Native, _Int1>(
        'clef_lesson_len',
      ),
      _lessonNote = library.lookupFunction<_Int2Native, _Int2>(
        'clef_lesson_note',
      ),
      _promptNote = library.lookupFunction<_PromptNative, _Prompt>(
        'clef_prompt_note',
      ),
      _nextSeed = library.lookupFunction<_SeedNative, _Seed>('clef_next_seed'),
      _noteMidi = library.lookupFunction<_Int1Native, _Int1>('clef_note_midi'),
      _noteStep = library.lookupFunction<_Int1Native, _Int1>('clef_note_step'),
      _frequency = library.lookupFunction<_FrequencyNative, _Frequency>(
        'clef_frequency',
      ),
      _nearestMidi = library.lookupFunction<_MidiNative, _Midi>(
        'clef_nearest_midi',
      ),
      _cents = library.lookupFunction<_CentsNative, _Cents>('clef_cents'),
      _classify = library.lookupFunction<_ClassifyNative, _Classify>(
        'clef_classify',
      ),
      _detect = library.lookupFunction<_DetectNative, _Detect>(
        'clef_detect_pcm16',
      ) {
    if (_abi() != 1) throw StateError('Incompatible ClefHanger Rust core');
  }

  factory RustPracticeCore.open() {
    if (Platform.isAndroid || Platform.isLinux) {
      return RustPracticeCore._(DynamicLibrary.open('libclefhanger_core.so'));
    }
    throw UnsupportedError(
      'The native practice core is currently built for Android and Linux tests.',
    );
  }

  final _Int0 _abi, _lessonCount;
  final _Int1 _lessonLength, _noteMidi, _noteStep;
  final _Int2 _lessonNote;
  final _Prompt _promptNote;
  final _Seed _nextSeed;
  final _Frequency _frequency;
  final _Midi _nearestMidi;
  final _Cents _cents;
  final _Classify _classify;
  final _Detect _detect;
  Pointer<Int16>? _buffer;

  @override
  int get lessonCount => _lessonCount();
  @override
  int lessonLength(int lesson) => _lessonLength(lesson);
  NativeNote note(int id) =>
      NativeNote(id: id, midi: _noteMidi(id), staffStep: _noteStep(id));
  @override
  NativeNote lessonNote(int lesson, int index) =>
      note(_lessonNote(lesson, index));
  @override
  NativeNote promptNote(int lesson, int seed) =>
      note(_promptNote(lesson, seed));
  @override
  int nextSeed(int seed) => _nextSeed(seed);
  @override
  double frequency(int midi) => _frequency(midi);
  @override
  int nearestMidi(double hz) => _nearestMidi(hz);
  @override
  int cents(double hz, int midi) => _cents(hz, midi);
  @override
  int classify(double hz, int targetMidi, {bool anyOctave = true}) =>
      _classify(hz, targetMidi, anyOctave ? 1 : 0);
  @override
  double detect(Uint8List littleEndianPcm16, int sampleRate) {
    if (littleEndianPcm16.lengthInBytes < 512 ||
        littleEndianPcm16.lengthInBytes.isOdd) {
      return 0;
    }
    final count = littleEndianPcm16.lengthInBytes ~/ 2;
    if (count > 16384) return 0;
    _buffer ??= calloc<Int16>(16384);
    final data = ByteData.sublistView(littleEndianPcm16);
    for (var i = 0; i < count; i++) {
      _buffer![i] = data.getInt16(i * 2, Endian.little);
    }
    return _detect(_buffer!, count, sampleRate);
  }

  @override
  void dispose() {
    if (_buffer case final buffer?) {
      calloc.free(buffer);
      _buffer = null;
    }
  }
}
