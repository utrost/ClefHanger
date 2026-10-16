import 'package:flutter/material.dart';
import 'android_audio.dart';
import 'native_core.dart';
import 'pitch_guidance.dart';
import 'reading_lesson_page.dart';
import 'sound_evidence.dart';
import 'sound_session.dart';
import 'sound_demo_page.dart';
import 'staff.dart';
import 'voice_range.dart';
import 'voice_range_page.dart';

class SoundSetupPage extends StatefulWidget {
  const SoundSetupPage({
    super.key,
    required this.core,
    required this.audio,
    required this.skill,
  });
  final PracticeCore core;
  final AudioBridge audio;
  final SoundSkill skill;
  @override
  State<SoundSetupPage> createState() => _SoundSetupPageState();
}

class _SoundSetupPageState extends State<SoundSetupPage> {
  final previous = <SoundInput, SoundEvidence?>{};
  final failed = <SoundInput>{};
  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    for (final input in SoundInput.values) {
      try {
        final raw = await widget.audio.readProgress(
          SoundEvidence.key(widget.skill, input),
        );
        if (mounted) {
          setState(() {
            previous[input] = SoundEvidence.decode(raw, widget.skill, input);
            failed.remove(input);
          });
        }
      } catch (_) {
        if (mounted) setState(() => failed.add(input));
      }
    }
  }

  Future<void> _practice(SoundInput input) async {
    VoiceSetupSelection? selection;
    if (input == SoundInput.voice) {
      selection = await Navigator.of(context).push<VoiceSetupSelection>(
        MaterialPageRoute(
          builder: (_) =>
              VoiceRangePage(core: widget.core, audio: widget.audio),
        ),
      );
      if (!mounted || selection == null) return;
    }
    final demonstrationRequested = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => SoundDemoPage(
          core: widget.core,
          audio: widget.audio,
          skill: widget.skill,
          input: input,
          range: selection?.range ?? VoiceRange.middle,
        ),
      ),
    );
    if (!mounted || demonstrationRequested == null) return;
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => SoundPracticePage(
          core: widget.core,
          audio: widget.audio,
          skill: widget.skill,
          input: input,
          demonstrationRequested: demonstrationRequested,
          voiceRange: selection?.range ?? VoiceRange.middle,
          setupPreviewRequested: selection?.previewRequested ?? false,
        ),
      ),
    );
    if (mounted) await _load();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(widget.skill.label)),
    body: SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text(
            'How will you make the sound?',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 16),
          Text(
            widget.skill == SoundSkill.imitate
                ? 'Hear each note, then match it. Six notes, with one steady second for each match.'
                : 'Read the staff and make the sound. Hear a reference whenever you need it; the result distinguishes matches with and without requesting a reference.',
          ),
          const SizedBox(height: 12),
          const Text(
            'Use a comfortable range. The same note in another octave counts. These exercises check pitch matching, not lasting mastery.',
          ),
          const SizedBox(height: 20),
          for (final input in SoundInput.values) ...[
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: FilledButton.tonal(
                onPressed: () => _practice(input),
                child: Text(
                  input == SoundInput.voice
                      ? 'Use my voice'
                      : 'Use an instrument',
                ),
              ),
            ),
            if (previous[input] != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Text(
                  'Last ${input.label.toLowerCase()} session: ${previous[input]!.matched}/6 matched · ${previous[input]!.withReference} with reference requested · ${previous[input]!.skipped} skipped.',
                ),
              ),
            if (previous[input]?.referenceRange != null)
              Text(
                'Reference level: ${previous[input]!.referenceRange!.label}',
              ),
            if (previous[input]?.setupPreviewRequested == true)
              const Text('A pitch preview was requested before that session.'),
            if (previous[input]?.demonstrationRequested == true)
              const Text(
                'A C → D → E demonstration was requested before that session.',
              ),
            if (failed.contains(input))
              Text(
                'Previous ${input.label.toLowerCase()} result could not be loaded.',
              ),
          ],
          const Text(
            'Instrument: play one note at a time. Chords are not supported here.',
          ),
          const SizedBox(height: 12),
          TextButton(
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) => ReadingLessonPage(
                  core: widget.core,
                  storage: widget.audio,
                  returnLabel: 'Back',
                ),
              ),
            ),
            child: const Text('Read with quiet touch instead'),
          ),
        ],
      ),
    ),
  );
}

class SoundPracticePage extends StatefulWidget {
  const SoundPracticePage({
    super.key,
    required this.core,
    required this.audio,
    required this.skill,
    required this.input,
    this.nowMs,
    this.voiceRange = VoiceRange.middle,
    this.setupPreviewRequested = false,
    this.demonstrationRequested = false,
  });
  final PracticeCore core;
  final AudioBridge audio;
  final SoundSkill skill;
  final SoundInput input;
  final int Function()? nowMs;
  final VoiceRange voiceRange;
  final bool setupPreviewRequested;
  final bool demonstrationRequested;
  @override
  State<SoundPracticePage> createState() => _SoundPracticePageState();
}

