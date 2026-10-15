import 'dart:async';
import 'dart:typed_data';
import 'package:flutter_test/flutter_test.dart';
import 'package:clefhanger/sound_evidence.dart';
import 'package:clefhanger/sound_session.dart';
import 'widget_test.dart' show FakeAudio, SingingCore;

class ControlledAudio extends FakeAudio {
  Completer<void>? permission;
  Completer<void>? playback;
  bool failSave = false;
  bool failPlayback = false;
  @override
  Future<void> start() => permission?.future ?? super.start();
  @override
  Future<void> playTone(double hz) async {
    if (failPlayback) throw StateError('No output');
    await super.playTone(hz);
    await playback?.future;
  }

  @override
  Future<void> writeProgress(String key, String value) async {
    if (failSave) throw StateError('Storage failed');
    await super.writeProgress(key, value);
  }
}

void main() {
  testWidgets(
    'interrupted reference cannot become an unassisted performance match',
    (tester) async {
      final core = SingingCore();
      final audio = ControlledAudio()..playback = Completer<void>();
      var now = 0;
      final sound = SoundSession(
        core: core,
        audio: audio,
        skill: SoundSkill.perform,
        input: SoundInput.voice,
        nowMs: () => now,
      );
      final playing = sound.hear();
      unawaited(sound.stop(SoundPhase.paused));
      audio.playback!.complete();
      await playing;
      now = 2000;
      await sound.startMic();
      core.heardHz = core.frequency(sound.practice.prompt!.midi);
      for (var i = 0; i <= 10; i++) {
        now += 100;
        audio.controller.add(Uint8List(8192));
        await tester.pump();
      }
      expect(sound.withReference, 1);
      expect(sound.withoutReference, 0);
      sound.dispose();
      await tester.pump();
    },
  );

  testWidgets(
    'microphone start failure is recoverable without restarting the lesson',
    (tester) async {
      final audio = ControlledAudio()..startError = StateError('Denied');
      final sound = SoundSession(
        core: SingingCore(),
        audio: audio,
        skill: SoundSkill.perform,
        input: SoundInput.voice,
      );
      await tester.runAsync(sound.startMic);
      expect(sound.phase, SoundPhase.error);
      expect(sound.active, false);
      expect(sound.message, contains('Android Settings'));
      audio.startError = null;
      await sound.startMic();
      expect(sound.phase, SoundPhase.listening);
      expect(sound.error, isNull);
      expect(sound.practice.round!.resolved, 0);
      sound.dispose();
      await tester.pump();
    },
  );

  testWidgets(
    'imitation needs playback, suppresses its sound and resets on silence',
    (tester) async {
      final core = SingingCore();
      final audio = ControlledAudio();
      var now = 0;
      final sound = SoundSession(
        core: core,
        audio: audio,
        skill: SoundSkill.imitate,
        input: SoundInput.voice,
        nowMs: () => now,
      );
      await sound.startMic();
      core.heardHz = core.frequency(sound.practice.prompt!.midi);
      for (var i = 0; i < 12; i++) {
        now += 100;
        audio.controller.add(Uint8List(8192));
        await tester.pump();
      }
      expect(sound.practice.round!.matched, 0);
      expect(sound.needsReference, true);
      await sound.hear();
      now += 1200;
      audio.controller.add(Uint8List(8192));
      await tester.pump();
      expect(sound.phase, SoundPhase.playback);
      expect(sound.practice.round!.matched, 0);
      await tester.pump(const Duration(milliseconds: 1020));
      for (var i = 0; i < 5; i++) {
        now += 100;
        audio.controller.add(Uint8List(8192));
        await tester.pump();
      }
      expect(sound.phase, SoundPhase.holding);
      core.heardHz = 0;
      audio.controller.add(Uint8List(8192));
      await tester.pump();
      expect(sound.phase, SoundPhase.noSignal);
      expect(sound.hold, 0);
      core.heardHz = core.frequency(sound.practice.prompt!.midi);
      for (var i = 0; i <= 10; i++) {
        now += 100;
        audio.controller.add(Uint8List(8192));
        await tester.pump();
      }
      expect(sound.withReference, 1);
      await tester.pump(const Duration(milliseconds: 650));
      expect(sound.needsReference, true);
      sound.dispose();
      await tester.pump();
    },
  );
  testWidgets(
    'six sound matches save only fixed skill/input evidence; retry preserves outcome',
    (tester) async {
      final core = SingingCore();
      final audio = ControlledAudio()..failSave = true;
      audio.saved['first-steps'] = 'legacy';
      var now = 0;
      final sound = SoundSession(
        core: core,
        audio: audio,
        skill: SoundSkill.perform,
        input: SoundInput.instrument,
        nowMs: () => now,
      );
      await sound.startMic();
      for (var note = 0; note < 6; note++) {
        core.heardHz = core.frequency(sound.practice.prompt!.midi);
        for (var i = 0; i <= 10; i++) {
          now += 100;
          audio.controller.add(Uint8List(8192));
          await tester.pump();
        }
        await tester.pump(const Duration(milliseconds: 650));
        now += 650;
      }
      expect(sound.phase, SoundPhase.finished);
      expect(sound.active, false);
      expect(audio.stops, greaterThan(0));
      expect(sound.storageError, isNotNull);
      expect(sound.withoutReference, 6);
      audio.failSave = false;
      await sound.save();
      final key = SoundEvidence.key(SoundSkill.perform, SoundInput.instrument);
      final restored = SoundEvidence.decode(
        audio.saved[key],
        SoundSkill.perform,
        SoundInput.instrument,
      )!;
      expect(restored.withoutReference, 6);
      expect(
        SoundEvidence.decode(
          audio.saved[key],
          SoundSkill.perform,
          SoundInput.voice,
        ),
        isNull,
      );
      expect(
        SoundEvidence.decode(
          'legacy',
          SoundSkill.perform,
          SoundInput.instrument,
        ),
        isNull,
      );
      expect(audio.saved.keys.toSet(), {'first-steps', key});
      audio.controller.add(Uint8List(8192));
      await tester.pump();
      expect(sound.withoutReference, 6);
      sound.dispose();
      await tester.pump();
    },
  );
  testWidgets(
    'late permission after pause cannot restart capture; missing frames reset hold',
    (tester) async {
      final core = SingingCore();
      final audio = ControlledAudio()..permission = Completer<void>();
      final sound = SoundSession(
        core: core,
        audio: audio,
        skill: SoundSkill.perform,
        input: SoundInput.voice,
      );
      unawaited(sound.startMic());
      expect(sound.phase, SoundPhase.requesting);
      unawaited(sound.stop(SoundPhase.paused));
      audio.permission!.complete();
      await tester.pumpAndSettle();
      expect(sound.active, false);
      expect(sound.phase, SoundPhase.paused);
      expect(audio.stops, greaterThanOrEqualTo(2));
      audio.permission = null;
      await sound.startMic();
      core.heardHz = core.frequency(sound.practice.prompt!.midi);
      audio.controller.add(Uint8List(8192));
      await tester.pump();
      expect(sound.phase, SoundPhase.holding);
      await tester.pump(const Duration(seconds: 2));
      expect(sound.phase, SoundPhase.noSignal);
      expect(sound.hold, 0);
      sound.dispose();
      await tester.pump();
    },
  );
  testWidgets('failed reference never unlocks imitation scoring', (
    tester,
  ) async {
    final core = SingingCore();
    final audio = ControlledAudio()..failPlayback = true;
    final sound = SoundSession(
      core: core,
      audio: audio,
      skill: SoundSkill.imitate,
      input: SoundInput.voice,
    );
    await sound.hear();
    expect(sound.needsReference, true);
    expect(sound.playing, false);
    expect(sound.error, contains('could not play'));
    sound.dispose();
    await tester.pump();
  });
}
