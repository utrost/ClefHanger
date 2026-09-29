import 'dart:math' as math;

import 'native_core.dart';
import 'mode_catalog.dart';

enum RushPhase { idle, running, paused, ended }

enum RushDifficulty {
  beginner('Beginner', 1, 1.2, 1),
  easy('Easy', 1, 1, 1),
  normal('Normal', 2, 0.9, 1.35),
  hard('Hard', 3, 0.78, 1.8);

  const RushDifficulty(
    this.label,
    this.queueSize,
    this.travelFactor,
    this.scoreFactor,
  );
  final String label;
  final int queueSize;
  final double travelFactor;
  final double scoreFactor;
}

class RushPrompt {
  const RushPrompt(this.note, this.spawnedAtMs, this.deadlineMs);
  final NativeNote note;
  final int spawnedAtMs;
  final int deadlineMs;
  RushPrompt shifted(int ms) =>
      RushPrompt(note, spawnedAtMs + ms, deadlineMs + ms);
}

/// Monotonic-timestamp Rush rules. Flutter supplies time and input; Rust selects notes.
class RushSession {
  RushSession(
    this.core, {
    required this.lesson,
    this.mode = NotationMode.treble,
    int seed = 1,
    this.speed = 5,
    this.difficulty = RushDifficulty.beginner,
  }) : _seed = seed;

  final PracticeCore core;
  final int lesson;
  final NotationMode mode;
  int _seed;
  int speed;
  RushDifficulty difficulty;
  RushPhase phase = RushPhase.idle;
  int endsAtMs = 0;
  int? pausedAtMs;
  final List<RushPrompt> queue = [];
  int score = 0;
  int correct = 0;
  int wrong = 0;
  int missed = 0;
  int streak = 0;
  int bestStreak = 0;
  String feedback = 'A 60-second challenge on this lesson.';
  int? _candidateSinceMs;
  int _playbackBlockedUntilMs = 0;

  static const _speedFactors = [
    1.45,
    1.32,
    1.2,
    1.1,
    1.0,
    0.92,
    0.84,
    0.77,
    0.71,
    0.65,
  ];
  int get travelMs =>
      ((mode == NotationMode.chords
                  ? 6200
                  : mode == NotationMode.sharps || mode == NotationMode.flats
                  ? 5600
                  : 5200) *
              _speedFactors[speed.clamp(1, 10) - 1] *
              difficulty.travelFactor)
          .round();
  RushPrompt? get front => queue.isEmpty ? null : queue.first;
  int get attempts => correct + wrong + missed;
  int get accuracy => attempts == 0 ? 0 : (correct * 100 / attempts).round();
  String get highScoreKey =>
      'rush.highScore.${mode.name}.speed$speed.${difficulty.name}';
  int remainingSeconds(int nowMs) => phase == RushPhase.idle
      ? 60
      : math.max(
          0,
          ((endsAtMs - (phase == RushPhase.paused ? pausedAtMs! : nowMs)) /
                  1000)
              .ceil(),
        );

  void start(int nowMs) {
    phase = RushPhase.running;
    endsAtMs = nowMs + 60000;
    pausedAtMs = null;
    queue.clear();
    score = correct = wrong = missed = streak = bestStreak = 0;
    _candidateSinceMs = null;
    _playbackBlockedUntilMs = 0;
    feedback = mode == NotationMode.chords
        ? 'Name the front chord before it reaches the edge.'
        : 'Name the front note before it reaches the edge.';
    _fillQueue(nowMs);
  }

  void _fillQueue(int nowMs) {
    while (phase == RushPhase.running && queue.length < difficulty.queueSize) {
      final note = promptForMode(core, mode, lesson, _seed);
      _seed = core.nextSeed(_seed);
      final spawn = nowMs + (queue.length * travelMs * 0.18).round();
      queue.add(RushPrompt(note, spawn, spawn + travelMs));
    }
  }

  void tick(int nowMs) {
    if (phase != RushPhase.running) return;
    while (queue.isNotEmpty && nowMs > queue.first.deadlineMs) {
      final lost = queue.removeAt(0);
      missed++;
      streak = 0;
      _candidateSinceMs = null;
      feedback = '${lost.note.name} fell off the staff.';
    }
    if (nowMs >= endsAtMs) {
      phase = RushPhase.ended;
      queue.clear();
      feedback = 'Time! Sprint complete.';
      return;
    }
    _fillQueue(nowMs);
  }

  bool answer(String answer, int nowMs) {
    tick(nowMs);
    if (phase != RushPhase.running || queue.isEmpty) return false;
    final target = queue.first.note.name;
    if (answer != target) {
      wrong++;
      streak = 0;
      _candidateSinceMs = null;
      feedback = '$answer is not it. Try again.';
      return false;
    }
    final speedBonus = speed >= 8
        ? 40
        : speed >= 6
        ? 20
        : 0;
    final streakBonus = math.min(80, streak * 20);
    final points =
        ((mode.basePoints + speedBonus + streakBonus) * difficulty.scoreFactor)
            .round();
    score += points;
    correct++;
    streak++;
    bestStreak = math.max(bestStreak, streak);
    queue.removeAt(0);
    _candidateSinceMs = null;
    feedback = '$answer — held on! +$points';
    _fillQueue(nowMs);
    return true;
  }

  void blockPlayback(int nowMs, {int playbackMs = 580}) {
    _playbackBlockedUntilMs = math.max(
      _playbackBlockedUntilMs,
      nowMs + playbackMs + 300,
    );
    _candidateSinceMs = null;
  }

  bool hearFrequency(double hz, int nowMs, {bool anyOctave = true}) {
    tick(nowMs);
    if (phase != RushPhase.running ||
        !mode.supportsMic ||
        front == null ||
        nowMs < _playbackBlockedUntilMs) {
      return false;
    }
    if (core.classify(hz, front!.note.midi, anyOctave: anyOctave) != 4) {
      _candidateSinceMs = null;
      return false;
    }
    _candidateSinceMs ??= nowMs;
    if (nowMs - _candidateSinceMs! < 150) return false;
    return answer(front!.note.name, nowMs);
  }

  void pause(int nowMs) {
    if (phase != RushPhase.running) return;
    tick(nowMs);
    if (phase == RushPhase.running) {
      phase = RushPhase.paused;
      pausedAtMs = nowMs;
      _candidateSinceMs = null;
      feedback = 'Rush paused. Resume when ready.';
    }
  }

  void resume(int nowMs) {
    if (phase != RushPhase.paused) return;
    final elapsed = math.max(0, nowMs - pausedAtMs!);
    endsAtMs += elapsed;
    for (var index = 0; index < queue.length; index++) {
      queue[index] = queue[index].shifted(elapsed);
    }
    pausedAtMs = null;
    phase = RushPhase.running;
    feedback = mode == NotationMode.chords
        ? 'Rush resumed. Name the front chord.'
        : 'Rush resumed. Name the front note.';
  }
}
