import 'package:flutter/material.dart';
import 'android_audio.dart';
import 'native_core.dart';
import 'sound_evidence.dart';
import 'staff.dart';
import 'voice_range.dart';

/// A teaching preview, never a scored attempt or proof of successful listening.
class SoundDemoPage extends StatefulWidget {
  const SoundDemoPage({
    super.key,
    required this.core,
    required this.audio,
    required this.skill,
    required this.input,
    required this.range,
  });
  final PracticeCore core;
  final AudioBridge audio;
  final SoundSkill skill;
  final SoundInput input;
  final VoiceRange range;
  @override
  State<SoundDemoPage> createState() => _SoundDemoPageState();
}

class _SoundDemoPageState extends State<SoundDemoPage>
    with WidgetsBindingObserver {
  static const notes = [
    NativeNote(id: 0, midi: 60, staffStep: -2),
    NativeNote(id: 1, midi: 62, staffStep: -1),
    NativeNote(id: 2, midi: 64, staffStep: 0),
  ];
  static const positions = [
    'C: the short line below the staff',
    'D: the space just below the staff',
    'E: the bottom line',
  ];
  int index = 0, generation = 0;
  bool playing = false, requested = false;
  String? message;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  Future<void> _stopPlayback() async {
    generation++;
    setState(() {
      playing = false;
      message = 'Playback stopped. Replay when ready.';
    });
    try {
      await widget.audio.stopPlayback();
    } catch (_) {
      if (mounted) {
        setState(() => message = 'Could not stop playback. Try again.');
      }
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.hidden ||
        state == AppLifecycleState.detached) {
      if (playing) {
        _stopPlayback();
        setState(
          () => message = 'Demonstration interrupted. Replay when ready.',
        );
      }
    }
  }

  Future<void> _play() async {
    if (playing) return;
    final token = ++generation;
    setState(() {
      playing = true;
      requested = true;
      message = null;
    });
    try {
      for (var next = 0; next < notes.length; next++) {
        if (!mounted || generation != token) return;
        setState(() => index = next);
        await WidgetsBinding.instance.endOfFrame;
        if (!mounted || generation != token) return;
        await widget.audio.playTone(
          widget.core.frequency(
            notes[next].midi +
                (widget.input == SoundInput.voice ? widget.range.semitones : 0),
          ),
        );
      }
      if (mounted && generation == token) {
        setState(
          () => message =
              'C to D, then D to E: two steps upward. Try humming or playing them back gently.',
        );
      }
    } catch (_) {
      if (mounted && generation == token) {
        setState(
          () => message =
              'Demonstration could not play. Try again or continue; Hear note is available in practice.',
        );
      }
    } finally {
      if (mounted && token == generation) setState(() => playing = false);
    }
  }

  @override
  void dispose() {
    generation++;
    if (playing) widget.audio.stopPlayback().catchError((Object _) {});
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => PopScope(
    canPop: true,
    child: Scaffold(
      appBar: AppBar(title: const Text('See and hear the steps')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text(
              widget.skill == SoundSkill.imitate
                  ? 'Listen first, then match'
                  : 'Read a note, then find its sound',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 12),
            const Text(
              'C → D → E moves up one staff position at a time: line, space, line. Each move is one step to the next note name; here each step is a whole tone.',
            ),
            PracticeStaff(
              note: notes[index],
              height: 150,
              instruction: positions[index],
            ),
            Semantics(liveRegion: true, child: Text(positions[index])),
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: playing ? null : _play,
              child: Text(playing ? 'Playing C → D → E…' : 'Hear C → D → E'),
            ),
            if (playing)
              TextButton(
                onPressed: _stopPlayback,
                child: const Text('Stop playback'),
              ),
            if (message != null)
              Semantics(liveRegion: true, child: Text(message!)),
            const SizedBox(height: 12),
            Text(
              widget.skill == SoundSkill.imitate
                  ? 'In Listen and match, hear each target first. Then sing or play that same note steadily for about a second.'
                  : 'In Read and perform, use the staff to identify C, D or E. Hear note gives you a reference whenever you need one. You do not need to remember a pitch from silence or have absolute pitch.',
            ),
            const SizedBox(height: 12),
            Text(
              widget.input == SoundInput.voice
                  ? 'The demonstration uses your ${widget.range.label.toLowerCase()} reference level. The staff keeps its written octave. The same note in another octave counts.'
                  : 'Play one note at a time. The same note in another octave counts.',
            ),
            const SizedBox(height: 12),
            const Text(
              'The microphone stays off here. A demonstration request will be noted in your session result, even if playback is interrupted.',
            ),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: playing
                  ? null
                  : () => Navigator.pop(context, requested),
              child: const Text('Start sound practice'),
            ),
          ],
        ),
      ),
    ),
  );
}
