import 'dart:async';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:clefhanger/learning_page.dart';
import 'package:clefhanger/learning_session.dart';
import 'package:clefhanger/staff.dart';
import 'widget_test.dart' show FakeAudio, SingingCore;

class LearningAudio extends FakeAudio {
  final frequencies = <double>[];
  void Function(double)? onTone;
  Completer<void>? pending;
  bool failSave = false, failPlay = false;
  @override
  Future<void> playTone(double hz) async {
    frequencies.add(hz);
    onTone?.call(hz);
    if (failPlay) throw StateError('No output');
    await pending?.future;
  }

  @override
  Future<void> writeProgress(String key, String value) async {
    if (failSave) throw StateError('Full');
    await super.writeProgress(key, value);
  }
}

Future<void> tap(WidgetTester tester, String text, {double delta = 120}) async {
  await tester.scrollUntilVisible(find.text(text), delta);
  await tester.ensureVisible(find.text(text));
  await tester.pumpAndSettle();
  await tester.tap(find.text(text));
  await tester.pumpAndSettle();
  await tester.runAsync(
    () => Future<void>.delayed(const Duration(milliseconds: 1)),
  );
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('pattern teaching renders each staff position before its tone', (
    tester,
  ) async {
    final audio = LearningAudio();
    final core = SingingCore();
    final shown = <int>[];
    audio.onTone = (hz) {
      final midi = tester
          .widget<PracticeStaff>(find.byType(PracticeStaff))
          .note!
          .midi;
      shown.add(midi);
      expect(hz, core.frequency(midi));
    };
    await tester.pumpWidget(
      MaterialApp(
        home: LearningPage(
          core: core,
          audio: audio,
          task: LearningTask.pattern,
          input: 'instrument',
        ),
      ),
    );
    await tap(tester, 'Hear C → D → E');
    expect(shown, [60, 62, 64]);
    shown.clear();
    await tap(tester, 'Hear the downward example');
    expect(shown, [64, 62, 60]);
    await tester.pumpWidget(const SizedBox());
  });
  testWidgets(
    'direction check has no target staff, records hints/skips, retries without duplicate saves',
    (tester) async {
      await tester.binding.setSurfaceSize(const Size(360, 640));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      final audio = LearningAudio()..failSave = true;
      await tester.pumpWidget(
        MaterialApp(
          home: LearningPage(
            core: SingingCore(),
            audio: audio,
            task: LearningTask.direction,
            input: 'listening',
          ),
        ),
      );
      await tap(tester, 'Begin check');
      expect(find.byType(PracticeStaff), findsNothing);
      await tap(tester, 'Hear the pair');
      expect(audio.frequencies.length, 2);
      await tap(tester, 'Show direction hint');
      final hint = tester
          .widgetList<Text>(find.byType(Text))
          .map((t) => t.data ?? '')
          .firstWhere((t) => t.startsWith('The answer is'));
      final answer = hint.contains('repeat')
          ? 'Repeat'
          : hint.contains('up')
          ? 'Up'
          : 'Down';
      await tap(tester, answer, delta: -100);
      await tap(tester, 'Next learning prompt');
      for (var i = 0; i < 6; i++) {
        await tap(tester, 'Skip learning prompt');
      }
      expect(find.textContaining('Check not saved.'), findsOneWidget);
      audio.failSave = false;
      await tap(tester, 'Retry saving check');
      final records = await LearningHistory(audio).load();
      expect(records.length, 1);
      expect(records.single.skipped, 6);
      expect(records.single.helped, 1);
      expect(records.single.firstCorrect, 0);
      expect(audio.stops, 0);
      await tester.pumpWidget(const SizedBox());
    },
  );
  testWidgets(
    'direction interruption cannot unlock answering or queue the second note',
    (tester) async {
      final audio = LearningAudio()..pending = Completer<void>();
      await tester.pumpWidget(
        MaterialApp(
          home: LearningPage(
            core: SingingCore(),
            audio: audio,
            task: LearningTask.direction,
            input: 'listening',
          ),
        ),
      );
      await tap(tester, 'Begin check');
      await tap(tester, 'Hear the pair');
      await tap(tester, 'Stop playback and capture');
      audio.pending!.complete();
      await tester.pumpAndSettle();
      expect(audio.frequencies.length, 1);
      expect(
        tester
            .widget<FilledButton>(find.widgetWithText(FilledButton, 'Up'))
            .onPressed,
        isNull,
      );
      expect(audio.playbackStops, 1);
      await tester.pumpWidget(const SizedBox());
    },
  );
  testWidgets(
    'anchor playback does not reveal target and a held match waits for explicit next',
    (tester) async {
      final audio = LearningAudio();
      final core = SingingCore();
      var now = 0;
      await tester.pumpWidget(
        MaterialApp(
          home: LearningPage(
            core: core,
            audio: audio,
            task: LearningTask.neighbour,
            input: 'instrument',
            nowMs: () => now,
          ),
        ),
      );
      await tap(tester, 'Begin check');
      final target = tester
          .widget<PracticeStaff>(find.byType(PracticeStaff))
          .note!
          .midi;
      await tap(tester, 'Hear starting note');
      expect(audio.frequencies.single, isNot(core.frequency(target)));
      now += 2000;
      await tester.pump(const Duration(milliseconds: 1100));
      await tap(tester, 'Enable microphone');
      core.heardHz = core.frequency(target);
      for (var i = 0; i <= 10; i++) {
        now += 100;
        audio.controller.add(Uint8List(8192));
        await tester.pump();
      }
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(find.text('Next learning prompt'), 100);
      expect(find.textContaining('Found '), findsOneWidget);
      await tap(tester, 'Next learning prompt');
      for (var i = 0; i < 3; i++) {
        await tap(tester, 'Skip learning prompt');
      }
      await tester.scrollUntilVisible(
        find.text('Check saved on this device.'),
        100,
      );
      expect(find.text('Check saved on this device.'), findsOneWidget);
      final record = (await LearningHistory(audio).load()).single;
      expect(record.matched, 1);
      expect(record.helped, 0);
      expect(record.attempts.first['anchorRequested'], true);
      await tester.pumpWidget(const SizedBox());
    },
  );
  testWidgets(
    'failed target request remains assistance even after anchor retry',
    (tester) async {
      final audio = LearningAudio()..failPlay = true;
      final core = SingingCore();
      var now = 0;
      await tester.pumpWidget(
        MaterialApp(
          home: LearningPage(
            core: core,
            audio: audio,
            task: LearningTask.neighbour,
            input: 'voice',
            nowMs: () => now,
          ),
        ),
      );
      await tap(tester, 'Begin check');
      final target = tester
          .widget<PracticeStaff>(find.byType(PracticeStaff))
          .note!
          .midi;
      await tap(tester, 'Hear target');
      audio.failPlay = false;
      await tap(tester, 'Hear starting note', delta: -100);
      now += 2000;
      await tester.pump(const Duration(milliseconds: 1100));
      await tap(tester, 'Enable microphone');
      core.heardHz = core.frequency(target);
      for (var i = 0; i <= 10; i++) {
        now += 100;
        audio.controller.add(Uint8List(8192));
        await tester.pump();
      }
      await tester.pumpAndSettle();
      await tap(tester, 'Next learning prompt');
      for (var i = 0; i < 3; i++) {
        await tap(tester, 'Skip learning prompt');
      }
      await tester.scrollUntilVisible(
        find.text('Check saved on this device.'),
        100,
      );
      expect(find.text('Check saved on this device.'), findsOneWidget);
      final record = (await LearningHistory(audio).load()).single;
      expect(record.helped, 1);
      expect(record.firstCorrect, 0);
      await tester.pumpWidget(const SizedBox());
    },
  );
  testWidgets(
    'large-text supported pattern practice is not saved as a check; return entry skips teaching',
    (tester) async {
      await tester.binding.setSurfaceSize(const Size(360, 640));
      tester.platformDispatcher.textScaleFactorTestValue = 1.5;
      addTearDown(() {
        tester.binding.setSurfaceSize(null);
        tester.platformDispatcher.clearTextScaleFactorTestValue();
      });
      final audio = LearningAudio();
      await tester.pumpWidget(
        MaterialApp(
          home: LearningPage(
            core: SingingCore(),
            audio: audio,
            task: LearningTask.pattern,
            input: 'instrument',
            review: true,
          ),
        ),
      );
      await tap(tester, 'Try with support');
      await tap(tester, 'Skip learning prompt');
      await tap(tester, 'Skip learning prompt');
      expect(find.text('Supported practice complete'), findsOneWidget);
      expect(audio.saved, isEmpty);
      await tap(tester, 'Begin check');
      for (var i = 0; i < 8; i++) {
        await tap(tester, 'Skip learning prompt');
      }
      await tester.scrollUntilVisible(
        find.text('Check saved on this device.'),
        100,
      );
      expect(find.text('Check saved on this device.'), findsOneWidget);
      final record = (await LearningHistory(audio).load()).single;
      expect(record.review, true);
      expect(record.data['supportedPractice'], true);
      expect(record.data['teachingRequested'], false);
      expect(record.skipped, 8);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
    },
  );
}
