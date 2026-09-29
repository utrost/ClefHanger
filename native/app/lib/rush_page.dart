import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'android_audio.dart';
import 'native_core.dart';
import 'rush_session.dart';
import 'staff.dart';

class RushPage extends StatefulWidget {
  const RushPage({
    super.key,
    required this.core,
    required this.audio,
    required this.lesson,
    this.nowMs,
  });
  final PracticeCore core;
  final AudioBridge audio;
  final int lesson;
  final int Function()? nowMs;

  @override
  State<RushPage> createState() => _RushPageState();
}

class _RushPageState extends State<RushPage> with WidgetsBindingObserver {
  late final RushSession session;
  final _clock = Stopwatch()..start();
  int _now() => widget.nowMs?.call() ?? _clock.elapsedMilliseconds;
  final _replayFocus = FocusNode();
  Timer? _timer;
  StreamSubscription<Uint8List>? _micSubscription;
  Uint8List _window = Uint8List(8192);
  int _receivedSamples = 0;
  int _highScore = 0;
  bool _notesInput = false;
  bool _micOn = false;
  bool _micStarting = false;
  bool _permissionDenied = false;
  bool _resultHandled = false;
  int? _detectedMidi;
  String _micGuide = 'Tap Check mic, then sing or hum one steady note.';

  @override
  void initState() {
    super.initState();
    session = RushSession(
      widget.core,
      lesson: widget.lesson,
      seed: DateTime.now().millisecondsSinceEpoch & 0xffffffff,
    );
    WidgetsBinding.instance.addObserver(this);
    _loadHighScore();
    _loadRushSettings();
  }

  Future<void> _loadRushSettings() async {
    try {
      final stored = await widget.audio.readProgress('rush.settings');
      if (stored == null || !mounted || session.phase != RushPhase.idle) return;
      final value = jsonDecode(stored);
      if (value is! Map) return;
      setState(() {
        final speed = value['speed'];
        if (speed is int && speed >= 1 && speed <= 10) session.speed = speed;
        for (final difficulty in RushDifficulty.values) {
          if (difficulty.name == value['difficulty']) {
            session.difficulty = difficulty;
          }
        }
      });
      _loadHighScore();
    } catch (_) {
      // Invalid saved settings leave the beginner defaults usable.
    }
  }

