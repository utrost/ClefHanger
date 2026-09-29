import 'dart:async';
import 'dart:typed_data';
import 'package:clefhanger/android_audio.dart';
import 'package:clefhanger/main.dart';
import 'package:clefhanger/staff.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/material.dart' show Size, SizedBox, SwitchListTile;
import 'practice_session_test.dart' show FakeCore;

class FakeAudio implements AudioBridge {
  final controller = StreamController<Uint8List>.broadcast();
  final saved = <String, String>{};
  int plays = 0;
  @override
  Stream<Uint8List> get samples => controller.stream;
  @override
  Future<void> start() async {}
  @override
  Future<void> stop() async {}
  @override
  Future<void> playTone(double frequency) async {
    plays++;
  }

  @override
  Future<String?> readProgress(String lessonId) async => saved[lessonId];
  @override
  Future<void> writeProgress(String lessonId, String value) async {
    saved[lessonId] = value;
  }
}

void main() {
  testWidgets(
    'first session has a readable staff, listening action and microphone fallback',
    (tester) async {
      final audio = FakeAudio();
      await tester.pumpWidget(ClefHangerApp(core: FakeCore(), audio: audio));
      await tester.pumpAndSettle();
      expect(find.text('First steps'), findsOneWidget);
      expect(find.text('Start practice'), findsOneWidget);
      expect(find.text('Hear this note'), findsOneWidget);
      await tester.scrollUntilVisible(find.text('Check mic'), 180);
      expect(find.text('Check mic'), findsOneWidget);
      await tester.tap(find.text('Hear this note'));
      await tester.pump();
      expect(audio.plays, 1);
      expect(find.text('Skip note'), findsOneWidget);
      await tester.scrollUntilVisible(find.text('Use note buttons'), 140);
      await tester.tap(find.text('Use note buttons'));
      await tester.pumpAndSettle();
      expect(find.text('C'), findsOneWidget);
      expect(find.text('D'), findsOneWidget);
      expect(find.text('E'), findsOneWidget);
    },
  );

  testWidgets(
    'short portrait keeps Practice and microphone actions in the first viewport',
    (tester) async {
      await tester.binding.setSurfaceSize(const Size(360, 640));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      await tester.pumpWidget(
        ClefHangerApp(core: FakeCore(), audio: FakeAudio()),
      );
      await tester.pumpAndSettle();
      for (final label in [
        'Start practice',
        'Hear this note',
        'Check mic',
        'Use note buttons',
      ]) {
        final finder = find.text(label);
        expect(
          finder,
          findsOneWidget,
          reason: '$label is present without scrolling',
        );
        final rect = tester.getRect(finder);
        expect(
          rect.bottom,
          lessThanOrEqualTo(640),
          reason: '$label is visible in a short portrait viewport',
        );
      }
    },
  );

  testWidgets(
    'a correct touch answer advances only on Next and writes assisted progress',
    (tester) async {
      final audio = FakeAudio();
      await tester.pumpWidget(ClefHangerApp(core: FakeCore(), audio: audio));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Hear this note'));
      await tester.pump();
      await tester.scrollUntilVisible(find.text('Use note buttons'), 140);
      await tester.tap(find.text('Use note buttons'));
      await tester.pumpAndSettle();
      // The fake seed is time based, so read the displayed prompt through the staff widget.
      final staff =
          tester.widgetList(find.byType(PracticeStaff)).first as PracticeStaff;
      final answer = staff.note!.name;
      await tester.tap(find.text(answer));
      await tester.pumpAndSettle();
      expect(find.text('Next practice note'), findsOneWidget);
      expect(audio.saved['first-steps'], contains('"assisted":1'));
    },
  );

  testWidgets('lesson and correction preference survive app restart', (
    tester,
  ) async {
    final audio = FakeAudio();
    await tester.pumpWidget(ClefHangerApp(core: FakeCore(), audio: audio));
    await tester.pumpAndSettle();
    await tester.tap(find.text('First steps'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Line notes').last);
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Settings'), 160);
    await tester.tap(find.text('Settings'));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Show corrections'), 160);
    await tester.ensureVisible(find.text('Show corrections'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Show corrections'));
    await tester.pumpAndSettle();
    expect(audio.saved['preferences'], contains('"lesson":1'));
    expect(audio.saved['preferences'], contains('"hints":false'));

    await tester.pumpWidget(const SizedBox());
    await tester.pumpWidget(ClefHangerApp(core: FakeCore(), audio: audio));
    await tester.pumpAndSettle();
    expect(find.text('Line notes'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('Settings'), 160);
    await tester.tap(find.text('Settings'));
    await tester.pumpAndSettle();
    final correction = find.ancestor(
      of: find.text('Show corrections'),
      matching: find.byType(SwitchListTile),
    );
    expect(tester.widget<SwitchListTile>(correction).value, isFalse);
  });
}
