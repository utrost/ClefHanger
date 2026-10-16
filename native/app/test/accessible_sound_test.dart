import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:clefhanger/native_core.dart';
import 'package:clefhanger/staff.dart';
import 'package:clefhanger/sound_evidence.dart';
import 'package:clefhanger/sound_session.dart';
import 'package:clefhanger/sound_practice_page.dart';
import 'widget_test.dart' show FakeAudio, SingingCore;

void main() {
  testWidgets(
    'notation semantics distinguish outer spaces and ledger lines without revealing answers',
    (tester) async {
      final handle = tester.ensureSemantics();

      for (final entry in {
        -1: 'the space just below the staff',
        9: 'the space just above the staff',
        -4: 'ledger line 2 below the staff',
        12: 'ledger line 2 above the staff',
        -3: 'space 2 below the staff',
        11: 'space 2 above the staff',
      }.entries) {
        await tester.pumpWidget(
          MaterialApp(
            home: PracticeStaff(
              note: NativeNote(id: 0, midi: 60, staffStep: entry.key),
              instruction: 'Name this note.',
            ),
          ),
        );
        expect(
          find.bySemanticsLabel(
            'Treble staff note at ${entry.value}. Name this note.',
          ),
          findsOneWidget,
        );
      }
      await tester.pumpWidget(
        const MaterialApp(
          home: PracticeStaff(
            note: NativeNote(
              id: 0,
              midi: 60,
              staffStep: -2,
              chordStaffSteps: [-2, 0, 2],
              chordMidis: [60, 64, 67],
            ),
          ),
        ),
      );
      expect(
        find.bySemanticsLabel(
          RegExp('.*ledger line below.*line 1.*line 2.*Name the chord.*'),
        ),
        findsOneWidget,
      );
      handle.dispose();
    },
  );

  testWidgets(
    'manual matches stop capture and wait without duplicating outcomes',
    (tester) async {
      final audio = FakeAudio();
      final core = SingingCore();
      var now = 0;
      final sound = SoundSession(
        core: core,
        audio: audio,
        skill: SoundSkill.perform,
        input: SoundInput.voice,
        automaticAdvance: false,
        nowMs: () => now,
      );
      await sound.startMic();
      core.heardHz = core.frequency(sound.practice.prompt!.midi);
      for (var i = 0; i <= 10; i++) {
        now += 100;
        audio.controller.add(Uint8List(8192));
        await tester.pump();
      }
      await tester.pump(const Duration(seconds: 2));
      expect(sound.practice.completed, true);
      expect(sound.withoutReference, 1);
      expect(sound.active, false);
      expect(sound.message, contains('Choose Next sound note'));
      sound.setAutomaticAdvance(true);
      expect(sound.message, contains('Choose Next sound note'));
      await sound.startMic();
      expect(sound.active, false);
      sound.next();
      expect(sound.practice.completed, false);
      expect(sound.active, false);
      await sound.startMic();
      expect(sound.active, true);
      expect(sound.withoutReference, 1);
      sound.dispose();
      await tester.pump();
    },
  );

  testWidgets('enabling manual pacing cancels an already queued advance', (
    tester,
  ) async {
    final audio = FakeAudio();
    final core = SingingCore();
    var now = 0;
    final sound = SoundSession(
      core: core,
      audio: audio,
      skill: SoundSkill.perform,
      input: SoundInput.instrument,
      nowMs: () => now,
    );
    await sound.startMic();
    core.heardHz = core.frequency(sound.practice.prompt!.midi);
    for (var i = 0; i <= 10; i++) {
      now += 100;
      audio.controller.add(Uint8List(8192));
      await tester.pump();
    }
    sound.setAutomaticAdvance(false);
    await tester.pump(const Duration(seconds: 2));
    expect(sound.practice.completed, true);
    expect(sound.active, false);
    sound.dispose();
    await tester.pump();
  });

  testWidgets(
    'screen-reader mode has reachable controls and suppresses automatic capture announcements',
    (tester) async {
      await tester.binding.setSurfaceSize(const Size(360, 640));
      tester.platformDispatcher.accessibilityFeaturesTestValue =
          const FakeAccessibilityFeatures(accessibleNavigation: true);
      tester.platformDispatcher.textScaleFactorTestValue = 1.5;
      addTearDown(() {
        tester.binding.setSurfaceSize(null);
        tester.platformDispatcher.clearAccessibilityFeaturesTestValue();
        tester.platformDispatcher.clearTextScaleFactorTestValue();
      });
      await tester.pumpWidget(
        MaterialApp(
          home: SoundPracticePage(
            core: SingingCore(),
            audio: FakeAudio(),
            skill: SoundSkill.perform,
            input: SoundInput.voice,
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.textContaining('Screen-reader pacing:'),
        100,
      );
      expect(find.textContaining('Screen-reader pacing:'), findsOneWidget);
      await tester.scrollUntilVisible(find.text('Enable microphone'), 100);
      await tester.ensureVisible(find.text('Enable microphone'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Enable microphone'));
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.byKey(const Key('soundStatus')),
        -100,
      );
      final semantics = tester.widget<Semantics>(
        find
            .ancestor(
              of: find.byKey(const Key('soundStatus')),
              matching: find.byType(Semantics),
            )
            .first,
      );
      expect(semantics.properties.liveRegion, false);
      await tester.scrollUntilVisible(find.byType(PracticeStaff), -100);
      final staff = tester.widget<PracticeStaff>(find.byType(PracticeStaff));
      expect(staff.describeDetectedPitch, false);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
    },
  );
}
