import 'dart:math';
import 'package:flutter_test/flutter_test.dart';
import 'package:clefhanger/reading_lesson.dart';

void main() {
  test(
    'reading checks count first answers and distinguish hints from learning',
    () {
      final lesson = ReadingLesson(random: Random(4));
      for (var i = 0; i < 3; i++) {
        expect(lesson.noteIndex, i);
        lesson.next();
      }
      lesson.next();
      expect(lesson.step, 3);
      lesson.answer(lesson.name);
      lesson.answer(lesson.name);
      lesson.next();
      lesson.answer(ReadingLesson.names.firstWhere((n) => n != lesson.name));
      lesson.answer(lesson.name);
      lesson.next();
      lesson.reveal();
      lesson.answer(lesson.name);
      lesson.next();
      expect(lesson.finished, true);
      expect(lesson.independent, 1);
      expect(lesson.review.length, 2);
      expect(ReadingResult.decode(lesson.result.encode())!.independent, 1);
      lesson.next();
      expect(lesson.step, 6);
    },
  );
  test(
    'legacy, corrupt and future records are not reinterpreted as recognition',
    () {
      for (final raw in [
        null,
        '{',
        '{"correct":10}',
        '{"schema":2}',
        '{"schema":1,"skill":"read","lesson":"cde","total":3,"independent":4,"review":[]}',
      ]) {
        expect(ReadingResult.decode(raw), isNull);
      }
    },
  );
}
