import 'package:clefhanger/native_core.dart';
import 'package:clefhanger/staff.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('heard G2 appears beside a G4 treble target while retaining its octave', () {
    const target = NativeNote(id: 1, midi: 67, staffStep: 2);
    final ghost = ghostPitchForMidi(target, 43);
    expect(ghost.staffStep, target.staffStep);
    expect(ghost.midi, 67);
    expect(ghost.accidental, isNull);
  });

  test('bass and flat spelling place the heard pitch on the right staff step', () {
    const bass = NativeNote(id: 2, midi: 43, staffStep: 0, clef: 'bass');
    expect(ghostPitchForMidi(bass, 55).staffStep, 0);
    const flat = NativeNote(
      id: 3,
      midi: 61,
      staffStep: -1,
      accidental: '♭',
    );
    final ghost = ghostPitchForMidi(flat, 61);
    expect(ghost.staffStep, -1);
    expect(ghost.accidental, '♭');
  });
}
