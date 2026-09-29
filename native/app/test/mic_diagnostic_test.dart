import 'dart:convert';
import 'package:clefhanger/mic_diagnostic.dart';
import 'package:flutter_test/flutter_test.dart';

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
}
