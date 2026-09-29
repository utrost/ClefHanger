import 'package:clefhanger/rush_session.dart';
import 'package:flutter_test/flutter_test.dart';

import 'practice_session_test.dart' show FakeCore;

void main() {
  test('Rush scores front notes and keeps wrong answers on the staff', () {
    final session = RushSession(FakeCore(), lesson: 0, seed: 0)..start(1000);
    expect(session.phase, RushPhase.running);
    expect(session.front!.note.name, 'C');
    expect(session.remainingSeconds(1000), 60);
    expect(session.answer('D', 1100), false);
    expect(session.wrong, 1);
    expect(session.front!.note.name, 'C');
    expect(session.answer('C', 1200), true);
    expect(session.score, 100);
    expect(session.front!.note.name, 'D');
    expect(session.answer('D', 1300), true);
    expect(session.score, 220);
    expect(session.bestStreak, 2);
    expect(session.accuracy, 67);
  });

  test('misses expire, pause freezes deadlines, and resume shifts them', () {
    final session = RushSession(FakeCore(), lesson: 0, seed: 0)..start(0);
    final oldDeadline = session.front!.deadlineMs;
    session.pause(1000);
    expect(session.phase, RushPhase.paused);
    expect(session.remainingSeconds(9000), 59);
    session.tick(9000);
    expect(session.missed, 0);
    session.resume(9000);
    expect(session.front!.deadlineMs, oldDeadline + 8000);
    session.tick(oldDeadline + 8000);
    expect(session.missed, 0);
    session.tick(oldDeadline + 8001);
    expect(session.missed, 1);
  });

  test(
    'timeout clears the queue and rejects late touch and microphone answers',
    () {
      final session = RushSession(FakeCore(), lesson: 0, seed: 0)..start(0);
      session.tick(60000);
      expect(session.phase, RushPhase.ended);
      expect(session.front, isNull);
      final result = (
        session.score,
        session.correct,
        session.wrong,
        session.missed,
      );
      expect(session.answer('C', 60001), false);
      expect(session.hearFrequency(261.63, 60200), false);
      expect((
        session.score,
        session.correct,
        session.wrong,
        session.missed,
      ), result);
    },
  );

  test('microphone waits for playback tail and one stable pitch', () {
    final session = RushSession(FakeCore(), lesson: 0, seed: 0)..start(0);
    session.blockPlayback(1000);
    expect(session.hearFrequency(261.63, 1500), false);
    expect(session.hearFrequency(261.63, 1880), false);
    expect(session.hearFrequency(261.63, 2030), true);
    expect(session.correct, 1);
  });

  test('difficulty controls queue size, speed, and score', () {
    final session = RushSession(
      FakeCore(),
      lesson: 0,
      speed: 8,
      difficulty: RushDifficulty.hard,
    )..start(0);
    expect(session.queue.length, 3);
    expect(session.travelMs, (5200 * 0.77 * 0.78).round());
    expect(session.answer(session.front!.note.name, 10), true);
    expect(session.score, ((100 + 40) * 1.8).round());
    expect(session.queue.length, 3);
  });
}
