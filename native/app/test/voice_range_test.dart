import 'dart:async';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:clefhanger/sound_evidence.dart';
import 'package:clefhanger/sound_practice_page.dart';
import 'package:clefhanger/sound_session.dart';
import 'package:clefhanger/voice_range.dart';
import 'package:clefhanger/voice_range_page.dart';
import 'widget_test.dart' show FakeAudio, SingingCore;

class RangeAudio extends FakeAudio {
  final frequencies = <double>[];
  int starts = 0;
  bool failSave = false;
  Completer<void>? playback;
  @override
  Future<void> start() async {
    starts++;
    await super.start();
  }

  @override
  Future<void> playTone(double hz) async {
    frequencies.add(hz);
    await playback?.future;
  }

  @override
  Future<void> writeProgress(String key, String value) async {
    if (failSave && key == voiceRangeKey) throw StateError('Full storage');
    await super.writeProgress(key, value);
  }
}

void main() {
  test(
    'range preferences and evidence tolerate old data without inventing a range',
    () {
      expect(decodeVoiceRange('broken'), VoiceRange.middle);
      expect(
        decodeVoiceRange('{"schema":2,"range":"lower"}'),
        VoiceRange.middle,
      );
      expect(decodeVoiceRange(VoiceRange.lower.encode()), VoiceRange.lower);
      const old =
          '{"schema":1,"skill":"perform","input":"voice","lesson":"cde","total":6,"withReference":1,"withoutReference":5,"skipped":0}';
      final legacy = SoundEvidence.decode(
        old,
        SoundSkill.perform,
        SoundInput.voice,
      )!;
      expect(legacy.referenceRange, isNull);
      expect(legacy.setupPreviewRequested, false);
      const result = SoundEvidence(
        skill: SoundSkill.perform,
        input: SoundInput.voice,
        withReference: 2,
        withoutReference: 4,
        skipped: 0,
        referenceRange: VoiceRange.lower,
        setupPreviewRequested: true,
      );
      final restored = SoundEvidence.decode(
        result.encode(),
        SoundSkill.perform,
        SoundInput.voice,
      )!;
      expect(restored.referenceRange, VoiceRange.lower);
      expect(restored.setupPreviewRequested, true);
      expect(
        SoundEvidence.decode(
          result.encode().replaceFirst('lower', 'unknown'),
          SoundSkill.perform,
          SoundInput.voice,
        ),
        isNull,
      );
    },
  );

  testWidgets(
    'lower and higher references preserve written C and accept the chosen sung octave',
    (tester) async {
      for (final range in [VoiceRange.lower, VoiceRange.higher]) {
        final core = SingingCore();
        final audio = RangeAudio();
        var now = 0;
        final sound = SoundSession(
          core: core,
          audio: audio,
          skill: SoundSkill.imitate,
          input: SoundInput.voice,
          voiceRange: range,
          setupPreviewRequested: true,
          nowMs: () => now,
        );
        expect(sound.practice.prompt!.midi, 60);
        await sound.hear();
        expect(
          audio.frequencies.single,
          closeTo(core.frequency(60 + range.semitones), 0.001),
        );
        expect(audio.frequencies.single, inInclusiveRange(80, 1000));
        now = 2000;
        await tester.pump(const Duration(milliseconds: 1020));
        await sound.startMic();
        core.heardHz = core.frequency(60 + range.semitones);
        for (var sample = 0; sample <= 10; sample++) {
          now += 100;
          audio.controller.add(Uint8List(8192));
          await tester.pump();
        }
        expect(sound.withReference, 1);
        expect(sound.practice.prompt!.midi, 60);
        expect(sound.evidence.referenceRange, range);
        expect(sound.evidence.setupPreviewRequested, true);
        sound.dispose();
        await tester.pump();
      }
      final core = SingingCore();
      final audio = RangeAudio();
      final instrument = SoundSession(
        core: core,
        audio: audio,
        skill: SoundSkill.perform,
        input: SoundInput.instrument,
        voiceRange: VoiceRange.lower,
      );
      await instrument.hear();
      expect(audio.frequencies.single, core.frequency(60));
      expect(instrument.evidence.referenceRange, isNull);
      instrument.dispose();
      await tester.pump();
    },
  );

  testWidgets(
    'voice setup previews endpoints without mic, saves choice and shows written versus reference octave',
    (tester) async {
      await tester.binding.setSurfaceSize(const Size(360, 640));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      final audio = RangeAudio();
      final core = SingingCore();
      await tester.pumpWidget(
        MaterialApp(
          home: SoundSetupPage(
            core: core,
            audio: audio,
            skill: SoundSkill.perform,
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(find.text('Use my voice'), 100);
      await tester.ensureVisible(find.text('Use my voice'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Use my voice'));
      await tester.pumpAndSettle();
      await tester.tap(find.text(VoiceRange.lower.label));
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(find.text('Preview C and E'), 100);
      await tester.tap(find.text('Preview C and E'));
      await tester.pumpAndSettle();
      expect(audio.frequencies, [core.frequency(48), core.frequency(52)]);
      expect(audio.starts, 0);
      await tester.scrollUntilVisible(find.text('Use this pitch level'), 100);
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Use this pitch level'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Use this pitch level'));
      await tester.pumpAndSettle();
      expect(find.text('Reference C3 · written C4'), findsOneWidget);
      expect(
        tester
            .widget<SoundPracticePage>(find.byType(SoundPracticePage))
            .setupPreviewRequested,
        true,
      );
      expect(decodeVoiceRange(audio.saved[voiceRangeKey]), VoiceRange.lower);
      await tester.pageBack();
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(find.text('Use my voice'), -100);
      await tester.ensureVisible(find.text('Use my voice'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Use my voice'));
      await tester.pumpAndSettle();
      expect(
        tester
            .widget<ChoiceChip>(
              find.widgetWithText(ChoiceChip, VoiceRange.lower.label),
            )
            .selected,
        true,
      );
      expect(audio.starts, 0);
      await tester.pumpWidget(const SizedBox());
    },
  );

  testWidgets(
    'background interrupts endpoint preview and no second tone is queued',
    (tester) async {
      final audio = RangeAudio()..playback = Completer<void>();
      await tester.pumpWidget(
        MaterialApp(
          home: VoiceRangePage(core: SingingCore(), audio: audio),
        ),
      );
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(find.text('Preview C and E'), 100);
      await tester.tap(find.text('Preview C and E'));
      await tester.pump();
      expect(audio.frequencies.length, 1);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
      audio.playback!.complete();
      await tester.pumpAndSettle();
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      expect(audio.frequencies.length, 1);
      expect(
        find.text('Preview interrupted. Try again when ready.'),
        findsOneWidget,
      );
      expect(audio.starts, 0);
      await tester.pumpWidget(const SizedBox());
    },
  );

  testWidgets(
    'unsaved pitch choice can be used once at large text without claiming persistence',
    (tester) async {
      await tester.binding.setSurfaceSize(const Size(360, 640));
      tester.platformDispatcher.textScaleFactorTestValue = 1.5;
      addTearDown(() {
        tester.binding.setSurfaceSize(null);
        tester.platformDispatcher.clearTextScaleFactorTestValue();
      });
      final audio = RangeAudio()..failSave = true;
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
      await tester.scrollUntilVisible(find.text('Use my voice'), 120);
      await tester.ensureVisible(find.text('Use my voice'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Use my voice'));
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(find.text(VoiceRange.higher.label), 100);
      await tester.ensureVisible(find.text(VoiceRange.higher.label));
      await tester.pumpAndSettle();
      await tester.tap(find.text(VoiceRange.higher.label));
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(find.text('Use this pitch level'), 120);
      await tester.ensureVisible(find.text('Use this pitch level'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Use this pitch level'));
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.text('Use once without saving'),
        100,
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Use once without saving'));
      await tester.pumpAndSettle();
      expect(find.text('Reference C5 · written C4'), findsOneWidget);
      expect(audio.saved.containsKey(voiceRangeKey), false);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
    },
  );
}
