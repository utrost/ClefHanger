import 'dart:math';

import 'native_core.dart';
import 'mode_catalog.dart';
import 'practice_round.dart';

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
  static const micHoldMs = 1000;
  PracticeSession(this.core, {int seed = 1}) : _seed = seed;
  final PracticeCore core;
  int _seed;
  int lesson = 0;
  NotationMode mode = NotationMode.treble;
  NativeNote? prompt;
  bool completed = false;
  bool helped = false;
  bool correctionVisible = false;
  bool _promptMistake = false;
  PracticeRound? round;
  bool get roundFinished => round?.finished ?? false;
  String feedback = 'Tap Start practice or Hear this note.';
  int _playbackBlockedUntilMs = 0;
  int? _candidateSinceMs;
  int? _lastMatchingSampleMs;
  List<int> _checkOrder = [0, 1, 2];
  NativeNote? _previousAnswered;
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
    round = null;
    prompt = null;
    completed = false;
    helped = false;
    correctionVisible = false;
    _candidateSinceMs = null;
    _previousAnswered = null;
    feedback = 'Ready for ${lessonLabels[lesson]}. Tap Start practice.';
  }

  void selectMode(NotationMode value) {
    mode = value;
    round = null;
    prompt = null;
    completed = false;
    helped = false;
    correctionVisible = false;
    _candidateSinceMs = null;
    _previousAnswered = null;
    feedback = 'Ready for ${mode.label}. Tap Start practice.';
  }

  void start({bool shortRound = true}) {
    round = shortRound ? PracticeRound() : null;
    _checkOrder = [0, 1, 2]..shuffle(Random(_seed));
    prompt = null;
    completed = false;
    _previousAnswered = null;
    next();
  }

  void next() {
    if (roundFinished) return;
    if (completed && mode == NotationMode.treble && lesson == 4) {
      _previousAnswered = prompt;
    }
    if (round != null && mode == NotationMode.treble && lesson == 0) {
      final position = round!.resolved;
      prompt = core.lessonNote(
        0,
        position < 3 ? position : _checkOrder[position - 3],
      );
    } else {
      prompt = promptForMode(core, mode, lesson, _seed);
    }
    _seed = core.nextSeed(_seed);
    completed = false;
    helped = false;
    correctionVisible = false;
    _promptMistake = false;
    _candidateSinceMs = null;
    feedback = mode == NotationMode.chords
        ? 'Read the stack. Hear the chord if you need help, then name it.'
        : round?.checking == true
        ? 'Try this note without listening first. Help is still available whenever you need it.'
        : 'Read the note. Hear it if you need help, then sing or play it back.';
  }

  void skip() {
    if (!started || roundFinished) return;
    if (!completed) {
      round?.record(
        prompt!.name,
        correct: false,
        helped: helped,
        mistake: _promptMistake,
      );
    }
    completed = roundFinished;
    if (roundFinished) return;
    completed = false;
    _previousAnswered = null;
    next();
    feedback = 'Skipped. Here is another practice note.';
  }

  void hear(int nowMs, {int playbackMs = 720}) {
    if (roundFinished) return;
    if (!started) start();
    helped = true;
    blockPlayback(nowMs, playbackMs: playbackMs);
    feedback = mode == NotationMode.chords
        ? 'Listen to the chord, then name it. This answer will count as assisted.'
        : 'Listen, then sing the note back. Scoring waits until the sound finishes.';
  }

  void blockPlayback(int nowMs, {int playbackMs = 720}) {
    _candidateSinceMs = null;
    _playbackBlockedUntilMs = max(
      _playbackBlockedUntilMs,
      nowMs + playbackMs + 300,
    );
  }

  void revealGuide() {
    helped = true;
  }

  void resetMicMatch() {
    _candidateSinceMs = null;
    _lastMatchingSampleMs = null;
  }

  double micMatchProgress(int nowMs) => completed
      ? 1
      : _candidateSinceMs == null
      ? 0
      : ((nowMs - _candidateSinceMs!) / micHoldMs).clamp(0.0, 1.0).toDouble();

  AnswerResult answer(String name, {bool showCorrection = true}) {
    if (prompt == null || completed) return AnswerResult.ignored;
    final right = prompt!.name == name;
    setProgressFor(
      mode,
      lesson,
      currentProgress.record(correct: right, helped: helped),
    );
    if (right) {
      round?.record(
        prompt!.name,
        correct: true,
        helped: helped,
        mistake: _promptMistake,
      );
      completed = true;
      correctionVisible = false;
      feedback =
          '$name — correct. ${writtenNoteHint(prompt!)}${_intervalHint(prompt!)} Ready for the next note.';
      return AnswerResult.correct;
    }
    _promptMistake = true;
    feedback = showCorrection
        ? '$name is not it. The note is ${prompt!.name}. ${writtenNoteHint(prompt!)} Try again.'
        : '$name is not it. Try again.';
    correctionVisible = showCorrection;
    if (showCorrection) {
      helped = true; // Revealed answers make later tries assisted.
    }
    _candidateSinceMs = null;
    return AnswerResult.wrong;
  }

  String _intervalHint(NativeNote note) {
    if (mode != NotationMode.treble ||
        lesson != 4 ||
        _previousAnswered == null) {
      return '';
    }
    final steps = note.staffStep - _previousAnswered!.staffStep;
    final direction = steps >= 0 ? 'up' : 'down';
    final distance = steps.abs();
    if (distance == 0) return ' Same staff spot as the last note.';
    if (distance == 1) return ' One step $direction from the last note.';
    if (distance == 2) return ' A skip $direction over one note.';
    return ' A jump $direction from the last note.';
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
    if (_lastMatchingSampleMs != null && nowMs - _lastMatchingSampleMs! > 400) {
      _candidateSinceMs = null;
    }
    _lastMatchingSampleMs = nowMs;
    _candidateSinceMs ??= nowMs;
    if (nowMs - _candidateSinceMs! < micHoldMs) return AnswerResult.ignored;
    return answer(prompt!.name);
  }
}