class _SoundPracticePageState extends State<SoundPracticePage>
    with WidgetsBindingObserver {
  late final SoundSession sound;
  final scroll = ScrollController();
  bool _finished = false;
  @override
  void initState() {
    super.initState();
    sound = SoundSession(
      core: widget.core,
      audio: widget.audio,
      skill: widget.skill,
      input: widget.input,
      nowMs: widget.nowMs,
      voiceRange: widget.voiceRange,
      setupPreviewRequested: widget.setupPreviewRequested,
      demonstrationRequested: widget.demonstrationRequested,
    )..addListener(_changed);
    WidgetsBinding.instance.addObserver(this);
  }

  void _changed() {
    if (!mounted) return;
    setState(() {});
    if (sound.finished && !_finished) {
      _finished = true;
      if (scroll.hasClients) scroll.jumpTo(0);
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.hidden ||
        state == AppLifecycleState.detached) {
      sound.stop(SoundPhase.paused);
    }
  }

  Future<void> _reading() async {
    await sound.stop();
    if (!mounted) return;
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => ReadingLessonPage(
          core: widget.core,
          storage: widget.audio,
          returnLabel: 'Back',
        ),
      ),
    );
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    sound.removeListener(_changed);
    sound.dispose();
    scroll.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(widget.skill.label)),
    body: SafeArea(
      child: ListView(
        controller: scroll,
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            '${widget.input.label} · same note in any octave',
            style: Theme.of(context).textTheme.titleSmall,
          ),
          const SizedBox(height: 8),
          if (sound.finished) ...[
            Text(
              'Sound session complete',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 16),
            Text(
              '${sound.evidence.matched}/6 matched · ${sound.evidence.skipped} skipped',
            ),
            Text('${sound.withReference} with reference requested'),
            Text(
              '${sound.withoutReference} without an in-session reference request',
            ),
            if (sound.evidence.setupPreviewRequested)
              const Text('A pitch preview was requested before this session.'),
            if (sound.evidence.demonstrationRequested)
              const Text(
                'A C → D → E demonstration was requested before this session.',
              ),
            const SizedBox(height: 16),
            const Text(
              'A match means one held pitch with feedback. It is not a test of note-name recognition or retained learning.',
            ),
            const SizedBox(height: 12),
            if (sound.saving)
              const Text('Saving sound result…')
            else if (sound.storageError != null) ...[
              Text(sound.storageError!),
              TextButton(
                onPressed: sound.save,
                child: const Text('Retry saving sound result'),
              ),
            ] else if (sound.saved)
              const Text('Saved separately for this skill and input.'),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: sound.saving ? null : () => Navigator.pop(context),
              child: const Text('Choose another session'),
            ),
          ] else ...[
            Text(
              'Note ${sound.practice.round!.resolved + (sound.practice.completed ? 0 : 1)}/6',
            ),
            const SizedBox(height: 8),
            if (widget.input == SoundInput.voice)
              Text(
                'Reference ${sound.referenceName} · written ${sound.practice.prompt!.displayName}',
              ),
            PracticeStaff(
              note: sound.practice.prompt,
              instruction: widget.input == SoundInput.instrument
                  ? 'Play one note.'
                  : 'Sing or hum one note.',
              detectedMidi: sound.detectedMidi,
              matchProgress: sound.hold,
              completed: sound.practice.completed,
              height: MediaQuery.sizeOf(context).height < 750
                  ? (widget.input == SoundInput.voice ? 150 : 170)
                  : 220,
            ),
            const SizedBox(height: 12),
            Semantics(
              liveRegion: false,
              child: Text(sound.message, key: const Key('soundStatus')),
            ),
            SizedBox(
              height: 18,
              child: sound.guidance == null
                  ? null
                  : PitchMeter(guidance: sound.guidance!),
            ),
            const SizedBox(height: 8),
            FilledButton(
              onPressed: sound.starting || sound.playing
                  ? null
                  : sound.active
                  ? () => sound.stop()
                  : sound.startMic,
              child: Text(
                sound.starting
                    ? 'Waiting for permission…'
                    : sound.active
                    ? 'Stop microphone'
                    : 'Enable microphone',
              ),
            ),
            OutlinedButton(
              onPressed:
                  sound.starting || sound.playing || sound.practice.completed
                  ? null
                  : sound.hear,
              child: Text(sound.playing ? 'Playing reference…' : 'Hear note'),
            ),
            TextButton(
              onPressed: sound.playing || sound.starting ? null : sound.skip,
              child: Text(
                sound.practice.completed
                    ? 'Next sound note'
                    : 'Skip sound note',
              ),
            ),
            if (sound.phase == SoundPhase.error)
              TextButton(
                onPressed: () async {
                  try {
                    await widget.audio.openSettings();
                  } catch (_) {
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text(
                            'Open Android Settings and check microphone permission.',
                          ),
                        ),
                      );
                    }
                  }
                },
                child: const Text('Open Android settings'),
              ),
            TextButton(
              onPressed: sound.starting ? null : _reading,
              child: const Text('Switch to quiet reading'),
            ),
          ],
        ],
      ),
    ),
  );
}
