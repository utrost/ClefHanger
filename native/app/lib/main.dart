import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;
import 'dart:typed_data' show Endian;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'android_audio.dart';
import 'native_core.dart';
import 'mode_catalog.dart';
import 'lesson_guide.dart';
import 'piano_input.dart';
import 'mic_diagnostic.dart';
import 'practice_session.dart';
import 'progress_transfer.dart';
import 'rush_page.dart';
import 'staff.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  try {
    runApp(
      ClefHangerApp(core: RustPracticeCore.open(), audio: AndroidAudioBridge()),
    );
  } catch (error) {
    runApp(
      MaterialApp(
        home: Scaffold(
          body: Center(child: Text('Native core unavailable: $error')),
        ),
      ),
    );
  }
}

class ClefHangerApp extends StatelessWidget {
  const ClefHangerApp({
    super.key,
    required this.core,
    required this.audio,
    this.rushNowMs,
  });
  final PracticeCore core;
  final AudioBridge audio;
  final int Function()? rushNowMs;
  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'ClefHanger',
    debugShowCheckedModeBanner: false,
    theme: ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: ColorScheme.fromSeed(
        seedColor: const Color(0xFFF6C84A),
        brightness: Brightness.dark,
      ),
      scaffoldBackgroundColor: const Color(0xFF21192A),
      cardTheme: CardThemeData(
        color: const Color(0xFF32283E),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      ),
    ),
    home: PracticePage(core: core, audio: audio, rushNowMs: rushNowMs),
  );
}

class PracticePage extends StatefulWidget {
  const PracticePage({
    super.key,
    required this.core,
    required this.audio,
    this.rushNowMs,
  });
  final PracticeCore core;
  final AudioBridge audio;
  final int Function()? rushNowMs;
  @override
  State<PracticePage> createState() => _PracticePageState();
}

