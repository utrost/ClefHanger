import 'dart:async';
import 'package:flutter/foundation.dart';
import 'android_audio.dart';
import 'native_core.dart';
import 'pitch_guidance.dart';
import 'practice_session.dart';
import 'sound_evidence.dart';
import 'voice_range.dart';

enum SoundPhase {
  off,
  requesting,
  listening,
  noSignal,
  hearing,
  holding,
  playback,
  matched,
  paused,
  finished,
  error,
}

/// Owns one fixed-input sound session, not the shared Rust core or audio bridge.
class SoundSession extends ChangeNotifier {
  SoundSession({
    required this.core,
    required this.audio,
    required this.skill,
    required this.input,
    this.voiceRange = VoiceRange.middle,
    this.setupPreviewRequested = false,
    int Function()? nowMs,
  }) : _nowOverride = nowMs,
       practice = PracticeSession(core) {
    practice.start();
  }
  final PracticeCore core;
  final AudioBridge audio;
  final SoundSkill skill;
  final SoundInput input;
  final VoiceRange voiceRange;
  final bool setupPreviewRequested;
  int get referenceMidi =>
      practice.prompt!.midi +
      (input == SoundInput.voice ? voiceRange.semitones : 0);
  String get referenceName =>
      '${practice.prompt!.name}${referenceMidi ~/ 12 - 1}';
  final PracticeSession practice;
  final int Function()? _nowOverride;
  final _clock = Stopwatch()..start();
  int get now => _nowOverride?.call() ?? _clock.elapsedMilliseconds;
  SoundPhase phase = SoundPhase.off;
  StreamSubscription<Uint8List>? _subscription;
  Timer? _advance, _silence, _playbackTimer;
  Uint8List _window = Uint8List(8192);
  int _received = 0, _generation = 0;
  bool _disposed = false, active = false, starting = false, playing = false;
  bool saving = false, saved = false;
  String? error, storageError;
  int? detectedMidi;
  PitchGuidance? guidance;
  int withReference = 0, withoutReference = 0;
  bool _heardReference = false;
  bool get finished => practice.roundFinished;
  bool get needsReference => skill == SoundSkill.imitate && !_heardReference;
  double get hold => practice.micMatchProgress(now);
  SoundEvidence get evidence => SoundEvidence(
    skill: skill,
    input: input,
    withReference: withReference,
    withoutReference: withoutReference,
    skipped: practice.round!.skipped,
    referenceRange: input == SoundInput.voice ? voiceRange : null,
    setupPreviewRequested: input == SoundInput.voice && setupPreviewRequested,
  );

  void _notify() {
    if (!_disposed) notifyListeners();
  }

  void _clearPitch() {
    practice.resetMicMatch();
    detectedMidi = null;
    guidance = null;
    _window = Uint8List(8192);
    _received = 0;
  }

  Future<void> startMic() async {
    if (_disposed || active || starting || finished || playing) return;
    final generation = ++_generation;
    starting = true;
    phase = SoundPhase.requesting;
    error = null;
    _clearPitch();
    _notify();
    _subscription = audio.samples.listen(
      _samples,
      onError: (Object error) {
        stop(SoundPhase.error);
        this.error = 'Microphone interrupted. Try enabling it again.';
        _notify();
      },
    );
    try {
      await audio.start();
      if (_disposed || generation != _generation) {
        await audio.stop();
        return;
      }
      active = true;
      phase = SoundPhase.listening;
      _watchSilence();
    } catch (_) {
      if (!_disposed && generation == _generation) {
        await stop(SoundPhase.error);
        error =
            'Microphone unavailable. Check permission in Android Settings, then retry.';
      }
    } finally {
      starting = false;
      _notify();
    }
  }

  Future<void> stop([SoundPhase next = SoundPhase.off]) async {
    ++_generation;
    active = false;
    _advance?.cancel();
    _silence?.cancel();
    _playbackTimer?.cancel();
    playing = false;
    _clearPitch();
    phase = finished ? SoundPhase.finished : next;
    final subscription = _subscription;
    _subscription = null;
    final stopping = audio.stop();
    _notify();
    await subscription?.cancel();
    try {
      await stopping;
    } catch (_) {
      if (!_disposed) {
        error = 'Could not confirm microphone shutdown.';
        _notify();
      }
    }
  }

  void _watchSilence() {
    _silence?.cancel();
    _silence = Timer(const Duration(seconds: 2), () {
      if (!_disposed && active && !playing && !practice.completed) {
        _clearPitch();
        phase = SoundPhase.noSignal;
        _notify();
      }
    });
  }

