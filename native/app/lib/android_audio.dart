import 'dart:async';

import 'package:flutter/services.dart';

abstract class AudioBridge {
  Stream<Uint8List> get samples;
  Future<void> start();
  Future<void> stop();
  Future<void> playTone(double frequency);
  Future<void> playChord(List<double> frequencies);
  Future<void> openSettings();
  Future<String?> pickProgressFile();
  Future<String?> readProgress(String lessonId);
  Future<void> writeProgress(String lessonId, String value);
}

class AndroidAudioBridge implements AudioBridge {
  static const _methods = MethodChannel('clefhanger/native');
  static const _input = EventChannel('clefhanger/audio_samples');
  @override
  Stream<Uint8List> get samples =>
      _input.receiveBroadcastStream().map((value) => value as Uint8List);
  @override
  Future<void> start() => _methods.invokeMethod<void>('startMic');
  @override
  Future<void> stop() => _methods.invokeMethod<void>('stopMic');
  @override
  Future<void> playTone(double frequency) =>
      _methods.invokeMethod<void>('playTone', {'frequency': frequency});
  @override
  Future<void> playChord(List<double> frequencies) =>
      _methods.invokeMethod<void>('playChord', {'frequencies': frequencies});
  @override
  Future<void> openSettings() => _methods.invokeMethod<void>('openSettings');
  @override
  Future<String?> pickProgressFile() =>
      _methods.invokeMethod<String>('pickProgressFile');
  @override
  Future<String?> readProgress(String lessonId) =>
      _methods.invokeMethod<String>('readProgress', {'key': lessonId});
  @override
  Future<void> writeProgress(String lessonId, String value) => _methods
      .invokeMethod<void>('writeProgress', {'key': lessonId, 'value': value});
}
