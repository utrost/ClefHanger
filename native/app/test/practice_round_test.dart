import 'package:clefhanger/practice_session.dart';
import 'package:clefhanger/mode_catalog.dart';
import 'package:flutter_test/flutter_test.dart';
import 'practice_session_test.dart' show FakeCore;

void main() {
  test('first lesson teaches C D E and checks the same set', () {
    final session = PracticeSession(FakeCore(), seed: 7)..start();
    final warmup = <String>[];
    for (var i = 0; i < 3; i++) {
      warmup.add(session.prompt!.name);
      session.hear(i * 2000);
      session.answer(session.prompt!.name);
      session.next();
    }
    expect(warmup, ['C', 'D', 'E']);
    expect(session.round!.checking, true);
    final checks = <String>{};
    for (var i = 0; i < 3; i++) {
      checks.add(session.prompt!.name);
      session.answer(session.prompt!.name);
      session.next();
    }
    expect(checks, {'C', 'D', 'E'});
    expect(session.roundFinished, true);
    expect(session.round!.matched, 6);
    expect(session.round!.independentChecks, 3);
    expect(session.currentProgress.assisted, 3);
    expect(session.answer(session.prompt!.name), AnswerResult.ignored);
  });

  test('corrections, help and skips cannot inflate the independent check', () {
    final session = PracticeSession(FakeCore())..start();
    for (var i = 0; i < 3; i++) {
      session.answer(session.prompt!.name);
      session.next();
    }
    session.answer('Z', showCorrection: false);
    session.answer(session.prompt!.name);
    session.next();
    session.hear(1000);
    session.answer(session.prompt!.name);
    session.next();
    session.skip();
    expect(session.roundFinished, true);
    expect(session.round!.independentChecks, 0);
    expect(session.round!.helpedChecks, 1);
    expect(session.round!.skipped, 1);
    expect(session.round!.reviewNotes.length, 3);
    session.selectMode(NotationMode.bass);
    expect(session.round, isNull);
    session.start(shortRound: false);
    for (var i = 0; i < 8; i++) {
      session.answer(session.prompt!.name);
      session.next();
    }
    expect(session.roundFinished, false);
  });

  test('a gap in microphone samples restarts the hold', () {
    final core = FakeCore();
    final session = PracticeSession(core)..start();
    final hz = core.frequency(session.prompt!.midi);
    session.hearFrequency(hz, 1000);
    session.hearFrequency(hz, 1100);
    expect(session.hearFrequency(hz, 2500), AnswerResult.ignored);
    expect(session.micMatchProgress(2500), 0);
    for (var t = 2600; t < 3500; t += 100) {
      session.hearFrequency(hz, t);
    }
    expect(session.hearFrequency(hz, 3500), AnswerResult.correct);
  });
}
