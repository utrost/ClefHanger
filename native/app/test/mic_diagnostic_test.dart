import 'dart:convert';
import 'dart:typed_data';
import 'package:clefhanger/mic_diagnostic.dart';
import 'package:flutter_test/flutter_test.dart';

import 'practice_session_test.dart' show FakeCore;

void main() {
  test(
    'native mic report is copyable JSON without audio samples or device identifiers',
    () {
      final report = buildMicDiagnostic(
        capturedAt: DateTime.utc(2026, 9, 29, 21, 0),
        listening: true,
        guidance: 'I hear B2.',
        inputLevel: 0.052,
        frequency: 123.47,
        midi: 47,
        cents: -14,
        matchAnyOctave: true,
        lessonId: 'first-steps',
      );
      final data = jsonDecode(report) as Map<String, dynamic>;
      expect(data['schema'], 'clefhanger-native-mic-report-v1');
      expect(data['live']['midi'], 47);
      expect(data['live']['cents'], -14);
      expect(data['live']['inputLevel'], 0.052);
      expect(data.containsKey('samples'), false);
      expect(data.containsKey('deviceId'), false);
    },
  );

  test('one-second PCM capture is bounded and only exports measurements', () {
    final capture = MicDiagnosticCapture();
    final packet = Uint8List(4096);
    final data = ByteData.sublistView(packet);
    for (var offset = 0; offset < packet.length; offset += 2) {
      data.setInt16(offset, 16384, Endian.little);
    }
    for (var index = 0; index < 10; index++) {
      capture.add(packet);
    }
    final summary = capture.finish(FakeCore());
    expect(summary.bytes, 32000);
    expect(summary.rms, closeTo(0.5, 0.001));
    final report = buildMicDiagnostic(
      capturedAt: DateTime.utc(2026, 9, 30),
      listening: true,
      guidance: 'Test',
      inputLevel: 0.5,
      frequency: 0,
      midi: null,
      cents: null,
      matchAnyOctave: true,
      lessonId: 'first-steps',
      recording: summary,
    );
    final json = jsonDecode(report) as Map<String, dynamic>;
    expect(json['recording']['bytes'], 32000);
    expect(json['recording'].containsKey('samples'), false);
    expect(report, isNot(contains('16384')));
  });
}
