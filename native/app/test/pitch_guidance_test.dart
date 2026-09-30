import 'dart:math';
import 'package:clefhanger/native_core.dart';
import 'package:clefhanger/pitch_guidance.dart';
import 'package:flutter_test/flutter_test.dart';
import 'practice_session_test.dart' show FakeCore;

void main() {
  final core = FakeCore();
  const target = NativeNote(id: 0, midi: 67, staffStep: 2);
  test('low and high voices receive useful directions in their octave', () {
    final low = PitchGuidance.from(
      core,
      core.frequency(42),
      target,
      anyOctave: true,
    )!;
    expect(low.cents, -100);
    expect(low.message, contains('higher'));
    final high = PitchGuidance.from(
      core,
      core.frequency(44),
      target,
      anyOctave: true,
    )!;
    expect(high.cents, 100);
    expect(high.message, contains('lower'));
    expect(
      PitchGuidance.from(
        core,
        core.frequency(43),
        target,
        anyOctave: true,
      )!.matched,
      true,
    );
    expect(
      PitchGuidance.from(
        core,
        core.frequency(43),
        target,
        anyOctave: false,
      )!.matched,
      false,
    );
  });
  test('tolerance and absent input agree with the scoring classifier', () {
    final inside = core.frequency(67) * pow(2, 40 / 1200);
    final outside = core.frequency(67) * pow(2, 65 / 1200);
    expect(
      PitchGuidance.from(core, inside, target, anyOctave: true)!.matched,
      true,
    );
    expect(
      PitchGuidance.from(core, outside, target, anyOctave: true)!.matched,
      false,
    );
    expect(PitchGuidance.from(core, 0, target, anyOctave: true), isNull);
    expect(
      PitchGuidance.from(core, double.nan, target, anyOctave: true),
      isNull,
    );
  });
}
