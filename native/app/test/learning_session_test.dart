import 'dart:convert';
import 'dart:math';
import 'package:flutter_test/flutter_test.dart';
import 'package:clefhanger/learning_session.dart';
import 'widget_test.dart' show FakeAudio;

LearningSession complete({
  LearningTask task = LearningTask.direction,
  String? input,
  bool review = false,
  bool teaching = false,
  bool skip = false,
  DateTime? date,
}) {
  final s = LearningSession(
    task: task,
    input: input ?? (task == LearningTask.direction ? 'listening' : 'voice'),
    review: review,
    random: Random(5),
  );
  s.teachingRequested = teaching;
  while (!s.finished) {
    if (skip) {
      s.skip();
    } else {
      s.current.anchorRequested = true;
      s.answer(
        task == LearningTask.direction ? s.current.prompt.direction : 'matched',
      );
    }
    s.next(date ?? DateTime.utc(2026, 11, 16));
  }
  return s;
}

class FailingHistoryAudio extends FakeAudio {
  bool fail = false;
  @override
  Future<void> writeProgress(String key, String value) async {
    if (fail) throw StateError('Disk full');
    await super.writeProgress(key, value);
  }
}

void main() {
  test(
    'exact direction and neighbour pools include both directions; pattern order remains paired',
    () {
      expect(
        learningPrompts(
          LearningTask.direction,
          Random(1),
        ).map((p) => p.key).toSet(),
        directionPool.map((p) => p.key).toSet(),
      );
      expect(learningPrompts(LearningTask.neighbour, Random(1)).length, 4);
      final p = learningPrompts(LearningTask.pattern, Random(2));
      expect(p.length, 8);
      for (var i = 0; i < 8; i += 2) {
        expect(p[i].target, p[i + 1].anchor);
        expect(p[i].pattern, p[i + 1].pattern);
        expect(p[i].step, 1);
        expect(p[i + 1].step, 2);
      }
    },
  );
  test(
    'correction keeps first choice and duplicate resolution does not add an attempt',
    () {
      final s = LearningSession(
        task: LearningTask.direction,
        input: 'listening',
        random: Random(3),
      );
      final correct = s.current.prompt.direction;
      final wrong = correct == 'Up' ? 'Down' : 'Up';
      expect(s.answer(wrong), false);
      expect(s.answer(correct), true);
      expect(s.current.firstResponse, wrong);
      expect(s.answer(correct), false);
      s.next(DateTime.utc(2026));
      expect(s.attempts.length, 1);
      s.next(DateTime.utc(2026));
      expect(s.attempts.length, 1);
      expect(() => s.toJson(), throwsStateError);
    },
  );
  test('record parsing validates outcome, input, pool and version', () {
    final s = complete();
    final data = s.toJson();
    expect(LearningRecord.parse(data).firstCorrect, 7);
    for (final change in <String, dynamic>{
      'version': 2,
      'input': 'voice',
      'voiceOffset': 12,
      'completedAt': -1,
    }.entries) {
      expect(
        () => LearningRecord.parse({...data, change.key: change.value}),
        throwsFormatException,
      );
    }
    final malformed = jsonDecode(jsonEncode(data)) as Map<String, dynamic>;
    malformed['attempts'][0]['anchor'] = 65;
    expect(() => LearningRecord.parse(malformed), throwsFormatException);
    expect(LearningRecord.parse({...data, 'completedAt': null}).date, isNull);
  });
  test(
    'assistance and teaching remain separate from permitted starting references',
    () {
      final s = LearningSession(task: LearningTask.neighbour, input: 'voice');
      s.teachingRequested = true;
      while (!s.finished) {
        s.current.anchorRequested = true;
        if (s.attempts.isEmpty) s.current.targetRequested = true;
        s.answer('matched');
        s.next(DateTime.utc(2026));
      }
      final record = LearningRecord.parse(s.toJson());
      expect(record.helped, 1);
      expect(record.firstCorrect, 3);
      expect(record.context, contains('Teaching sounds'));
      expect(record.matched, 4);
    },
  );
  test(
    'history retries upsert, preserve old keys and serialize concurrent saves',
    () async {
      final audio = FailingHistoryAudio();
      audio.saved['learning.v1.read.cde.latest'] = 'old';
      final repo = LearningHistory(audio);
      final s = complete();
      audio.fail = true;
      await expectLater(repo.save(s), throwsStateError);
      audio.fail = false;
      await Future.wait([
        repo.save(s),
        repo.save(s),
        repo.save(complete(task: LearningTask.neighbour)),
      ]);
      final records = await repo.load();
      expect(records.length, 2);
      expect(records.first.id, s.id);
      expect(audio.saved['learning.v1.read.cde.latest'], 'old');
    },
  );
  test(
    'bounded history evicts insertion order and rejects corrupt data without overwriting it',
    () async {
      final audio = FakeAudio();
      final repo = LearningHistory(audio);
      final first = complete();
      await repo.save(first);
      for (var i = 0; i < 60; i++) {
        await repo.save(complete(date: DateTime.utc(2020)));
      }
      final records = await repo.load();
      expect(records.length, 60);
      expect(records.any((r) => r.id == first.id), false);
      for (final raw in [
        'bad',
        '{"schema":2,"sessions":[]}',
        '{"schema":1,"sessions":[{}]}',
      ]) {
        audio.saved[LearningHistory.key] = raw;
        await expectLater(repo.save(complete()), throwsFormatException);
        expect(audio.saved[LearningHistory.key], raw);
      }
    },
  );
  test(
    'review invitations handle future clocks, unknown dates and one-day minimum spacing',
    () {
      final now = DateTime.utc(2026, 11, 16);
      final original = LearningRecord.parse(complete(date: now).toJson());
      expect(
        reviewInvitation(
          [original],
          original,
          now.subtract(const Duration(days: 1)),
        ),
        contains('cannot establish'),
      );
      expect(
        reviewInvitation(
          [original],
          original,
          now.add(const Duration(hours: 23)),
        ),
        contains('Suggested'),
      );
      expect(
        reviewInvitation(
          [original],
          original,
          now.add(const Duration(days: 1)),
        ),
        contains('Try a return check'),
      );
      final unknown = LearningRecord.parse({
        ...original.data,
        'completedAt': null,
      });
      expect(
        reviewInvitation([unknown], unknown, now),
        contains('cannot establish'),
      );
      final review1 = LearningRecord.parse(
        complete(date: now, review: true).toJson(),
      );
      final review2 = LearningRecord.parse(
        complete(
          date: now.add(const Duration(hours: 2)),
          review: true,
        ).toJson(),
      );
      expect(
        reviewInvitation(
          [review1, review2],
          review2,
          now.add(const Duration(days: 4)),
        ),
        contains('3 elapsed days'),
      );
      final review3 = LearningRecord.parse(
        complete(date: now.add(const Duration(days: 3)), review: true).toJson(),
      );
      expect(
        reviewInvitation(
          [review1, review2, review3],
          review3,
          now.add(const Duration(days: 11)),
        ),
        contains('7 elapsed days'),
      );
      final skipped = LearningRecord.parse(
        complete(date: now, review: true, skip: true).toJson(),
      );
      expect(
        reviewInvitation([skipped], skipped, now),
        contains('after 1 elapsed days'),
      );
    },
  );
  test(
    'comparisons reject unlike skill, input, register and support conditions',
    () {
      final a = LearningRecord.parse(
        complete(task: LearningTask.neighbour).toJson(),
      );
      expect(a.comparable(LearningRecord.parse(complete().toJson())), false);
      expect(
        a.comparable(
          LearningRecord.parse(
            complete(
              task: LearningTask.neighbour,
              input: 'instrument',
            ).toJson(),
          ),
        ),
        false,
      );
      expect(
        a.comparable(LearningRecord.parse({...a.data, 'voiceOffset': 12})),
        false,
      );
      expect(
        a.comparable(
          LearningRecord.parse({...a.data, 'teachingRequested': true}),
        ),
        false,
      );
      expect(
        a.comparable(
          LearningRecord.parse({...a.data, 'supportedPractice': true}),
        ),
        false,
      );
      expect(
        () => LearningRecord.parse({...a.data, 'supportedPractice': 'yes'}),
        throwsFormatException,
      );
    },
  );
}
