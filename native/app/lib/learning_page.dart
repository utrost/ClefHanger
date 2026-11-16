import 'dart:async';
import 'package:flutter/material.dart';
import 'android_audio.dart';
import 'learning_session.dart';
import 'native_core.dart';
import 'sound_evidence.dart';
import 'sound_session.dart';
import 'staff.dart';
import 'voice_range.dart';
import 'voice_range_page.dart';

class LearningHub extends StatefulWidget {
  const LearningHub({super.key, required this.core, required this.audio});
  final PracticeCore core;
  final AudioBridge audio;
  @override
  State<LearningHub> createState() => _LearningHubState();
}

class _LearningHubState extends State<LearningHub> {
  List<LearningRecord> records = [];
  String? error;
  bool busy = false;
  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final next = await LearningHistory(widget.audio).load();
      if (mounted) {
        setState(() {
          records = next;
          error = null;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          records = [];
          error =
              'Learning history unavailable. Stored results have been preserved; you can still practise.';
        });
      }
    }
  }

  Future<void> _open(
    LearningTask task,
    String input, {
    bool review = false,
  }) async {
    if (busy) return;
    setState(() => busy = true);
    try {
      VoiceSetupSelection? voice;
      if (input == 'voice') {
        voice = await Navigator.of(context).push<VoiceSetupSelection>(
          MaterialPageRoute(
            builder: (_) =>
                VoiceRangePage(core: widget.core, audio: widget.audio),
          ),
        );
        if (!mounted || voice == null) return;
      }
      if (!mounted) return;
      await Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => LearningPage(
            core: widget.core,
            audio: widget.audio,
            task: task,
            input: input,
            voice: voice,
            review: review,
          ),
        ),
      );
      if (mounted) await _load();
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Connect notes and sound')),
    body: SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text(
            'Learn repeat, up and down first. Then find a neighbour from a starting note. Choose any lesson; there are no score locks.',
          ),
          if (error != null) ...[
            Text(error!),
            TextButton(
              onPressed: busy ? null : _load,
              child: const Text('Retry loading history'),
            ),
          ],
          for (final task in LearningTask.values) ...[
            const SizedBox(height: 16),
            Text(task.title, style: Theme.of(context).textTheme.titleLarge),
            Text(task.objective),
            for (final input
                in task == LearningTask.direction
                    ? ['listening']
                    : ['voice', 'instrument']) ...[
              FilledButton.tonal(
                onPressed: busy ? null : () => _open(task, input),
                child: Text('${task.title} · $input'),
              ),
              ..._previous(task, input),
            ],
          ],
          const SizedBox(height: 16),
          const Text(
            'History contains up to 60 completed learning checks. Older Practice totals stay separate. No audio recordings are stored.',
          ),
        ],
      ),
    ),
  );
  List<Widget> _previous(LearningTask task, String input) {
    final relevant = records
        .where((r) => r.task == task && r.input == input)
        .toList();
    if (relevant.isEmpty) return [];
    final last = relevant.last;
    final wrong = last.attempts
        .where(
          (a) =>
              a['firstResponse'] != null &&
              a['firstResponse'] !=
                  (a['anchor'] == a['target']
                      ? 'Repeat'
                      : (a['target'] as int) > (a['anchor'] as int)
                      ? 'Up'
                      : 'Down'),
        )
        .toList();
    return [
      Text('Last $input check: ${last.summary}'),
      Text(last.context),
      if (task == LearningTask.direction && wrong.isNotEmpty)
        Text(
          'Review ${wrong.map((a) => a['anchor'] == a['target']
              ? 'repeat'
              : (a['target'] as int) > (a['anchor'] as int)
              ? 'up'
              : 'down').toSet().join(' and ')}: your last check included a different first direction choice.',
        ),
      Text(reviewInvitation(records, last, DateTime.now())),
      TextButton(
        onPressed: busy ? null : () => _open(task, input, review: true),
        child: Text('Return check · ${task.title} · $input'),
      ),
    ];
  }
}

class LearningPage extends StatefulWidget {
  const LearningPage({
    super.key,
    required this.core,
    required this.audio,
    required this.task,
    required this.input,
    this.voice,
    this.review = false,
    this.nowMs,
  });
  final PracticeCore core;
  final AudioBridge audio;
  final LearningTask task;
  final String input;
  final VoiceSetupSelection? voice;
  final bool review;
  final int Function()? nowMs;
  @override
  State<LearningPage> createState() => _LearningPageState();
}

