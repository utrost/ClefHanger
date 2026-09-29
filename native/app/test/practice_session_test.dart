import 'dart:math';
import 'dart:typed_data';
import 'package:clefhanger/native_core.dart';
import 'package:clefhanger/mode_catalog.dart';
import 'package:clefhanger/practice_session.dart';
import 'package:flutter_test/flutter_test.dart';

class FakeCore implements PracticeCore {
  final _notes = const [
    NativeNote(id: 0, midi: 60, staffStep: -2),
    NativeNote(id: 1, midi: 62, staffStep: -1),
    NativeNote(id: 2, midi: 64, staffStep: 0),
  ];
  @override
  int get lessonCount => 6;
  @override
  int lessonLength(int lesson) => 3;
  @override
  NativeNote lessonNote(int lesson, int index) => _notes[index];
  @override
  NativeNote promptNote(int lesson, int seed) => _notes[seed % 3];
  @override
  int nextSeed(int seed) => seed + 1;
  @override
  double frequency(int midi) => 440 * pow(2, (midi - 69) / 12).toDouble();
  @override
  int nearestMidi(double hz) =>
      hz <= 0 ? -1 : (69 + 12 * log(hz / 440) / ln2).round();
  @override
  int cents(double hz, int midi) =>
      (1200 * log(hz / frequency(midi)) / ln2).round();
  @override
  int classify(double hz, int targetMidi, {bool anyOctave = true}) {
    final midi = nearestMidi(hz);
    if (midi < 0) return 0;
    if (midi % 12 != targetMidi % 12) return 1;
    if (!anyOctave && midi != targetMidi) return 3;
    return cents(hz, midi).abs() <= 50 ? 4 : 2;
  }

  @override
  double detect(Uint8List data, int sampleRate) => 0;
  @override
  void dispose() {}
}

