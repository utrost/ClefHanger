import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:clefhanger/reading_lesson.dart';
import 'package:clefhanger/main.dart';
import 'package:clefhanger/reading_lesson_page.dart';
import 'package:clefhanger/staff.dart';
import 'practice_session_test.dart' show FakeCore;
import 'widget_test.dart' show FakeAudio;

class FailingStorage extends FakeAudio {
  bool fail = true;
  @override
  Future<void> writeProgress(String key, String value) async {
    if (key == ReadingLesson.storageKey && fail) {
      throw StateError('Storage unavailable');
    }
    await super.writeProgress(key, value);
  }
}

void main() {
  testWidgets(
    'guided route stops microphone and returns to existing practice',
    (tester) async {
      final audio = FakeAudio();
      await tester.pumpWidget(
        ClefHangerApp(startInPractice: true, core: FakeCore(), audio: audio),
      );
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(find.text('Check mic'), 100);
      await tester.tap(find.text('Check mic'));
      await tester.pumpAndSettle();
      final stops = audio.stops;
      await tester.scrollUntilVisible(find.text('Guided reading lesson'), 100);
      await tester.pumpAndSettle();
      await tester.runAsync(
        () => tester.tap(find.text('Guided reading lesson')),
      );
      await tester.pumpAndSettle();
      expect(find.text('Recognise C, D and E'), findsOneWidget);
      expect(audio.stops, greaterThan(stops));
      await tester.pageBack();
      await tester.pumpAndSettle();
      expect(find.text('Read music'), findsNothing);
      await tester.scrollUntilVisible(find.text('Check mic'), -100);
      expect(find.text('Check mic'), findsOneWidget);
    },
  );

  testWidgets(
    'compact guided lesson teaches, checks and saves only reading evidence',
    (tester) async {
      await tester.binding.setSurfaceSize(const Size(360, 640));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      final audio = FailingStorage()..saved['first-steps'] = '{"correct":9}';
      await tester.pumpWidget(
        MaterialApp(
          home: ReadingLessonPage(core: FakeCore(), storage: audio),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Learn three notes'));
      await tester.pumpAndSettle();
      for (var i = 0; i < 3; i++) {
        expect(
          tester.widget<PracticeStaff>(find.byType(PracticeStaff)).revealAnswer,
          true,
        );
        await tester.tap(
          find.text(i == 2 ? 'Try without labels' : 'Next position'),
        );
        await tester.pumpAndSettle();
      }
      for (var i = 0; i < 3; i++) {
        final staff = tester.widget<PracticeStaff>(find.byType(PracticeStaff));
        expect(staff.revealAnswer, false);
        await tester.tap(find.text(staff.note!.name));
        await tester.pumpAndSettle();
        final next = find.text(
          i == 2 ? 'See reading result' : 'Next reading note',
        );
        await tester.ensureVisible(next);
        await tester.pumpAndSettle();
        await tester.tap(next);
        await tester.pumpAndSettle();
      }
      expect(find.text('Reading check complete'), findsOneWidget);
      expect(
        find.textContaining('Your result has not been saved'),
        findsOneWidget,
      );
      expect(audio.saved[ReadingLesson.storageKey], isNull);
      audio.fail = false;
      await tester.ensureVisible(find.text('Retry saving'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Retry saving'));
      await tester.pumpAndSettle();
      expect(
        ReadingResult.decode(
          audio.saved[ReadingLesson.storageKey],
        )!.independent,
        3,
      );
      expect(audio.saved['first-steps'], '{"correct":9}');
      expect(audio.plays, 0);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
      await tester.pumpWidget(
        MaterialApp(
          home: ReadingLessonPage(core: FakeCore(), storage: audio),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.textContaining('Last reading check: 3/3'), findsOneWidget);
    },
  );
}
