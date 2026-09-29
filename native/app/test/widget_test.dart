import 'dart:async';
import 'dart:typed_data';
import 'package:clefhanger/android_audio.dart';
import 'package:clefhanger/main.dart';
import 'package:clefhanger/mode_catalog.dart';
import 'package:clefhanger/staff.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/material.dart' show Size, SizedBox, SwitchListTile;
import 'package:flutter/services.dart'
    show LogicalKeyboardKey, PlatformException;
import 'practice_session_test.dart' show FakeCore;

class FakeAudio implements AudioBridge {
  final controller = StreamController<Uint8List>.broadcast();
  final saved = <String, String>{};
  int plays = 0;
  int chordPlays = 0;
  int settingsOpens = 0;
  Object? startError;
  @override
  Stream<Uint8List> get samples => controller.stream;
  @override
  Future<void> start() async {
    if (startError != null) throw startError!;
  }

  @override
  Future<void> stop() async {}
  @override
  Future<void> playTone(double frequency) async {
    plays++;
  }

  @override
  Future<void> playChord(List<double> frequencies) async {
    chordPlays++;
  }

  @override
  Future<void> openSettings() async {
    settingsOpens++;
  }

  @override
  Future<String?> readProgress(String lessonId) async => saved[lessonId];
  @override
  Future<void> writeProgress(String lessonId, String value) async {
    saved[lessonId] = value;
  }
}

void main() {
  testWidgets('chord mode stays touch-only, plays a chord and saves progress', (
    tester,
  ) async {
    final audio = FakeAudio();
    await tester.pumpWidget(ClefHangerApp(core: FakeCore(), audio: audio));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Treble').first);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Chords').last);
    await tester.pumpAndSettle();
    expect(find.text('Check mic'), findsNothing);
    expect(find.text('C'), findsOneWidget);
    await tester.tap(find.text('Hear this note'));
    await tester.pumpAndSettle();
    expect(audio.chordPlays, 1);
    final prompt = tester
        .widget<PracticeStaff>(find.byType(PracticeStaff))
        .note!;
    final answer = modeAnswers(
      NotationMode.chords,
    ).firstWhere((option) => option.answer == prompt.name);
    await tester.tap(find.text(answer.label));
    await tester.pumpAndSettle();
    expect(audio.saved['mode.chords'], contains('"assisted":1'));
    expect(find.text('Next practice note'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
    await tester.pumpWidget(ClefHangerApp(core: FakeCore(), audio: audio));
    await tester.pumpAndSettle();
    expect(find.text('Chords'), findsOneWidget);
    expect(find.textContaining('with help'), findsOneWidget);
  });

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
      await tester.scrollUntilVisible(find.byType(PracticeStaff), -140);
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

  testWidgets('denied microphone offers a direct Android settings route', (
    tester,
  ) async {
    final audio = FakeAudio()
      ..startError = PlatformException(
        code: 'mic_denied',
        message: 'Microphone permission denied.',
      );
    await tester.pumpWidget(ClefHangerApp(core: FakeCore(), audio: audio));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Check mic'), 160);
    await tester.tap(find.text('Check mic'));
    await tester.pumpAndSettle();
    expect(find.text('Microphone permission denied.'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('Open Android settings'), 160);
    await tester.ensureVisible(find.text('Open Android settings'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Open Android settings'));
    expect(audio.settingsOpens, 1);
  });

  testWidgets('Rush pauses time, ends, and returns to Practice', (
    tester,
  ) async {
    final audio = FakeAudio();
    var nowMs = 0;
    await tester.pumpWidget(
      ClefHangerApp(core: FakeCore(), audio: audio, rushNowMs: () => nowMs),
    );
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Try a 60-second Rush'), 180);
    await tester.tap(find.text('Try a 60-second Rush'));
    await tester.pumpAndSettle();
    expect(find.text('Start 60-second Rush'), findsOneWidget);
    await tester.tap(find.text('Start 60-second Rush'));
    await tester.pump();
    await tester.ensureVisible(find.text('Pause Rush'));
    await tester.pump();
    await tester.tap(find.text('Pause Rush'));
    await tester.pump();
    expect(find.text('Resume Rush'), findsOneWidget);
    await tester.pump(const Duration(seconds: 60));
    expect(find.text('Time 60s'), findsOneWidget);
    await tester.tap(find.text('Resume Rush'));
    await tester.pump();
    nowMs = 60000;
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.text('Time! Sprint complete'), findsOneWidget);
    await tester.sendKeyEvent(LogicalKeyboardKey.escape);
    await tester.pumpAndSettle();
    expect(find.text('Try a 60-second Rush'), findsOneWidget);
    expect(find.text('Back to Practice'), findsNothing);
  });
}
