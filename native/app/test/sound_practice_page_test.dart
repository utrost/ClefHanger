import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:clefhanger/sound_evidence.dart';
import 'package:clefhanger/sound_practice_page.dart';
import 'widget_test.dart' show FakeAudio, SingingCore;

class CountingAudio extends FakeAudio {
  int starts = 0;
  @override
  Future<void> start() async {
    starts++;
    await super.start();
  }
}

void main() {
  testWidgets(
    'compact sound session chooses instrument, starts mic explicitly, saves skips separately',
    (tester) async {
      await tester.binding.setSurfaceSize(const Size(360, 640));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      final audio = CountingAudio();
      await tester.pumpWidget(
        MaterialApp(
          home: SoundSetupPage(
            core: SingingCore(),
            audio: audio,
            skill: SoundSkill.perform,
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(find.text('Use an instrument'), 100);
      await tester.tap(find.text('Use an instrument'));
      await tester.pumpAndSettle();
      expect(find.text('Instrument · same note in any octave'), findsOneWidget);
      final semantics = tester.ensureSemantics();
      expect(
        find.bySemanticsLabel(RegExp('.*Play one note.*')),
        findsOneWidget,
      );
      semantics.dispose();
      expect(audio.starts, 0);
      await tester.scrollUntilVisible(find.text('Enable microphone'), 100);
      await tester.tap(find.text('Enable microphone'));
      await tester.pumpAndSettle();
      expect(audio.starts, 1);
      for (var i = 0; i < 6; i++) {
        await tester.scrollUntilVisible(find.text('Skip sound note'), 80);
        await tester.pumpAndSettle();
        await tester.tap(find.text('Skip sound note'));
        await tester.pumpAndSettle();
      }
      expect(find.text('Sound session complete'), findsOneWidget);
      expect(find.text('0/6 matched · 6 skipped'), findsOneWidget);
      expect(audio.stops, greaterThan(0));
      final key = SoundEvidence.key(SoundSkill.perform, SoundInput.instrument);
      expect(audio.saved.keys, [key]);
      expect(
        SoundEvidence.decode(
          audio.saved[key],
          SoundSkill.perform,
          SoundInput.instrument,
        )!.skipped,
        6,
      );
      expect(tester.takeException(), isNull);
      await tester.scrollUntilVisible(find.text('Choose another session'), 100);
      await tester.tap(find.text('Choose another session'));
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.textContaining('Last instrument session:'),
        100,
      );
      expect(
        find.textContaining('Last instrument session: 0/6 matched'),
        findsOneWidget,
      );
      expect(find.textContaining('Last voice session:'), findsNothing);
      await tester.pumpWidget(const SizedBox());
    },
  );
  testWidgets(
    'quiet reading stops mic and does not write a partial sound result',
    (tester) async {
      final audio = CountingAudio();
      await tester.pumpWidget(
        MaterialApp(
          home: SoundPracticePage(
            core: SingingCore(),
            audio: audio,
            skill: SoundSkill.imitate,
            input: SoundInput.voice,
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(find.text('Enable microphone'), 100);
      await tester.tap(find.text('Enable microphone'));
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.text('Switch to quiet reading'),
        100,
      );
      await tester.pumpAndSettle();
      await tester.runAsync(
        () => tester.tap(find.text('Switch to quiet reading')),
      );
      await tester.pumpAndSettle();
      expect(find.text('Recognise C, D and E'), findsOneWidget);
      expect(audio.stops, greaterThan(0));
      expect(audio.saved, isEmpty);
      await tester.pageBack();
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(find.text('Enable microphone'), -100);
      expect(find.text('Enable microphone'), findsOneWidget);
      await tester.pumpWidget(const SizedBox());
    },
  );
}
