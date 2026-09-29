import 'dart:convert';
import 'dart:math' as math;
import 'dart:typed_data';

import 'native_core.dart';

const nativePrototypeVersion = 'clefhanger-native-0.1.0';

class MicCaptureSummary {
  const MicCaptureSummary(this.bytes, this.rms, this.frequency, this.midi);
  final int bytes;
  final double rms;
  final double frequency;
  final int? midi;
}

/// One second of PCM in memory, summarized without retaining or exporting audio.
class MicDiagnosticCapture {
  final _pcm = Uint8List(32000);
  int _bytes = 0;

  void add(Uint8List packet) {
    final count = math.min(packet.length & ~1, _pcm.length - _bytes);
    if (count <= 0) return;
    _pcm.setRange(_bytes, _bytes + count, packet);
    _bytes += count;
  }

  MicCaptureSummary finish(PracticeCore core) {
    final samples = ByteData.sublistView(_pcm, 0, _bytes);
    var power = 0.0;
    for (var offset = 0; offset < _bytes; offset += 2) {
      final value = samples.getInt16(offset, Endian.little) / 32768.0;
      power += value * value;
    }
    final rms = _bytes == 0 ? 0.0 : math.sqrt(power / (_bytes ~/ 2));
    final window = _bytes >= 8192
        ? Uint8List.sublistView(_pcm, _bytes - 8192, _bytes)
        : Uint8List.sublistView(_pcm, 0, _bytes);
    final frequency = _bytes >= 8192 ? core.detect(window, 16000) : 0.0;
    final midi = frequency > 0 ? core.nearestMidi(frequency) : -1;
    return MicCaptureSummary(_bytes, rms, frequency, midi < 0 ? null : midi);
  }
}

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
  MicCaptureSummary? recording,
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
  if (recording != null)
    'recording': {
      'bytes': recording.bytes,
      'rms': recording.rms,
      'frequency': recording.frequency > 0 ? recording.frequency : null,
      'midi': recording.midi,
    },
});
