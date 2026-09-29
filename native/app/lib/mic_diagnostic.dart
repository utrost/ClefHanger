import 'dart:convert';

const nativePrototypeVersion = 'clefhanger-native-0.1.0';

/// Plain-text JSON report; no audio samples or device identifiers are collected.
String buildMicDiagnostic({
  required DateTime capturedAt,
  required bool listening,
  required String guidance,
  required double inputLevel,
  required double frequency,
  required int? midi,
  required int? cents,
  required bool matchAnyOctave,
  required String lessonId,
}) => const JsonEncoder.withIndent('  ').convert({
  'schema': 'clefhanger-native-mic-report-v1',
  'appVersion': nativePrototypeVersion,
  'capturedAt': capturedAt.toUtc().toIso8601String(),
  'platform': 'android',
  'sampleRate': 16000,
  'lesson': lessonId,
  'listening': listening,
  'guidance': guidance,
  'matchAnyOctave': matchAnyOctave,
  'live': {
    'inputLevel': inputLevel,
    'frequency': frequency > 0 ? frequency : null,
    'midi': midi,
    'cents': cents,
  },
});