  Future<void> _saveRushSettings() async {
    try {
      await widget.audio.writeProgress(
        'rush.settings',
        jsonEncode({
          'speed': session.speed,
          'difficulty': session.difficulty.name,
        }),
      );
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Rush settings could not be saved.')),
        );
      }
    }
  }

  Future<void> _loadHighScore() async {
    final key = session.highScoreKey;
    try {
      final saved = await widget.audio.readProgress(key);
      if (mounted && key == session.highScoreKey) {
        setState(
          () => _highScore = (int.tryParse(saved ?? '') ?? 0).clamp(
            0,
            1000000000,
          ),
        );
      }
    } catch (_) {
      if (mounted) setState(() => _highScore = 0);
    }
  }

  Future<void> _saveHighScore() async {
    if (session.score <= _highScore) return;
    final score = session.score;
    final key = session.highScoreKey;
    setState(() => _highScore = score);
    try {
      await widget.audio.writeProgress(key, '$score');
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Rush high score could not be saved.')),
        );
      }
    }
  }

  void _handleResult() {
    if (session.phase != RushPhase.ended || _resultHandled) return;
    _resultHandled = true;
    _timer?.cancel();
    _stopMic();
    _saveHighScore();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _replayFocus.requestFocus();
    });
  }

  void _tick() {
    if (!mounted || session.phase != RushPhase.running) return;
    setState(() => session.tick(_now()));
    _handleResult();
  }

  void _start() {
    _timer?.cancel();
    setState(() {
      session.start(_now());
      _resultHandled = false;
      _detectedMidi = null;
    });
    _timer = Timer.periodic(const Duration(milliseconds: 100), (_) => _tick());
  }

  void _pause() {
    setState(() => session.pause(_now()));
    _stopMic();
    _handleResult();
  }

  void _resume() {
    setState(() => session.resume(_now()));
  }

  Future<void> _exit() async {
    await _stopMic();
    if (mounted) Navigator.of(context).pop();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.hidden ||
        state == AppLifecycleState.detached) {
      // The permission dialog pauses Android too; preserve its pending request.
      if (!_micStarting) _pause();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _timer?.cancel();
    _micSubscription?.cancel();
    widget.audio.stop();
    _replayFocus.dispose();
    super.dispose();
  }

  Future<void> _startMic() async {
    if (_micOn || _micStarting) return;
    setState(() {
      _micStarting = true;
      _permissionDenied = false;
      _micGuide = 'Waiting for microphone permission…';
    });
    _window = Uint8List(8192);
    _receivedSamples = 0;
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
          _micGuide = 'Mic ready. Sing the front staff note steadily.';
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
    _receivedSamples += packet.length ~/ 2;
    if (_receivedSamples < 4096) return;
    final hz = widget.core.detect(_window, 16000);
    final midi = widget.core.nearestMidi(hz);
    final matched = session.hearFrequency(hz, _now());
    setState(() {
      _detectedMidi = midi < 0 ? null : midi;
      _micGuide = matched
          ? 'Matched. Read the next front note.'
          : midi < 0
          ? 'Listening… hold one steady note near the phone.'
          : 'I hear ${const ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'][midi % 12]}${midi ~/ 12 - 1}. Aim for the front note.';
    });
    _handleResult();
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

  @override
  Widget build(BuildContext context) {
    final now = _now();
    final front = session.front;
    final answers = <String>{
      for (var i = 0; i < widget.core.lessonLength(widget.lesson); i++)
        widget.core.lessonNote(widget.lesson, i).name,
    }.toList();
    return CallbackShortcuts(
      bindings: {const SingleActivator(LogicalKeyboardKey.escape): _exit},
      child: Focus(
        autofocus: true,
        child: Scaffold(
          appBar: AppBar(
            title: const Text('Rush'),
            backgroundColor: Theme.of(context).scaffoldBackgroundColor,
            leading: IconButton(
              tooltip: 'Back to Practice',
              onPressed: _exit,
              icon: const Icon(Icons.arrow_back),
            ),
          ),
          body: SafeArea(
            child: session.phase == RushPhase.ended
                ? _resultView()
                : ListView(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
                    children: [
                      Text(
                        '60-second Rush · ${lessonLabels[widget.lesson]}',
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              'Time ${session.remainingSeconds(now)}s',
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                          ),
                          Text('Score ${session.score} · Best $_highScore'),
                        ],
                      ),
                      if (session.phase == RushPhase.idle) ...[
                        const SizedBox(height: 8),
                        Card(
                          child: Padding(
                            padding: const EdgeInsets.all(12),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Speed ${session.speed}'),
                                Slider(
                                  value: session.speed.toDouble(),
                                  min: 1,
                                  max: 10,
                                  divisions: 9,
                                  label: '${session.speed}',
                                  onChanged: (value) {
                                    setState(
                                      () => session.speed = value.round(),
                                    );
                                  },
                                  onChangeEnd: (_) {
                                    _loadHighScore();
                                    _saveRushSettings();
                                  },
                                ),
                                DropdownButton<RushDifficulty>(
                                  value: session.difficulty,
                                  isExpanded: true,
                                  items: [
                                    for (final level in RushDifficulty.values)
                                      DropdownMenuItem(
                                        value: level,
                                        child: Text(level.label),
                                      ),
                                  ],
                                  onChanged: (value) {
                                    if (value == null) return;
                                    setState(() => session.difficulty = value);
                                    _loadHighScore();
                                    _saveRushSettings();
                                  },
                                ),
                              ],
                            ),
                          ),
                        ),
                        FilledButton(
                          onPressed: _start,
                          child: const Text('Start 60-second Rush'),
                        ),
                      ] else ...[
                        const SizedBox(height: 8),
                        PracticeStaff(
                          note: front?.note,
                          detectedMidi: _detectedMidi,
                          travelProgress: front == null
                              ? null
                              : ((session.phase == RushPhase.paused
                                            ? session.pausedAtMs!
                                            : now) -
                                        front.spawnedAtMs) /
                                    session.travelMs,
                          previewNotes: session.queue
                              .skip(1)
                              .map((prompt) => prompt.note)
                              .toList(),
                          height: MediaQuery.sizeOf(context).height < 750
                              ? 170
                              : 205,
                        ),
                        const SizedBox(height: 8),
                        LinearProgressIndicator(
                          value: front == null
                              ? 0
                              : ((front.deadlineMs -
                                            (session.phase == RushPhase.paused
                                                ? session.pausedAtMs!
                                                : now)) /
                                        session.travelMs)
                                    .clamp(0.0, 1.0),
                          minHeight: 7,
                        ),
                        Text(
                          '${session.queue.length} ${session.queue.length == 1 ? 'note' : 'notes'} in the lane · ${session.correct} correct · ${session.wrong} wrong · ${session.missed} missed',
                        ),
                        const SizedBox(height: 8),
                        if (session.phase == RushPhase.running)
                          OutlinedButton.icon(
                            onPressed: _pause,
                            icon: const Icon(Icons.pause),
                            label: const Text('Pause Rush'),
                          )
                        else
                          FilledButton.icon(
                            onPressed: _resume,
                            icon: const Icon(Icons.play_arrow),
                            label: const Text('Resume Rush'),
                          ),
                        if (session.phase == RushPhase.running) ...[
                          if (_notesInput)
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: [
                                for (final answer in answers)
                                  FilledButton.tonal(
                                    onPressed: () {
                                      setState(
                                        () => session.answer(answer, _now()),
                                      );
                                      _handleResult();
                                    },
                                    child: Text(answer),
                                  ),
                              ],
                            )
                          else
                            Card(
                              child: Padding(
                                padding: const EdgeInsets.all(10),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      _micGuide,
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
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
                                              setState(
                                                () => _notesInput = true,
                                              );
                                            },
                                            child: const Text(
                                              'Use note buttons',
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                    if (_permissionDenied)
                                      TextButton.icon(
                                        onPressed: _openSettings,
                                        icon: const Icon(Icons.settings),
                                        label: const Text(
                                          'Open Android settings',
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                            ),
                          if (_notesInput)
                            TextButton(
                              onPressed: () =>
                                  setState(() => _notesInput = false),
                              child: const Text('Back to Sing/Play'),
                            ),
                        ],
                      ],
                      Semantics(
                        liveRegion: true,
                        child: Padding(
                          padding: const EdgeInsets.all(10),
                          child: Text(
                            session.feedback,
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ),
                    ],
                  ),
          ),
        ),
      ),
    );
  }

  Widget _resultView() => Center(
    child: SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Semantics(
                liveRegion: true,
                child: Text(
                  'Time! Sprint complete',
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
              ),
              const SizedBox(height: 14),
              Text(
                '${session.score} points · ${session.accuracy}% accuracy',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              Text(
                '${session.correct} correct · ${session.wrong} wrong · ${session.missed} missed · best streak ${session.bestStreak}',
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 20),
              FilledButton(
                focusNode: _replayFocus,
                onPressed: _start,
                child: const Text('Play another 60s Rush'),
              ),
              TextButton(
                onPressed: _exit,
                child: const Text('Back to Practice'),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}
