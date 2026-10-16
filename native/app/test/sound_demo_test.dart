import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:clefhanger/sound_demo_page.dart';
import 'package:clefhanger/sound_evidence.dart';
import 'package:clefhanger/sound_practice_page.dart';
import 'package:clefhanger/staff.dart';
import 'package:clefhanger/voice_range.dart';
import 'voice_range_test.dart' show RangeAudio;
import 'widget_test.dart' show SingingCore;

class DemoAudio extends RangeAudio {
  bool fail = false;
  @override
  Future<void> playTone(double hz) async {
    if (fail) throw StateError('No output');
    await super.playTone(hz);
  }
}

Future<void> tapVisible(WidgetTester tester, String label) async {
  await tester.scrollUntilVisible(find.text(label), 100);
  await tester.ensureVisible(find.text(label));
  await tester.pumpAndSettle();
  await tester.tap(find.text(label));
  await tester.pumpAndSettle();
}

void main() {
  test(
    'old records remain readable and malformed demonstration flags are rejected',
    () {
      final data =
          jsonDecode(
                const SoundEvidence(
                  skill: SoundSkill.perform,
                  input: SoundInput.instrument,
                  withReference: 0,
                  withoutReference: 6,
                  skipped: 0,
                ).encode(),
              )
              as Map<String, dynamic>;
      data.remove('demonstrationRequested');
      expect(
        SoundEvidence.decode(
          jsonEncode(data),
          SoundSkill.perform,
          SoundInput.instrument,
        )!.demonstrationRequested,
        false,
      );
      data['demonstrationRequested'] = 'true';
      expect(
        SoundEvidence.decode(
          jsonEncode(data),
          SoundSkill.perform,
          SoundInput.instrument,
        ),
        isNull,
      );
    },
  );

  testWidgets(
    'demo synchronizes staff steps with transposed tones and background stops the sequence',
    (tester) async {
      final audio = DemoAudio()..playback = Completer<void>();
      final core = SingingCore();
      await tester.pumpWidget(
        MaterialApp(
          home: SoundDemoPage(
            core: core,
            audio: audio,
            skill: SoundSkill.imitate,
            input: SoundInput.voice,
            range: VoiceRange.lower,
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tapVisible(tester, 'Hear C → D → E');
      expect(audio.frequencies, [core.frequency(48)]);
      expect(
        tester
            .widget<PracticeStaff>(find.byType(PracticeStaff))
            .note!
            .staffStep,
        -2,
      );
      final first = audio.playback!;
      audio.playback = Completer<void>();
      first.complete();
      await tester.pumpAndSettle();
      expect(audio.frequencies, [core.frequency(48), core.frequency(50)]);
      expect(
        tester
            .widget<PracticeStaff>(find.byType(PracticeStaff))
            .note!
            .staffStep,
        -1,
      );
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
      audio.playback!.complete();
      await tester.pumpAndSettle();
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.text('Demonstration interrupted. Replay when ready.'),
        80,
      );
      expect(audio.frequencies.length, 2);
      expect(
        find.text('Demonstration interrupted. Replay when ready.'),
        findsOneWidget,
      );
      audio.playback = null;
      await tapVisible(tester, 'Hear C → D → E');
      expect(
        audio.frequencies.sublist(2),
        [48, 50, 52].map(core.frequency).toList(),
      );
      expect(
        tester
            .widget<PracticeStaff>(find.byType(PracticeStaff))
            .note!
            .staffStep,
        0,
      );
      expect(audio.starts, 0);
      expect(audio.saved, isEmpty);
      await tester.pumpWidget(const SizedBox());
    },
  );

  testWidgets(
    'failed demo can continue at large text and its assistance survives results and reload',
    (tester) async {
      await tester.binding.setSurfaceSize(const Size(360, 640));
      tester.platformDispatcher.textScaleFactorTestValue = 1.5;
      addTearDown(() {
        tester.binding.setSurfaceSize(null);
        tester.platformDispatcher.clearTextScaleFactorTestValue();
      });
      final audio = DemoAudio()..fail = true;
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
      await tapVisible(tester, 'Use an instrument');
      await tester.scrollUntilVisible(
        find.textContaining('absolute pitch'),
        100,
      );
      expect(find.textContaining('absolute pitch'), findsOneWidget);
      await tester.scrollUntilVisible(find.text('Hear C → D → E'), -100);
      await tapVisible(tester, 'Hear C → D → E');
      expect(
        find.textContaining('Demonstration could not play.'),
        findsOneWidget,
      );
      await tapVisible(tester, 'Start sound practice');
      expect(
        tester
            .widget<SoundPracticePage>(find.byType(SoundPracticePage))
            .demonstrationRequested,
        true,
      );
      for (var i = 0; i < 6; i++) {
        await tapVisible(tester, 'Skip sound note');
      }
      expect(
        find.text(
          'A C → D → E demonstration was requested before this session.',
        ),
        findsOneWidget,
      );
      final key = SoundEvidence.key(SoundSkill.perform, SoundInput.instrument);
      final saved = SoundEvidence.decode(
        audio.saved[key],
        SoundSkill.perform,
        SoundInput.instrument,
      )!;
      expect(saved.demonstrationRequested, true);
      expect(saved.skipped, 6);
      await tapVisible(tester, 'Choose another session');
      expect(
        find.textContaining(
          'A C → D → E demonstration was requested before the session.',
        ),
        findsOneWidget,
      );
      expect(audio.starts, 0);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
    },
  );
}
