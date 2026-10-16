import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:clefhanger/android_audio.dart';
import 'package:clefhanger/sound_demo_page.dart';
import 'package:clefhanger/sound_evidence.dart';
import 'package:clefhanger/sound_practice_page.dart';
import 'package:clefhanger/sound_session.dart';
import 'package:clefhanger/voice_range.dart';
import 'package:clefhanger/voice_range_page.dart';
import 'voice_range_test.dart' show RangeAudio;
import 'widget_test.dart' show FakeAudio, SingingCore;

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  test(
    'bridge sends separate playback cancellation without requesting capture',
    () async {
      final calls = <String>[];
      const channel = MethodChannel('clefhanger/native');
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(channel, (call) async {
            calls.add(call.method);
            return null;
          });
      addTearDown(
        () => TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
            .setMockMethodCallHandler(channel, null),
      );
      await AndroidAudioBridge().stopPlayback();
      expect(calls, ['stopPlayback']);
    },
  );

  testWidgets(
    'closed sample stream leaves listening and does not save a partial session',
    (tester) async {
      final audio = FakeAudio();
      final sound = SoundSession(
        core: SingingCore(),
        audio: audio,
        skill: SoundSkill.perform,
        input: SoundInput.voice,
      );
      await sound.startMic();
      await audio.controller.close();
      await tester.pump();
      expect(sound.phase, SoundPhase.error);
      expect(sound.active, false);
      expect(sound.message, contains('stream ended'));
      expect(audio.playbackStops, 1);
      expect(audio.saved, isEmpty);
      sound.dispose();
      await tester.pump();
    },
  );

  testWidgets(
    'stop preview permits replay and late completion cannot unlock new playback',
    (tester) async {
      final audio = RangeAudio()..playback = Completer<void>();
      await tester.pumpWidget(
        MaterialApp(
          home: VoiceRangePage(core: SingingCore(), audio: audio),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Preview C and E'));
      await tester.pumpAndSettle();
      final old = audio.playback!;
      await tester.ensureVisible(find.text('Stop playback'));
      await tester.tap(find.text('Stop playback'));
      await tester.pumpAndSettle();
      expect(audio.playbackStops, 1);
      audio.playback = Completer<void>();
      await tester.ensureVisible(find.text('Preview C and E'));
      await tester.tap(find.text('Preview C and E'));
      await tester.pumpAndSettle();
      old.complete();
      await tester.pumpAndSettle();
      expect(find.text('Playing C and E…'), findsOneWidget);
      expect(audio.frequencies.length, 2);
      audio.playback!.complete();
      await tester.pumpAndSettle();
      expect(audio.frequencies.length, 3);
      expect(audio.starts, 0);
      await tester.pumpWidget(const SizedBox());
    },
  );

  testWidgets(
    'back during demonstration cancels audio and queues no further notes',
    (tester) async {
      final audio = RangeAudio()..playback = Completer<void>();
      await tester.pumpWidget(
        MaterialApp(
          home: Builder(
            builder: (context) => Scaffold(
              body: TextButton(
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => SoundDemoPage(
                      core: SingingCore(),
                      audio: audio,
                      skill: SoundSkill.imitate,
                      input: SoundInput.voice,
                      range: VoiceRange.middle,
                    ),
                  ),
                ),
                child: const Text('Open'),
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.text('Open'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Hear C → D → E'));
      await tester.pumpAndSettle();
      await tester.pageBack();
      await tester.pumpAndSettle();
      expect(find.text('Open'), findsOneWidget);
      expect(audio.playbackStops, 1);
      audio.playback!.complete();
      await tester.pumpAndSettle();
      expect(audio.frequencies.length, 1);
      expect(audio.starts, 0);
    },
  );

  testWidgets(
    'permission recovery status is a live semantic region and retry preserves lesson',
    (tester) async {
      final audio = FakeAudio()..startError = StateError('Denied');
      await tester.pumpWidget(
        MaterialApp(
          home: SoundPracticePage(
            core: SingingCore(),
            audio: audio,
            skill: SoundSkill.perform,
            input: SoundInput.instrument,
          ),
        ),
      );
      await tester.runAsync(() => tester.tap(find.text('Enable microphone')));
      await tester.pumpAndSettle();
      final status = find.byKey(const Key('soundStatus'));
      final semantics = tester.widget<Semantics>(
        find.ancestor(of: status, matching: find.byType(Semantics)).first,
      );
      expect(semantics.properties.liveRegion, true);
      expect(find.textContaining('Microphone unavailable.'), findsOneWidget);
      audio.startError = null;
      await tester.runAsync(() => tester.tap(find.text('Enable microphone')));
      await tester.pumpAndSettle();
      expect(find.text('Stop microphone'), findsOneWidget);
      expect(find.text('Note 1/6'), findsOneWidget);
      await tester.pumpWidget(const SizedBox());
    },
  );
}
