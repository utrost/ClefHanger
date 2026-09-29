import 'dart:convert';

import 'mode_catalog.dart';
import 'native_core.dart';
import 'practice_session.dart';

const progressTransferSchema = 'clefhanger-progress-transfer-v1';

class ProgressTransfer {
  const ProgressTransfer(this.progress, this.highScores);
  final Map<String, LessonProgress> progress;
  final Map<String, int> highScores;

  static ProgressTransfer parse(String source) {
    if (source.length > 131072) {
      throw const FormatException('Progress file is too large.');
    }
    final data = jsonDecode(source);
    if (data is! Map || data['schema'] != progressTransferSchema) {
      throw const FormatException('This is not a ClefHanger progress export.');
    }
    final rawProgress = data['progress'];
    final rawScores = data['highScores'];
    if (rawProgress is! Map || rawScores is! Map) {
      throw const FormatException('Progress export is incomplete.');
    }
    final allowedProgress = {
      ...lessonIds,
      for (final mode in NotationMode.values.skip(1)) 'mode.${mode.name}',
    };
    final progress = <String, LessonProgress>{};
    for (final entry in rawProgress.entries) {
      if (entry.key is! String || !allowedProgress.contains(entry.key)) {
        continue;
      }
      if (entry.value is! Map) continue;
      progress[entry.key as String] = LessonProgress.fromJson(entry.value);
    }
    final scores = <String, int>{};
    final scorePattern = RegExp(
      r'^rush\.highScore\.(treble|bass|sharps|flats|chords)\.speed(10|[1-9])\.(beginner|easy|normal|hard)$',
    );
    for (final entry in rawScores.entries) {
      if (entry.key is String &&
          scorePattern.hasMatch(entry.key as String) &&
          entry.value is int &&
          (entry.value as int) > 0) {
        scores[entry.key as String] = (entry.value as int).clamp(0, 1000000000);
      }
    }
    return ProgressTransfer(progress, scores);
  }
}
