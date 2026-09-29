import 'dart:math';

import 'native_core.dart';
import 'mode_catalog.dart';

class LessonProgress {
  const LessonProgress({
    this.attempts = 0,
    this.correct = 0,
    this.assisted = 0,
    this.recent = const [],
  });
  final int attempts;
  final int correct;
  final int assisted;
  final List<bool> recent;
  int get recentCorrect => recent.where((entry) => entry).length;
  bool get ready => recent.length == 10 && recentCorrect >= 8;

  static int _count(Object? value) => value is int && value >= 0 ? value : 0;
  factory LessonProgress.fromJson(Object? value) {
    if (value is! Map) return const LessonProgress();
    final attempts = _count(value['attempts']);
    return LessonProgress(
      attempts: attempts,
      correct: min(attempts, _count(value['correct'])),
      assisted: min(attempts, _count(value['assisted'])),
      recent: (value['recent'] is List ? value['recent'] as List : const [])
          .whereType<bool>()
          .toList()
          .reversed
          .take(10)
          .toList()
          .reversed
          .toList(),
    );
  }
  Map<String, Object> toJson() => {
    'attempts': attempts,
    'correct': correct,
    'assisted': assisted,
    'recent': recent,
  };
  LessonProgress record({required bool correct, required bool helped}) =>
      LessonProgress(
        attempts: attempts + 1,
        correct: this.correct + (correct ? 1 : 0),
        assisted: assisted + (helped ? 1 : 0),
        recent: helped
            ? recent
            : [...recent, correct].reversed.take(10).toList().reversed.toList(),
      );
}

enum AnswerResult { ignored, correct, wrong }

/// The untimed learning loop. Audio callbacks supply monotonic timestamps.
class PracticeSession {
  PracticeSession(this.core, {int seed = 1}) : _seed = seed;
  final PracticeCore core;
  int _seed;
  int lesson = 0;
  NotationMode mode = NotationMode.treble;
  NativeNote? prompt;
  bool completed = false;
  bool helped = false;
  bool correctionVisible = false;
  String feedback = 'Tap Start practice or Hear this note.';
  int _playbackBlockedUntilMs = 0;
  int? _candidateSinceMs;
  final List<LessonProgress> progress = List.filled(6, const LessonProgress());
  final Map<NotationMode, LessonProgress> modeProgress = {};
  LessonProgress progressFor(NotationMode targetMode, int targetLesson) =>
      targetMode == NotationMode.treble
      ? progress[targetLesson]
      : modeProgress[targetMode] ?? const LessonProgress();
  void setProgressFor(
    NotationMode targetMode,
    int targetLesson,
    LessonProgress value,
  ) {
    if (targetMode == NotationMode.treble) {
      progress[targetLesson] = value;
    } else {
      modeProgress[targetMode] = value;
    }
  }

  LessonProgress get currentProgress => progressFor(mode, lesson);
  bool get started => prompt != null;
  bool canScore(int nowMs) => nowMs >= _playbackBlockedUntilMs;

  void selectLesson(int index) {
    if (index < 0 || index >= lessonIds.length) return;
    lesson = index;
    prompt = null;
    completed = false;
    helped = false;
    correctionVisible = false;
    _candidateSinceMs = null;
    feedback = 'Ready for ${lessonLabels[lesson]}. Tap Start practice.';
  }

  void selectMode(NotationMode value) {
    mode = value;
    prompt = null;
    completed = false;
    helped = false;
    correctionVisible = false;
    _candidateSinceMs = null;
    feedback = 'Ready for ${mode.label}. Tap Start practice.';
  }

  void start() {
    prompt = null;
    completed = false;
    next();
  }

  void next() {
    prompt = promptForMode(core, mode, lesson, _seed);
    _seed = core.nextSeed(_seed);
    completed = false;
    helped = false;
    correctionVisible = false;
    _candidateSinceMs = null;
    feedback = mode == NotationMode.chords
        ? 'Read the stack. Hear the chord if you need help, then name it.'
        : 'Read the note. Hear it if you need help, then sing or play it back.';
  }

  void skip() {
    if (!started) return;
    next();
    feedback = 'Skipped. Here is another practice note.';
  }

  void hear(int nowMs, {int playbackMs = 580}) {
    if (!started) start();
    helped = true;
    _candidateSinceMs = null;
    _playbackBlockedUntilMs = max(
      _playbackBlockedUntilMs,
      nowMs + playbackMs + 300,
    );
    feedback = mode == NotationMode.chords
        ? 'Listen to the chord, then name it. This answer will count as assisted.'
        : 'Listen, then sing the note back. Scoring waits until the sound finishes.';
  }

  void revealGuide() {
    helped = true;
  }

  AnswerResult answer(String name, {bool showCorrection = true}) {
    if (prompt == null || completed) return AnswerResult.ignored;
    final right = prompt!.name == name;
    setProgressFor(
      mode,
      lesson,
      currentProgress.record(correct: right, helped: helped),
    );
    if (right) {
      completed = true;
      correctionVisible = false;
      feedback = '$name — correct. Ready for the next note.';
      return AnswerResult.correct;
    }
    feedback = showCorrection
        ? '$name is not it. The note is ${prompt!.name}; try again.'
        : '$name is not it. Try again.';
    correctionVisible = showCorrection;
    if (showCorrection) {
      helped = true; // Revealed answers make later tries assisted.
    }
    _candidateSinceMs = null;
    return AnswerResult.wrong;
  }

  /// Continuous microphone guidance never records wrong attempts.
  AnswerResult hearFrequency(double hz, int nowMs, {bool anyOctave = true}) {
    if (prompt == null || completed || !mode.supportsMic || !canScore(nowMs)) {
      return AnswerResult.ignored;
    }
    final status = core.classify(hz, prompt!.midi, anyOctave: anyOctave);
    if (status != 4) {
      _candidateSinceMs = null;
      return AnswerResult.ignored;
    }
    _candidateSinceMs ??= nowMs;
    if (nowMs - _candidateSinceMs! < 150) return AnswerResult.ignored;
    return answer(prompt!.name);
  }
}