void main() {
  test('first lesson starts with one note and skips without scoring', () {
    final session = PracticeSession(FakeCore(), seed: 0);
    session.start();
    expect(session.prompt!.displayName, 'C4');
    session.skip();
    expect(session.prompt!.displayName, 'D4');
    expect(session.currentProgress.attempts, 0);
  });

  test(
    'wrong answer is independent once; revealed correction makes the next try assisted',
    () {
      final session = PracticeSession(FakeCore(), seed: 0)..start();
      expect(session.answer('D'), AnswerResult.wrong);
      expect(session.currentProgress.recent, [false]);
      expect(session.correctionVisible, true);
      expect(session.answer('C'), AnswerResult.correct);
      expect(session.currentProgress.attempts, 2);
      expect(session.currentProgress.correct, 1);
      expect(session.currentProgress.assisted, 1);
      expect(session.currentProgress.recent, [false]);
      expect(session.answer('C'), AnswerResult.ignored);
    },
  );

  test(
    'hints off conceals the answer and leaves a later correction independent',
    () {
      final session = PracticeSession(FakeCore(), seed: 0)..start();
      expect(session.answer('D', showCorrection: false), AnswerResult.wrong);
      expect(session.feedback, isNot(contains('The note is C')));
      expect(session.correctionVisible, false);
      expect(session.answer('C', showCorrection: false), AnswerResult.correct);
      expect(session.currentProgress.recent, [false, true]);
      expect(session.currentProgress.assisted, 0);
    },
  );

  test(
    'listening blocks scoring through acoustic tail and marks the prompt assisted',
    () {
      final core = FakeCore();
      final session = PracticeSession(core, seed: 0)..hear(1000);
      expect(session.prompt!.name, 'C');
      expect(session.canScore(1879), false);
      expect(session.canScore(1880), true);
      final hz = core.frequency(60);
      expect(session.hearFrequency(hz, 1880), AnswerResult.ignored);
      expect(session.hearFrequency(hz, 2029), AnswerResult.ignored);
      expect(session.hearFrequency(hz, 2030), AnswerResult.correct);
      expect(session.currentProgress.assisted, 1);
      expect(session.currentProgress.recent, isEmpty);
    },
  );

  test('live tuning is neutral until one stable matching note arrives', () {
    final core = FakeCore();
    final session = PracticeSession(core, seed: 0)..start();
    expect(
      session.hearFrequency(core.frequency(62), 1000),
      AnswerResult.ignored,
    );
    expect(session.currentProgress.attempts, 0);
    expect(
      session.hearFrequency(core.frequency(60), 1100),
      AnswerResult.ignored,
    );
    expect(
      session.hearFrequency(core.frequency(62), 1200),
      AnswerResult.ignored,
    );
    expect(
      session.hearFrequency(core.frequency(60), 1300),
      AnswerResult.ignored,
    );
    expect(
      session.hearFrequency(core.frequency(60), 1450),
      AnswerResult.correct,
    );
    expect(session.currentProgress.recent, [true]);
  });

  test('concert A playback blocks self scoring without marking help', () {
    final core = FakeCore();
    final session = PracticeSession(core, seed: 0)..start();
    session.blockPlayback(1000, playbackMs: 1100);
    expect(
      session.hearFrequency(core.frequency(60), 2399),
      AnswerResult.ignored,
    );
    expect(
      session.hearFrequency(core.frequency(60), 2400),
      AnswerResult.ignored,
    );
    expect(
      session.hearFrequency(core.frequency(60), 2550),
      AnswerResult.correct,
    );
    expect(session.currentProgress.assisted, 0);
  });

  test(
    'mode progress stays separate and written flats accept sounding pitch',
    () {
      final core = FakeCore();
      final session = PracticeSession(core, seed: 6);
      session.selectMode(NotationMode.flats);
      session.start();
      expect(session.prompt!.name, 'D♭');
      expect(session.prompt!.staffStep, -1);
      expect(
        session.hearFrequency(core.frequency(61), 100),
        AnswerResult.ignored,
      );
      expect(
        session.hearFrequency(core.frequency(61), 250),
        AnswerResult.correct,
      );
      expect(session.currentProgress.correct, 1);
      session.selectMode(NotationMode.treble);
      expect(session.currentProgress.attempts, 0);
      session.selectMode(NotationMode.flats);
      expect(session.currentProgress.correct, 1);
    },
  );

  test('chords use touch answers and reject single-pitch mic scoring', () {
    final core = FakeCore();
    final session = PracticeSession(core, seed: 0)
      ..selectMode(NotationMode.chords)
      ..start();
    expect(session.prompt!.name, 'D minor');
    expect(
      session.hearFrequency(core.frequency(62), 1000),
      AnswerResult.ignored,
    );
    expect(session.answer('D minor'), AnswerResult.correct);
    expect(session.currentProgress.recent, [true]);
  });

  test('feedback explains staff position, accidentals and interval steps', () {
    final session = PracticeSession(FakeCore(), seed: 6)
      ..selectMode(NotationMode.flats)
      ..start();
    expect(session.answer('E♭'), AnswerResult.wrong);
    expect(session.feedback, contains('flat lowers'));
    expect(session.feedback, contains('space below'));

    final intervals = PracticeSession(FakeCore(), seed: 0)
      ..selectLesson(4)
      ..start();
    expect(intervals.answer('C'), AnswerResult.correct);
    intervals.next();
    expect(intervals.answer('D'), AnswerResult.correct);
    expect(intervals.feedback, contains('One step up'));
    intervals.skip();
    expect(intervals.answer(intervals.prompt!.name), AnswerResult.correct);
    expect(intervals.feedback, isNot(contains('from the last note')));
  });

  test(
    'progress parsing bounds corrupt data and readiness uses last ten independent answers',
    () {
      final bad = LessonProgress.fromJson({
        'attempts': 2,
        'correct': 99,
        'assisted': -1,
        'recent': [true, 'bad', false],
      });
      expect(bad.correct, 2);
      expect(bad.assisted, 0);
      expect(bad.recent, [true, false]);
      var progress = const LessonProgress();
      for (var i = 0; i < 10; i++) {
        progress = progress.record(correct: i < 8, helped: false);
      }
      expect(progress.ready, true);
      progress = progress.record(correct: true, helped: true);
      expect(progress.recent.length, 10);
      expect(progress.assisted, 1);
      expect(progress.ready, true);
    },
  );
}