  Future<void> hear() async {
    if (_disposed || finished || playing || practice.completed || starting) {
      return;
    }
    final generation = _generation;
    final playbackStarted = now;
    playing = true;
    error = null;
    phase = SoundPhase.playback;
    _clearPitch();
    _silence?.cancel();
    practice.hear(now);
    _notify();
    try {
      await audio.playTone(core.frequency(referenceMidi));
      if (_disposed || generation != _generation) return;
      _heardReference = true;
      // Android completes the playback call after the tone. Retain a tail even
      // if a bridge returns immediately; never score app sound or buffered PCM.
      final delay = (1020 - (now - playbackStarted)).clamp(300, 1020);
      _playbackTimer = Timer(Duration(milliseconds: delay), () {
        if (_disposed || generation != _generation) return;
        playing = false;
        _clearPitch();
        phase = active ? SoundPhase.listening : SoundPhase.off;
        if (active) _watchSilence();
        _notify();
      });
    } catch (_) {
      if (_disposed || generation != _generation) return;
      playing = false;
      phase = active ? SoundPhase.listening : SoundPhase.off;
      error = 'Reference sound could not play. Try Hear note again.';
      if (active) _watchSilence();
      _notify();
    }
  }

  void _samples(Uint8List packet) {
    if (_disposed ||
        !active ||
        playing ||
        finished ||
        practice.completed ||
        packet.length < 2 ||
        packet.length.isOdd ||
        !practice.canScore(now)) {
      return;
    }
    _watchSilence();
    if (packet.length >= _window.length) {
      _window.setAll(0, packet.sublist(packet.length - _window.length));
    } else {
      _window.setRange(
        0,
        _window.length - packet.length,
        _window,
        packet.length,
      );
      _window.setRange(_window.length - packet.length, _window.length, packet);
    }
    _received += packet.length ~/ 2;
    if (_received < 4096) return;
    final hz = core.detect(_window, 16000);
    if (!hz.isFinite || hz <= 0 || core.nearestMidi(hz) < 0) {
      practice.resetMicMatch();
      detectedMidi = null;
      guidance = null;
      phase = SoundPhase.noSignal;
      _notify();
      return;
    }
    detectedMidi = core.nearestMidi(hz);
    guidance = PitchGuidance.from(core, hz, practice.prompt, anyOctave: true);
    if (needsReference) {
      phase = SoundPhase.hearing;
      _notify();
      return;
    }
    final result = practice.hearFrequency(hz, now);
    if (result == AnswerResult.correct) {
      if (practice.helped) {
        withReference++;
      } else {
        withoutReference++;
      }
      if (finished) {
        stop(SoundPhase.finished);
        save();
      } else {
        phase = SoundPhase.matched;
        _advance = Timer(const Duration(milliseconds: 650), next);
      }
    } else {
      phase = guidance?.matched == true
          ? SoundPhase.holding
          : SoundPhase.hearing;
    }
    _notify();
  }

  void next() {
    if (_disposed || finished || !practice.completed) return;
    _advance?.cancel();
    practice.next();
    _heardReference = false;
    _clearPitch();
    phase = active ? SoundPhase.listening : SoundPhase.off;
    if (active) _watchSilence();
    _notify();
  }

  void skip() {
    if (_disposed || finished || playing || starting) return;
    if (practice.completed) {
      next();
      return;
    }
    practice.skip();
    _heardReference = false;
    _clearPitch();
    if (finished) {
      stop(SoundPhase.finished);
      save();
    } else {
      phase = active ? SoundPhase.listening : SoundPhase.off;
      _notify();
    }
  }

  Future<void> save() async {
    if (!finished || saving || _disposed) return;
    saving = true;
    saved = false;
    storageError = null;
    _notify();
    try {
      await audio.writeProgress(
        SoundEvidence.key(skill, input),
        evidence.encode(),
      );
      saved = true;
    } catch (_) {
      storageError = 'Sound result not saved. Retry before leaving.';
    } finally {
      saving = false;
      _notify();
    }
  }

  String get message {
    if (error != null) return error!;
    if (phase == SoundPhase.playback) {
      return 'Listen. Scoring waits for playback and its echo to finish.';
    }
    if (phase == SoundPhase.requesting) {
      return 'Waiting for microphone permission…';
    }
    if (phase == SoundPhase.paused) {
      return 'Microphone paused. Enable it when you are ready.';
    }
    if (phase == SoundPhase.finished) return 'Sound session complete.';
    if (phase == SoundPhase.matched) return 'Matched. Next note coming…';
    if (!active) return 'Microphone off. Enable it when you are ready.';
    if (needsReference) return 'Hear this note first, then imitate it.';
    if (phase == SoundPhase.noSignal) {
      return 'No clear pitch detected. Try one steady note near the phone.';
    }
    if (guidance != null) {
      return input == SoundInput.instrument
          ? guidance!.message.replaceFirst('Sing', 'Play')
          : guidance!.message;
    }
    return 'Listening. Sing or play one steady note.';
  }

  @override
  void dispose() {
    _disposed = true;
    stop();
    super.dispose();
  }
}