class _LearningPageState extends State<LearningPage>
    with WidgetsBindingObserver {
  late LearningSession session;
  SoundSession? sound;
  final scroll = ScrollController();
  bool started = false,
      supported = false,
      playing = false,
      heard = false,
      saving = false,
      saved = false,
      teaching = false,
      supportUsed = false,
      transitioning = false;
  String? message, saveError;
  int generation = 0;
  int demoMidi = 60;
  static const examples = [
    [60, 60],
    [60, 62],
    [62, 60],
  ];
  int get offset =>
      widget.input == 'voice' ? (widget.voice?.range.semitones ?? 0) : 0;
  bool get done =>
      session.finished || (supported && session.attempts.length >= 2);
  @override
  void initState() {
    super.initState();
    _reset();
    WidgetsBinding.instance.addObserver(this);
  }

  void _reset() {
    session = LearningSession(
      task: widget.task,
      input: widget.input,
      voiceOffset: offset,
      setupPreview: widget.voice?.previewRequested ?? false,
      review: widget.review,
    );
    session.teachingRequested = teaching;
    session.supportedPractice = supportUsed;
  }

  NativeNote note(int midi) => NativeNote(
    id: midi,
    midi: midi,
    staffStep: {60: -2, 62: -1, 64: 0}[midi]!,
  );
  Future<void> _cancel() async {
    if (transitioning) return;
    setState(() => transitioning = true);
    generation++;
    playing = false;
    heard = false;
    await sound?.stop(SoundPhase.paused);
    try {
      await widget.audio.stopPlayback();
    } catch (_) {}
    if (mounted) {
      setState(() {
        transitioning = false;
        message = 'Paused. Replay the starting sound when ready.';
      });
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.hidden ||
        state == AppLifecycleState.detached) {
      _cancel();
    }
  }

  void _begin({required bool support}) {
    generation++;
    sound?.removeListener(_changed);
    sound?.dispose();
    sound = null;
    _reset();
    supported = support;
    if (support) {
      supportUsed = true;
      session.supportedPractice = true;
    }
    started = true;
    saved = false;
    saveError = null;
    message = null;
    heard = false;
    _prepare();
    setState(() {});
    if (scroll.hasClients) scroll.jumpTo(0);
  }

  void _prepare() {
    if (widget.task == LearningTask.direction || done) return;
    sound = SoundSession(
      core: widget.core,
      audio: widget.audio,
      skill: SoundSkill.perform,
      input: widget.input == 'voice' ? SoundInput.voice : SoundInput.instrument,
      voiceRange: widget.voice?.range ?? VoiceRange.middle,
      automaticAdvance: false,
      initialPrompt: note(session.current.prompt.target),
      nowMs: widget.nowMs,
    )..addListener(_changed);
  }

  void _changed() {
    if (!mounted) return;
    if (sound!.practice.completed && !session.current.resolved) {
      session.answer('matched');
      message = session.current.targetRequested
          ? 'Matched after hearing the target.'
          : 'Found ${learningNoteName(session.current.prompt.target)} from ${learningNoteName(session.current.prompt.anchor)}.';
    }
    setState(() {});
  }

  Future<void> _play(List<int> midis, {bool demo = false}) async {
    if (playing || sound?.playing == true) return;
    final token = ++generation;
    setState(() {
      playing = true;
      heard = false;
      message = null;
      if (demo) {
        teaching = true;
        session.teachingRequested = true;
      } else {
        session.current.anchorRequested = true;
      }
    });
    try {
      for (final midi in midis) {
        if (!mounted || token != generation) return;
        if (demo) {
          setState(() => demoMidi = midi);
          await WidgetsBinding.instance.endOfFrame;
          if (!mounted || token != generation) return;
        }
        await widget.audio.playTone(widget.core.frequency(midi + offset));
      }
      if (mounted && token == generation) {
        setState(() {
          heard = true;
          message = demo
              ? 'Try with support, or begin the check when ready.'
              : 'Now choose the direction.';
        });
      }
    } catch (_) {
      if (mounted && token == generation) {
        setState(
          () => message =
              'Sound could not play. Replay or skip; no answer has been scored.',
        );
      }
    } finally {
      if (mounted && token == generation) setState(() => playing = false);
    }
  }

  Future<void> _anchor() async {
    session.current.anchorRequested = true;
    heard = false;
    final token = generation;
    await sound!.hear(anchorMidi: session.current.prompt.anchor + offset);
    if (mounted && token == generation) {
      setState(() => heard = sound!.error == null);
    }
  }

  Future<void> _target() async {
    session.current.targetRequested = true;
    await sound!.hear();
  }

  void _answer(String answer) {
    if (!heard || playing || session.current.resolved) return;
    final correct = session.answer(answer);
    setState(
      () => message = correct
          ? 'Direction matched.'
          : 'Try again: listen for whether the second note repeats, rises or falls.',
    );
  }

  Future<void> _next({bool skip = false}) async {
    if (transitioning ||
        done ||
        playing ||
        sound?.playing == true ||
        sound?.starting == true) {
      return;
    }
    if (skip) session.skip();
    if (!session.current.resolved) return;
    setState(() => transitioning = true);
    generation++;
    sound?.removeListener(_changed);
    await sound?.stop();
    sound?.dispose();
    sound = null;
    session.next(DateTime.now());
    heard = false;
    message = null;
    if (!mounted) return;
    if (!done) _prepare();
    setState(() => transitioning = false);
    if (scroll.hasClients) scroll.jumpTo(0);
    if (session.finished && !supported) await _save();
  }

  Future<void> _save() async {
    if (saving || !session.finished || supported) return;
    setState(() {
      saving = true;
      saveError = null;
    });
    try {
      await LearningHistory(widget.audio).save(session);
      if (mounted) setState(() => saved = true);
    } catch (_) {
      if (mounted) {
        setState(
          () => saveError =
              'Check not saved. Stored history was preserved. Retry when ready.',
        );
      }
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  @override
  void dispose() {
    generation++;
    sound?.removeListener(_changed);
    sound?.dispose();
    if (playing) widget.audio.stopPlayback().catchError((Object _) {});
    WidgetsBinding.instance.removeObserver(this);
    scroll.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final locked =
        transitioning ||
        playing ||
        sound?.playing == true ||
        sound?.starting == true;
    return Scaffold(
      appBar: AppBar(title: Text(widget.task.title)),
      body: SafeArea(
        child: ListView(
          controller: scroll,
          padding: const EdgeInsets.all(16),
          children: [
            if (!started) ...[
              Text(
                widget.task.objective,
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 12),
              Text(
                widget.review
                    ? 'Try a return check before replaying teaching, or use support whenever you want.'
                    : 'See an example, try two supported prompts, then try a short check in a fresh order.',
              ),
              if (widget.task == LearningTask.direction) ...[
                PracticeStaff(
                  note: note(demoMidi),
                  revealAnswer: true,
                  height: 160,
                ),
                const Text(
                  'Repeat means the same pitch. Up means the second pitch is higher; Down means it is lower. C–D and D–E are adjacent staff steps and whole tones here; other adjacent notes can have different distances.',
                ),
                for (var i = 0; i < 3; i++)
                  TextButton(
                    onPressed: locked
                        ? null
                        : () {
                            _play(examples[i], demo: true);
                          },
                    child: Text(
                      [
                        'Hear C → C: repeat',
                        'Hear C → D: up',
                        'Hear D → C: down',
                      ][i],
                    ),
                  ),
              ] else ...[
                PracticeStaff(
                  note: note(demoMidi),
                  revealAnswer: true,
                  height: 160,
                ),
                const Text(
                  'C sits on the short line below the staff. D is the space just above C; E is the bottom line. C to D and D to E are whole-tone steps here. Down reverses the movement.',
                ),
                OutlinedButton(
                  onPressed: locked
                      ? null
                      : () => _play(
                          widget.task == LearningTask.pattern
                              ? [60, 62, 64]
                              : [60, 62],
                          demo: true,
                        ),
                  child: Text(
                    widget.task == LearningTask.pattern
                        ? 'Hear C → D → E'
                        : 'Hear C, then its neighbour D',
                  ),
                ),
                OutlinedButton(
                  onPressed: locked
                      ? null
                      : () => _play(
                          widget.task == LearningTask.pattern
                              ? [64, 62, 60]
                              : [62, 60],
                          demo: true,
                        ),
                  child: const Text('Hear the downward example'),
                ),
              ],
              if (message != null) Text(message!),
              if (playing)
                TextButton(
                  onPressed: _cancel,
                  child: const Text('Stop playback'),
                ),
              const Text(
                'Microphone starts only when you enable it. Starting references are allowed. Hearing the target is help, not a failure. The same note in another octave counts. With a screen reader, use earphones to reduce speech entering the microphone.',
              ),
              FilledButton(
                onPressed: locked ? null : () => _begin(support: true),
                child: const Text('Try with support'),
              ),
              TextButton(
                onPressed: locked ? null : () => _begin(support: false),
                child: Text(
                  widget.review ? 'Begin return check' : 'Begin check',
                ),
              ),
            ] else if (done) ...[
              Text(
                supported
                    ? 'Supported practice complete'
                    : 'Learning check complete',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              if (!supported) ...[
                Text(LearningRecord.parse(session.toJson()).summary),
                Text(LearningRecord.parse(session.toJson()).context),
                const Text(
                  'Try a fresh order another time. These results measure this task and input, not fluent sight-singing or lasting mastery.',
                ),
                if (saving) const Text('Saving check…'),
                if (saved) const Text('Check saved on this device.'),
                if (saveError != null) ...[
                  Text(saveError!),
                  TextButton(
                    onPressed: saving ? null : _save,
                    child: const Text('Retry saving check'),
                  ),
                ],
              ],
              if (supported)
                FilledButton(
                  onPressed: () => _begin(support: false),
                  child: const Text('Begin check'),
                ),
              TextButton(
                onPressed: saving ? null : () => Navigator.pop(context),
                child: const Text('Back to learning'),
              ),
            ] else ...[
              Text(
                '${supported ? 'Supported prompt' : 'Check'} ${session.attempts.length + 1}/${supported ? 2 : session.prompts.length} · ${widget.input}',
              ),
              if (widget.task == LearningTask.direction) ...[
                const Text(
                  'Listen before choosing. Is the second note the same, higher or lower?',
                ),
                OutlinedButton(
                  onPressed: locked || session.current.resolved
                      ? null
                      : () => _play([
                          session.current.prompt.anchor,
                          session.current.prompt.target,
                        ]),
                  child: const Text('Hear the pair'),
                ),
                if (supported)
                  Text(
                    'This pair goes ${session.current.prompt.direction.toLowerCase()}.',
                  ),
                for (final choice in ['Repeat', 'Up', 'Down'])
                  FilledButton.tonal(
                    onPressed: !heard || locked || session.current.resolved
                        ? null
                        : () => _answer(choice),
                    child: Text(choice),
                  ),
                TextButton(
                  onPressed: locked || session.current.resolved
                      ? null
                      : () {
                          setState(() {
                            session.current.hintRequested = true;
                            message =
                                'The answer is ${session.current.prompt.direction.toLowerCase()}.';
                          });
                        },
                  child: const Text('Show direction hint'),
                ),
              ] else ...[
                if (session.current.prompt.pattern != null)
                  Text(
                    supported
                        ? 'Pattern: ${session.current.prompt.pattern} · step ${session.current.prompt.step}/2'
                        : 'Pattern ${session.attempts.length ~/ 2 + 1} · step ${session.current.prompt.step}/2',
                  ),
                Text(
                  'Starting note: ${learningNoteName(session.current.prompt.anchor)} · reference octave ${offset == 0
                      ? 'as written'
                      : offset < 0
                      ? 'lower'
                      : 'higher'}',
                ),
                PracticeStaff(
                  note: note(session.current.prompt.target),
                  height: 160,
                  revealAnswer: supported,
                  detectedMidi: sound?.detectedMidi,
                  describeDetectedPitch: false,
                  matchProgress: sound?.hold ?? 0,
                  completed: session.current.completed,
                  instruction: 'Find this note from the starting reference.',
                ),
                if (supported)
                  Text(
                    'Move ${session.current.prompt.direction.toLowerCase()} one staff position; use Hear target whenever needed.',
                  ),
                OutlinedButton(
                  onPressed: locked || session.current.resolved
                      ? null
                      : _anchor,
                  child: const Text('Hear starting note'),
                ),
                OutlinedButton(
                  onPressed: locked || session.current.resolved
                      ? null
                      : _target,
                  child: const Text('Hear target'),
                ),
                FilledButton(
                  onPressed: locked || session.current.resolved
                      ? null
                      : sound!.active
                      ? () => sound!.stop()
                      : heard
                      ? sound!.startMic
                      : null,
                  child: Text(
                    sound!.active ? 'Stop microphone' : 'Enable microphone',
                  ),
                ),
                Semantics(
                  liveRegion: !sound!.active && !sound!.playing,
                  child: Text(sound!.message),
                ),
                if (sound!.phase == SoundPhase.error)
                  TextButton(
                    onPressed: () async {
                      try {
                        await widget.audio.openSettings();
                      } catch (_) {
                        if (mounted) {
                          setState(
                            () => message =
                                'Open Android Settings to check microphone permission.',
                          );
                        }
                      }
                    },
                    child: const Text('Open Android settings'),
                  ),
              ],
              if (message != null)
                Semantics(
                  liveRegion: sound?.active != true && !locked,
                  child: Text(message!),
                ),
              if (locked)
                TextButton(
                  onPressed: _cancel,
                  child: const Text('Stop playback and capture'),
                ),
              if (session.current.resolved)
                FilledButton(
                  onPressed: locked ? null : () => _next(),
                  child: const Text('Next learning prompt'),
                )
              else
                TextButton(
                  onPressed: locked ? null : () => _next(skip: true),
                  child: const Text('Skip learning prompt'),
                ),
            ],
          ],
        ),
      ),
    );
  }
}
