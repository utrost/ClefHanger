import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:clefhanger/main.dart';
import 'package:clefhanger/native_core.dart';
import 'package:clefhanger/reading_lesson.dart';
import 'practice_session_test.dart' show FakeCore;
import 'widget_test.dart' show FakeAudio;

class OwnedCore extends FakeCore {
  int disposals = 0;
  @override
  void dispose() {
    disposals++;
  }

  @override
  NativeNote lessonNote(int lesson, int index) {
    if (disposals != 0) throw StateError('Core already disposed');
    return super.lessonNote(lesson, index);
  }
}

void main() {
  testWidgets('home remains usable with large text and Rush returns home', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(360, 640));
    tester.platformDispatcher.textScaleFactorTestValue = 1.5;
    addTearDown(() {
      tester.binding.setSurfaceSize(null);
      tester.platformDispatcher.clearTextScaleFactorTestValue();
    });
    await tester.pumpWidget(
      ClefHangerApp(core: FakeCore(), audio: FakeAudio()),
    );
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Optional Rush challenge'), 160);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Optional Rush challenge'));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Back to home'));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Start reading lesson'), -160);
    expect(find.text('Start reading lesson'), findsOneWidget);
  });

  testWidgets(
    'home recommends reading and refreshes its distinct result on return',
    (tester) async {
      await tester.binding.setSurfaceSize(const Size(360, 640));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      final audio = FakeAudio()..saved['first-steps'] = '{"correct":99}';
      await tester.pumpWidget(ClefHangerApp(core: FakeCore(), audio: audio));
      await tester.pumpAndSettle();
      expect(find.text('Start reading lesson'), findsOneWidget);
      expect(find.textContaining('Last reading check:'), findsNothing);
      await tester.tap(find.text('Start reading lesson'));
      await tester.pumpAndSettle();
      expect(find.text('Recognise C, D and E'), findsOneWidget);
      audio.saved[ReadingLesson.storageKey] = const ReadingResult(1, [
        'C',
        'E',
      ]).encode();
      await tester.pageBack();
      await tester.pumpAndSettle();
      expect(
        find.text('Revisit C, E and check the three positions again.'),
        findsOneWidget,
      );
      expect(find.text('Practise reading again'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets('repeated Practice visits preserve core until app disposal', (
    tester,
  ) async {
    final core = OwnedCore();
    final audio = FakeAudio();
    await tester.pumpWidget(ClefHangerApp(core: core, audio: audio));
    await tester.pumpAndSettle();
    for (var visit = 0; visit < 2; visit++) {
      await tester.scrollUntilVisible(
        find.text('Free Practice and settings'),
        150,
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Free Practice and settings'));
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(find.text('Start practice'), 100);
      await tester.tap(find.text('Start practice'));
      await tester.pumpAndSettle();
      await tester.pageBack();
      await tester.pumpAndSettle();
      expect(core.disposals, 0);
    }
    await tester.pumpWidget(const SizedBox());
    expect(core.disposals, 1);
    expect(tester.takeException(), isNull);
  });
  testWidgets(
    'sound skill introductions explain current score limits and allow quiet reading',
    (tester) async {
      await tester.pumpWidget(
        ClefHangerApp(core: FakeCore(), audio: FakeAudio()),
      );
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(find.text('Listen and match'), 100);
      await tester.tap(find.text('Listen and match'));
      await tester.pumpAndSettle();
      expect(
        find.textContaining('not separate reading or singing scores'),
        findsOneWidget,
      );
      await tester.scrollUntilVisible(
        find.text('Read with quiet touch instead'),
        100,
      );
      await tester.tap(find.text('Read with quiet touch instead'));
      await tester.pumpAndSettle();
      expect(find.text('Recognise C, D and E'), findsOneWidget);
      await tester.pageBack();
      await tester.pumpAndSettle();
      expect(find.text('Open free Practice'), findsOneWidget);
    },
  );
}
