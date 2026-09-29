import 'dart:math';
import 'dart:io';
import 'dart:typed_data';

import 'package:clefhanger/native_core.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final enabled = Platform.environment['CLEFHANGER_NATIVE_TESTS'] == '1';
  test(
    'real Rust FFI preserves lesson pools, pitch classes and PCM detection',
    () {
      final core = RustPracticeCore.open();
      addTearDown(core.dispose);
      expect(core.lessonCount, 6);
      expect(
        [for (var i = 0; i < 3; i++) core.lessonNote(0, i).displayName],
        ['C4', 'D4', 'E4'],
      );
      expect(
        [for (var i = 0; i < 5; i++) core.lessonNote(1, i).name],
        ['E', 'G', 'B', 'D', 'F'],
      );
      expect(core.lessonNote(3, 1).staffStep, 10);
      expect(core.classify(130.8128, 60), 4);
      expect(core.classify(130.8128, 60, anyOctave: false), 3);
      expect(core.classify(440, 60), 1);
      final pcm = ByteData(8192);
      for (var i = 0; i < 4096; i++) {
        final sample = (sin(2 * pi * 123.47 * i / 16000) * 9000).toInt();
        pcm.setInt16(i * 2, sample, Endian.little);
      }
      final hz = core.detect(pcm.buffer.asUint8List(), 16000);
      expect(hz, closeTo(123.47, 3));
      expect(core.nearestMidi(hz), 47); // B2
      expect(core.detect(Uint8List(8192), 16000), 0);
    },
    skip: !enabled,
  );
}