class _PracticePageState extends State<PracticePage>
    with WidgetsBindingObserver {
  late final PracticeSession session;
  StreamSubscription<Uint8List>? _micSubscription;
  Uint8List _window = Uint8List(8192);
  int _receivedSamples = 0;
  bool _micOn = false;
  bool _micStarting = false;
  bool _permissionDenied = false;
  bool _notesInput = false;
  bool _pianoInput = false;
  bool _anyOctave = true;
  bool _hints = true;
  bool _tutorialDismissed = false;
  int _tutorialStep = 0;
  String _micGuide = 'Tap Check mic, then sing or hum one steady note.';
  String? _storageError;
  int? _detectedMidi;
  double _inputLevel = 0;
  double _lastFrequency = 0;
  bool _recordingTest = false;
  MicDiagnosticCapture? _recordCapture;
  MicCaptureSummary? _lastRecording;
  String _recordMessage = 'No recording test yet.';
  final Stopwatch _clock = Stopwatch()..start();

  @override
  void initState() {
    super.initState();
    session = PracticeSession(
      widget.core,
      seed: DateTime.now().millisecondsSinceEpoch & 0xffffffff,
    );
    WidgetsBinding.instance.addObserver(this);
    _loadProgress();
    _loadPreferences();
  }

  Future<void> _loadPreferences() async {
    try {
      final stored = await widget.audio.readProgress('preferences');
      if (stored == null || !mounted) return;
      final value = jsonDecode(stored);
      if (value is! Map) return;
      setState(() {
        final lesson = value['lesson'];
        if (lesson is int && lesson >= 0 && lesson < lessonIds.length) {
          session.selectLesson(lesson);
        }
        for (final mode in NotationMode.values) {
          if (mode.name == value['mode']) session.selectMode(mode);
        }
        _notesInput =
            !session.mode.supportsMic ||
            value['input'] == 'notes' ||
            value['input'] == 'piano';
        _pianoInput = session.mode.supportsMic && value['input'] == 'piano';
        if (value['anyOctave'] is bool) _anyOctave = value['anyOctave'];
        if (value['hints'] is bool) _hints = value['hints'];
        if (value['tutorialDismissed'] is bool) {
          _tutorialDismissed = value['tutorialDismissed'];
        }
      });
    } catch (_) {
      // Corrupt preferences fall back to readable beginner defaults.
    }
  }

  Future<void> _persistPreferences() async {
    try {
      await widget.audio.writeProgress(
        'preferences',
        jsonEncode({
          'lesson': session.lesson,
          'mode': session.mode.name,
          'input': session.mode.supportsMic
              ? !_notesInput
                    ? 'microphone'
                    : _pianoInput
                    ? 'piano'
                    : 'notes'
              : 'notes',
          'anyOctave': _anyOctave,
          'hints': _hints,
          'tutorialDismissed': _tutorialDismissed,
        }),
      );
    } catch (_) {
      if (mounted) {
        setState(
          () => _storageError = 'Settings could not be saved on this device.',
        );
      }
    }
  }

  Future<void> _loadProgress() async {
    for (var lesson = 0; lesson < lessonIds.length; lesson++) {
      try {
        final json = await widget.audio.readProgress(lessonIds[lesson]);
        if (json != null && mounted) {
          setState(
            () => session.progress[lesson] = LessonProgress.fromJson(
              jsonDecode(json),
            ),
          );
        }
      } catch (_) {
        if (mounted) {
          setState(
            () =>
                _storageError = 'Progress could not be loaded on this device.',
          );
        }
      }
    }
    for (final mode in NotationMode.values.skip(1)) {
      try {
        final json = await widget.audio.readProgress('mode.${mode.name}');
        if (json != null && mounted) {
          setState(
            () => session.setProgressFor(
              mode,
              0,
              LessonProgress.fromJson(jsonDecode(json)),
            ),
          );
        }
      } catch (_) {
        if (mounted) {
          setState(
            () =>
                _storageError = 'Progress could not be loaded on this device.',
          );
        }
      }
    }
  }

  Future<void> _persist(NotationMode mode, int lesson) async {
    try {
      await widget.audio.writeProgress(
        mode == NotationMode.treble ? lessonIds[lesson] : 'mode.${mode.name}',
        jsonEncode(session.progressFor(mode, lesson).toJson()),
      );
      if (mounted && _storageError != null) {
        setState(() => _storageError = null);
      }
    } catch (_) {
      if (mounted) {
        setState(
          () => _storageError = 'Progress could not be saved on this device.',
        );
      }
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.hidden ||
        state == AppLifecycleState.detached) {
      _stopMic();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _micSubscription?.cancel();
    widget.audio.stop();
    widget.core.dispose();
    super.dispose();
  }

  Future<void> _startMic() async {
    if (_micOn || _micStarting) return;
    setState(() {
      _micStarting = true;
      _permissionDenied = false;
      _micGuide = 'Waiting for microphone permission…';
    });
    _micSubscription ??= widget.audio.samples.listen(
      _onSamples,
      onError: (Object error) {
        _stopMic();
        if (mounted) setState(() => _micGuide = 'Microphone stopped: $error');
      },
    );
    try {
      await widget.audio.start();
      if (mounted) {
        setState(() {
          _micOn = true;
          _micGuide = 'Mic ready. Sing the staff note and hold it steady.';
        });
      }
    } on PlatformException catch (error) {
      if (mounted) {
        setState(() {
          _permissionDenied = error.code == 'mic_denied';
          _micGuide =
              error.message ?? 'Check microphone permission and try again.';
        });
      }
      await _micSubscription?.cancel();
      _micSubscription = null;
    } finally {
      if (mounted) setState(() => _micStarting = false);
    }
  }

  Future<void> _stopMic() async {
    _recordingTest = false;
    _recordCapture = null;
    await _micSubscription?.cancel();
    _micSubscription = null;
    await widget.audio.stop();
    if (mounted) {
      setState(() {
        _micOn = false;
        _micStarting = false;
        _permissionDenied = false;
        _detectedMidi = null;
        _micGuide = 'Mic off. Tap Check mic to try again.';
      });
    }
  }

  void _onSamples(Uint8List packet) {
    if (!_micOn || packet.isEmpty) return;
    if (_recordingTest) {
      _recordCapture?.add(packet);
      return;
    }
    if (packet.length >= _window.length) {
      _window = Uint8List.fromList(
        packet.sublist(packet.length - _window.length),
      );
    } else {
      _window.setRange(
        0,
        _window.length - packet.length,
        _window,
        packet.length,
      );
      _window.setRange(_window.length - packet.length, _window.length, packet);
    }
    final sampleBytes = ByteData.sublistView(packet);
    var energy = 0.0;
    for (var index = 0; index < packet.length ~/ 2; index++) {
      final sample = sampleBytes.getInt16(index * 2, Endian.little) / 32768.0;
      energy += sample * sample;
    }
    _inputLevel = math.sqrt(energy / (packet.length ~/ 2));
    _receivedSamples += packet.length ~/ 2;
    if (_receivedSamples < 4096) return;
    final hz = widget.core.detect(_window, 16000);
    final now = _clock.elapsedMilliseconds;
    final midi = widget.core.nearestMidi(hz);
    _lastFrequency = hz;
    if (!session.canScore(now)) {
      setState(() {
        _detectedMidi = midi < 0 ? null : midi;
        _micGuide = 'Listen… scoring waits until the sound finishes.';
      });
      return;
    }
    if (session.prompt == null) {
      setState(() {
        _detectedMidi = midi < 0 ? null : midi;
        _micGuide = midi < 0
            ? 'Mic ready. Start practice, then sing one steady note.'
            : 'Mic ready. I hear ${const ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'][midi % 12]}${midi ~/ 12 - 1}. Start practice to answer.';
      });
      return;
    }
    if (hz <= 0 || midi < 0) {
      setState(() {
        _detectedMidi = null;
        _micGuide = 'Listening… hold one steady note near the phone.';
      });
      return;
    }
    final prompt = session.prompt;
    final result = session.hearFrequency(hz, now, anyOctave: _anyOctave);
    if (result != AnswerResult.ignored) _persist(session.mode, session.lesson);
    final status = prompt == null
        ? 0
        : widget.core.classify(hz, prompt.midi, anyOctave: _anyOctave);
    final noteName = const [
      'C',
      'C♯',
      'D',
      'D♯',
      'E',
      'F',
      'F♯',
      'G',
      'G♯',
      'A',
      'A♯',
      'B',
    ][midi % 12];
    setState(() {
      _detectedMidi = midi;
      _micGuide = result == AnswerResult.correct
          ? 'Matched ${prompt!.name}! Choose the next note.'
          : status == 4
          ? 'Hold $noteName steady…'
          : status == 3
          ? 'I hear $noteName${midi ~/ 12 - 1}. Try the written octave, or turn Match any octave on.'
          : 'I hear $noteName${midi ~/ 12 - 1}. Aim for ${prompt?.name ?? 'the staff note'}.';
    });
  }

  void _answer(String name) {
    final lesson = session.lesson;
    final mode = session.mode;
    final result = session.answer(name, showCorrection: _hints);
    if (result == AnswerResult.ignored) return;
    setState(() {});
    _persist(mode, lesson);
  }

  Future<void> _hear() async {
    final now = _clock.elapsedMilliseconds;
    setState(() => session.hear(now));
    try {
      final prompt = session.prompt!;
      if (prompt.isChord) {
        await widget.audio.playChord([
          for (final midi in prompt.chordMidis) widget.core.frequency(midi),
        ]);
      } else {
        await widget.audio.playTone(widget.core.frequency(prompt.midi));
      }
    } catch (_) {
      if (mounted) {
        setState(
          () => session.feedback =
              'Reference tone could not play. You can still sing or use note buttons.',
        );
      }
    }
  }

  Future<void> _copyMicReport() async {
    final midi = _detectedMidi;
    final report = buildMicDiagnostic(
      capturedAt: DateTime.now(),
      listening: _micOn,
      guidance: _micGuide,
      inputLevel: _inputLevel,
      frequency: _lastFrequency,
      midi: midi,
      cents: midi == null || _lastFrequency <= 0
          ? null
          : widget.core.cents(_lastFrequency, midi),
      matchAnyOctave: _anyOctave,
      lessonId: session.mode == NotationMode.treble
          ? lessonIds[session.lesson]
          : 'mode.${session.mode.name}',
      recording: _lastRecording,
    );
    await Clipboard.setData(ClipboardData(text: report));
    if (mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Mic report copied.')));
    }
  }

  Future<void> _recordMicTest() async {
    if (_recordingTest) return;
    if (!_micOn) await _startMic();
    if (!mounted || !_micOn) return;
    setState(() {
      _recordingTest = true;
      _recordCapture = MicDiagnosticCapture();
      _recordMessage = 'Recording for one second… sing a steady note.';
    });
    await Future<void>.delayed(const Duration(seconds: 1));
    if (!mounted || !_recordingTest) return;
    final summary = _recordCapture!.finish(widget.core);
    setState(() {
      _recordingTest = false;
      _recordCapture = null;
      _lastRecording = summary;
      _recordMessage = summary.bytes == 0
          ? 'No microphone samples arrived. Check permission and retry.'
          : summary.frequency <= 0
          ? 'Captured ${summary.bytes} bytes · level ${(summary.rms * 100).toStringAsFixed(1)}%. No steady pitch found.'
          : 'Captured ${summary.bytes} bytes · level ${(summary.rms * 100).toStringAsFixed(1)}% · ${summary.frequency.toStringAsFixed(1)} Hz.';
    });
  }

  Future<void> _openSettings() async {
    try {
      await widget.audio.openSettings();
    } catch (_) {
      if (mounted) {
        setState(
          () => _micGuide =
              'Open ClefHanger in Android Settings and allow microphone access.',
        );
      }
    }
  }

  Future<void> _openRush() async {
    await _stopMic();
    if (!mounted) return;
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => RushPage(
          core: widget.core,
          audio: widget.audio,
          lesson: session.lesson,
          mode: session.mode,
          nowMs: widget.rushNowMs,
        ),
      ),
    );
  }

  Future<void> _importBrowserProgress() async {
    try {
      final source = await widget.audio.pickProgressFile();
      if (!mounted || source == null) return;
      final transfer = ProgressTransfer.parse(source);
      if (transfer.progress.isEmpty && transfer.highScores.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('This export has no saved progress yet.'),
          ),
        );
        return;
      }
      final approved = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Import browser progress?'),
          content: Text(
            '${transfer.progress.length} lesson/mode records and ${transfer.highScores.length} Rush scores found. Records with more attempts and higher scores replace local values. Your other settings stay here.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Import'),
            ),
          ],
        ),
      );
      if (approved != true || !mounted) return;
      var changed = 0;
      for (final entry in transfer.progress.entries) {
        final mode = entry.key.startsWith('mode.')
            ? NotationMode.values.firstWhere(
                (value) => value.name == entry.key.substring(5),
              )
            : NotationMode.treble;
        final lesson = mode == NotationMode.treble
            ? lessonIds.indexOf(entry.key)
            : 0;
        final current = session.progressFor(mode, lesson);
        if (entry.value.attempts <= current.attempts) continue;
        await widget.audio.writeProgress(
          entry.key,
          jsonEncode(entry.value.toJson()),
        );
        session.setProgressFor(mode, lesson, entry.value);
        changed++;
      }
      for (final entry in transfer.highScores.entries) {
        final current =
            int.tryParse(await widget.audio.readProgress(entry.key) ?? '0') ??
            0;
        if (entry.value <= current) continue;
        await widget.audio.writeProgress(entry.key, '${entry.value}');
        changed++;
      }
      if (!mounted) return;
      setState(() {});
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Imported $changed newer progress records.')),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Progress import failed: $error')));
    }
  }

  Future<void> _selectMode(NotationMode mode) async {
    if (mode == session.mode) return;
    await _stopMic();
    if (!mounted) return;
    setState(() {
      session.selectMode(mode);
      _notesInput = !mode.supportsMic;
      _pianoInput = false;
      _detectedMidi = null;
    });
    _persistPreferences();
  }

  @override
  Widget build(BuildContext context) {
    final progress = session.currentProgress;
    final prompt = session.prompt;
    final largeText = MediaQuery.textScalerOf(context).scale(16) > 21;
    final answers = session.mode == NotationMode.treble
        ? <String>{
            for (var i = 0; i < widget.core.lessonLength(session.lesson); i++)
              widget.core.lessonNote(session.lesson, i).name,
          }.map((name) => ModeAnswer(name, name)).toList()
        : modeAnswers(session.mode);
    const amber = Color(0xFFF6C84A);
    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: EdgeInsets.fromLTRB(12, largeText ? 4 : 10, 12, 28),
          children: [
            Text(
              'ClefHanger',
              style: TextStyle(
                fontSize: largeText ? 27 : 30,
                fontWeight: FontWeight.w800,
                color: const Color(0xFFF9E8C0),
              ),
            ),
            Text(
              largeText
                  ? 'Read. Hear. Sing or play.'
                  : 'Read a note. Hear it. Make it yours.',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(color: Color(0xFFCBBBD8)),
            ),
            SizedBox(height: largeText ? 4 : 14),
            Card(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(12, 9, 12, 9),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Expanded(
                          child: Text(
                            'YOUR PRACTICE',
                            style: TextStyle(
                              fontSize: 11,
                              letterSpacing: 1.4,
                              color: amber,
                            ),
                          ),
                        ),
                        DropdownButtonHideUnderline(
                          child: DropdownButton<NotationMode>(
                            value: session.mode,
                            isDense: true,
                            items: [
                              for (final mode in NotationMode.values)
                                DropdownMenuItem(
                                  value: mode,
                                  child: Text(mode.label),
                                ),
                            ],
                            onChanged: (mode) {
                              if (mode != null) _selectMode(mode);
                            },
                          ),
                        ),
                      ],
                    ),
                    if (session.mode == NotationMode.treble)
                      Row(
                        children: [
                          const Text(
                            'Tiny lesson  ',
                            style: TextStyle(fontSize: 13),
                          ),
                          Expanded(
                            child: DropdownButtonHideUnderline(
                              child: DropdownButton<int>(
                                value: session.lesson,
                                isExpanded: true,
                                isDense: true,
                                items: [
                                  for (var i = 0; i < lessonIds.length; i++)
                                    DropdownMenuItem(
                                      value: i,
                                      child: Text(lessonLabels[i]),
                                    ),
                                ],
                                onChanged: (value) {
                                  if (value == null) return;
                                  setState(() {
                                    session.selectLesson(value);
                                    _detectedMidi = null;
                                  });
                                  _persistPreferences();
                                },
                              ),
                            ),
                          ),
                        ],
                      )
                    else
                      const SizedBox(height: 4),
                    Text(
                      progress.attempts == 0
                          ? largeText
                                ? 'Progress saved here'
                                : 'Progress saved here · listening help welcome'
                          : 'Recent: ${progress.recentCorrect}/${progress.recent.length} on your own · ${progress.assisted} with help',
                      style: const TextStyle(fontSize: 12),
                    ),
                    if (session.mode == NotationMode.treble &&
                        progress.ready &&
                        session.lesson < lessonIds.length - 1)
                      TextButton(
                        onPressed: () {
                          setState(
                            () => session.selectLesson(session.lesson + 1),
                          );
                          _persistPreferences();
                        },
                        child: Text(
                          'Try next lesson: ${lessonLabels[session.lesson + 1]}',
                        ),
                      ),
                    if (_storageError != null)
                      Text(
                        _storageError!,
                        style: const TextStyle(color: Colors.orangeAccent),
                      ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 8),
            PracticeStaff(
              note: prompt,
              emptyClef: session.mode == NotationMode.bass ? 'bass' : 'treble',
              revealAnswer: _hints && session.correctionVisible,
              detectedMidi: _detectedMidi,
              height: largeText
                  ? 150
                  : MediaQuery.sizeOf(context).height < 750
                  ? 185
                  : 238,
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: FilledButton(
                    onPressed: () => setState(() {
                      if (!session.started) {
                        session.start();
                      } else if (session.completed) {
                        session.next();
                      } else {
                        session.skip();
                      }
                      _detectedMidi = null;
                    }),
                    child: Text(
                      !session.started
                          ? 'Start practice'
                          : session.completed
                          ? 'Next practice note'
                          : 'Skip note',
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton(
                    onPressed: _hear,
                    child: const Text('Hear this note'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            if (_notesInput) ...[
              if (_pianoInput && session.mode.supportsMic)
                PianoInput(mode: session.mode, onAnswer: _answer)
              else
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final answer in answers)
                      SizedBox(
                        width: answers.length <= 3
                            ? (MediaQuery.sizeOf(context).width - 48) / 3
                            : null,
                        child: FilledButton.tonal(
                          onPressed: prompt == null || session.completed
                              ? null
                              : () => _answer(answer.answer),
                          child: Text(answer.label),
                        ),
                      ),
                  ],
                ),
              if (session.mode.supportsMic)
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    TextButton(
                      onPressed: () {
                        setState(() => _pianoInput = !_pianoInput);
                        _persistPreferences();
                      },
                      child: Text(_pianoInput ? 'Note buttons' : 'Piano'),
                    ),
                    TextButton(
                      onPressed: () {
                        setState(() => _notesInput = false);
                        _persistPreferences();
                      },
                      child: const Text('Back to Sing/Play'),
                    ),
                  ],
                ),
            ] else
              Card(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(10, 7, 10, 7),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Semantics(
                        liveRegion: false,
                        child: Text(
                          _micGuide,
                          key: const Key('micGuidance'),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 13),
                        ),
                      ),
                      Row(
                        children: [
                          Expanded(
                            child: FilledButton(
                              onPressed: _micStarting
                                  ? null
                                  : _micOn
                                  ? _stopMic
                                  : _startMic,
                              child: Text(
                                _micStarting
                                    ? 'Waiting…'
                                    : _micOn
                                    ? 'Stop mic'
                                    : 'Check mic',
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: OutlinedButton(
                              onPressed: () {
                                _stopMic();
                                setState(() {
                                  _notesInput = true;
                                  _pianoInput = false;
                                });
                                _persistPreferences();
                              },
                              child: const Text('Use note buttons'),
                            ),
                          ),
                        ],
                      ),
                      if (_permissionDenied)
                        TextButton.icon(
                          onPressed: _openSettings,
                          icon: const Icon(Icons.settings),
                          label: const Text('Open Android settings'),
                        ),
                    ],
                  ),
                ),
              ),
            Semantics(
              liveRegion: true,
              child: Padding(
                padding: const EdgeInsets.all(8),
                child: Text(
                  session.feedback,
                  key: const Key('practiceFeedback'),
                  textAlign: TextAlign.center,
                ),
              ),
            ),
            if (!_tutorialDismissed)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Start with a lesson',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 6),
                      Text(
                        _tutorialStep == 1 &&
                                session.mode != NotationMode.treble
                            ? modeIntroduction(session.mode)
                            : const [
                                'Sing or hum the note you see. Notes climb upward through A B C D E F G, then repeat.',
                                'On the treble staff, the clef curls around the G line. Nearby notes step up or down from there.',
                                'Practice has no timer. Hear the note if you need help, then sing, hum, or play it back steadily.',
                              ][_tutorialStep],
                      ),
                      Row(
                        children: [
                          TextButton(
                            onPressed: () => setState(
                              () => _tutorialStep = (_tutorialStep + 1) % 3,
                            ),
                            child: const Text('Next tip'),
                          ),
                          TextButton(
                            onPressed: () {
                              setState(() => _tutorialDismissed = true);
                              _persistPreferences();
                            },
                            child: const Text('Got it'),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            Card(
              child: ExpansionTile(
                title: const Text('Learn these notes'),
                subtitle: const Text('A quick reference when you want help'),
                onExpansionChanged: (open) {
                  if (open && session.started) setState(session.revealGuide);
                },
                children: [
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Text(
                      session.mode == NotationMode.treble
                          ? lessonIntroductions[session.lesson]
                          : modeIntroduction(session.mode),
                    ),
                  ),
                  LessonGuide(
                    core: widget.core,
                    mode: session.mode,
                    lesson: session.lesson,
                  ),
                ],
              ),
            ),
            Card(
              child: ExpansionTile(
                title: const Text('Mic Lab'),
                subtitle: const Text('Live input evidence for phone testing'),
                children: [
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        'Level: ${(_inputLevel * 100).toStringAsFixed(1)}% · Pitch: ${_lastFrequency > 0 ? '${_lastFrequency.toStringAsFixed(1)} Hz' : 'none'}',
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Text(_recordMessage),
                  ),
                  TextButton.icon(
                    onPressed: _recordingTest ? null : _recordMicTest,
                    icon: const Icon(Icons.mic),
                    label: Text(
                      _recordingTest
                          ? 'Recording…'
                          : 'Record 1-second mic test',
                    ),
                  ),
                  TextButton.icon(
                    onPressed: _copyMicReport,
                    icon: const Icon(Icons.copy),
                    label: const Text('Copy mic report'),
                  ),
                ],
              ),
            ),
            Card(
              child: ExpansionTile(
                title: const Text('Settings'),
                children: [
                  SwitchListTile(
                    title: const Text('Match any octave'),
                    subtitle: const Text('A low or high C counts as C'),
                    value: _anyOctave,
                    onChanged: (value) {
                      setState(() => _anyOctave = value);
                      _persistPreferences();
                    },
                  ),
                  SwitchListTile(
                    title: const Text('Show corrections'),
                    value: _hints,
                    onChanged: (value) {
                      setState(() => _hints = value);
                      _persistPreferences();
                    },
                  ),
                  ListTile(
                    leading: const Icon(Icons.file_open),
                    title: const Text('Import browser progress'),
                    subtitle: const Text('Choose a ClefHanger JSON export'),
                    onTap: _importBrowserProgress,
                  ),
                  const Padding(
                    padding: EdgeInsets.all(12),
                    child: Text(
                      'Native Android Practice prototype · Rust pitch and lesson core',
                    ),
                  ),
                ],
              ),
            ),
            if (session.started)
              TextButton.icon(
                onPressed: () async {
                  await _stopMic();
                  if (!mounted) return;
                  setState(session.start);
                },
                icon: const Icon(Icons.restart_alt),
                label: const Text('Restart practice'),
              ),
            Card(
              child: ListTile(
                title: const Text('Try a 60-second Rush'),
                subtitle: Text(
                  'A timed challenge on ${session.mode == NotationMode.treble ? lessonLabels[session.lesson] : session.mode.label}',
                ),
                trailing: const Icon(Icons.arrow_forward),
                onTap: _openRush,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
