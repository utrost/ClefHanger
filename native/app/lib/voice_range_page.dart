import 'package:flutter/material.dart';
import 'android_audio.dart';
import 'native_core.dart';
import 'voice_range.dart';

class VoiceRangePage extends StatefulWidget {
  const VoiceRangePage({super.key, required this.core, required this.audio});
  final PracticeCore core;
  final AudioBridge audio;
  @override
  State<VoiceRangePage> createState() => _VoiceRangePageState();
}

class _VoiceRangePageState extends State<VoiceRangePage>
    with WidgetsBindingObserver {
  VoiceRange range = VoiceRange.middle;
  bool loading = true,
      playing = false,
      saving = false,
      previewRequested = false;
  bool saveFailed = false;
  int generation = 0;
  String? message;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _load();
  }

  Future<void> _load() async {
    try {
      final raw = await widget.audio.readProgress(voiceRangeKey);
      if (mounted) setState(() => range = decodeVoiceRange(raw));
    } catch (_) {
      if (mounted) {
        setState(
          () => message = 'Saved pitch level unavailable. Choose one below.',
        );
      }
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.hidden ||
        state == AppLifecycleState.detached) {
      generation++;
      if (playing) {
        setState(() => message = 'Preview interrupted. Try again when ready.');
      }
    }
  }

  Future<void> _preview() async {
    if (playing || loading || saving) return;
    final token = ++generation;
    final selected = range;
    setState(() {
      playing = true;
      previewRequested = true;
      message = null;
    });
    try {
      for (final midi in [60, 64]) {
        if (!mounted || token != generation) return;
        await widget.audio.playTone(
          widget.core.frequency(midi + selected.semitones),
        );
      }
      if (mounted && token == generation) {
        setState(
          () => message =
              'Now hum C and E back gently. Choose another level if either feels uncomfortable.',
        );
      }
    } catch (_) {
      if (mounted && token == generation) {
        setState(
          () => message =
              'Preview could not play. Try again or choose a level without previewing.',
        );
      }
    } finally {
      if (mounted) setState(() => playing = false);
    }
  }

  Future<void> _use() async {
    setState(() {
      saving = true;
      saveFailed = false;
      message = null;
    });
    try {
      await widget.audio.writeProgress(voiceRangeKey, range.encode());
      if (mounted) {
        Navigator.pop(
          context,
          VoiceSetupSelection(range, previewRequested: previewRequested),
        );
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          saveFailed = true;
          message =
              'Pitch level could not be saved. Retry or use it for this session only.';
        });
      }
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  @override
  void dispose() {
    generation++;
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => PopScope(
    canPop: !playing && !saving,
    child: Scaffold(
      appBar: AppBar(title: const Text('Comfortable pitch')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Text(
              'Find a comfortable pitch level',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 12),
            const Text(
              'Hear C and E, then hum them back gently. Choose the level that feels easy. This is your choice, not an automatic measurement of your vocal range.',
            ),
            const SizedBox(height: 16),
            for (final option in VoiceRange.values)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: ChoiceChip(
                  label: Text(option.label),
                  selected: option == range,
                  onSelected: loading || playing || saving
                      ? null
                      : (_) => setState(() {
                          range = option;
                          saveFailed = false;
                          message = null;
                        }),
                ),
              ),
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: loading || playing || saving ? null : _preview,
              child: Text(playing ? 'Playing C and E…' : 'Preview C and E'),
            ),
            if (message != null)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: Semantics(liveRegion: true, child: Text(message!)),
              ),
            const SizedBox(height: 12),
            const Text(
              'The black staff note stays in its written octave. The reference sound moves to your chosen level. The green note stays near the target; the Mic label shows your actual octave.',
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: loading || playing || saving ? null : _use,
              child: Text(
                loading
                    ? 'Loading…'
                    : saving
                    ? 'Saving…'
                    : 'Use this pitch level',
              ),
            ),
            if (saveFailed)
              TextButton(
                onPressed: saving || playing
                    ? null
                    : () => Navigator.pop(
                        context,
                        VoiceSetupSelection(
                          range,
                          previewRequested: previewRequested,
                        ),
                      ),
                child: const Text('Use once without saving'),
              ),
            const Text(
              'Microphone stays off during setup. You can sing the same note in another octave during practice.',
            ),
          ],
        ),
      ),
    ),
  );
}
