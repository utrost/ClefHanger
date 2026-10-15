import 'package:flutter/material.dart';
import 'android_audio.dart';
import 'reading_lesson.dart';

/// Navigation and recommendation only; lesson state remains in each lesson.
class JourneyHome extends StatefulWidget {
  const JourneyHome({
    super.key,
    required this.storage,
    required this.openReading,
    required this.openPractice,
    required this.openRush,
  });
  final AudioBridge storage;
  final Future<void> Function() openReading;
  final Future<void> Function() openPractice;
  final Future<void> Function() openRush;
  @override
  State<JourneyHome> createState() => _JourneyHomeState();
}

class _JourneyHomeState extends State<JourneyHome> {
  ReadingResult? last;
  bool loading = true;
  bool busy = false;
  String? error;
  @override
  void initState() {
    super.initState();
    _refresh();
  }

  Future<void> _refresh() async {
    try {
      final raw = await widget.storage.readProgress(ReadingLesson.storageKey);
      if (mounted) {
        setState(() {
          last = ReadingResult.decode(raw);
          error = null;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(
          () => error =
              'Saved reading result unavailable. You can still practise.',
        );
      }
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> _open(Future<void> Function() destination) async {
    if (busy) return;
    setState(() => busy = true);
    try {
      await destination();
      await _refresh();
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> _sound(bool imitate) async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (context) => Scaffold(
          appBar: AppBar(
            title: Text(imitate ? 'Listen and match' : 'Read and perform'),
          ),
          body: SafeArea(
            child: ListView(
              padding: const EdgeInsets.all(20),
              children: [
                Text(
                  imitate
                      ? 'Connect a sound with your voice or instrument.'
                      : 'Connect the written note with a sound.',
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                const SizedBox(height: 20),
                Text(
                  imitate
                      ? 'In Practice, tap Hear this note. Wait for playback to finish, then sing, hum or play it. The green note shows what the microphone hears. Hold a match for one second.'
                      : 'In Practice, read the black note, then sing or play it. Use Hear this note whenever you need a reference. You do not need absolute pitch; listening is useful practice.',
                ),
                const SizedBox(height: 16),
                const Text(
                  'Use a comfortable range. Octave matching is available in Settings. If you need a quiet exercise, use the reading lesson instead.',
                ),
                const SizedBox(height: 16),
                const Text(
                  'Free Practice totals combine sound and note-button answers. They are not separate reading or singing scores.',
                ),
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: widget.openPractice,
                  child: const Text('Open free Practice'),
                ),
                TextButton(
                  onPressed: widget.openReading,
                  child: const Text('Read with quiet touch instead'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text('ClefHanger', style: Theme.of(context).textTheme.headlineLarge),
          const SizedBox(height: 8),
          const Text('A few notes. One clear next step.'),
          const SizedBox(height: 24),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    last == null
                        ? 'Start with reading'
                        : 'Your next reading session',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    last == null
                        ? 'Learn to recognise C, D and E on the staff. No microphone needed.'
                        : last!.review.isNotEmpty
                        ? 'Revisit ${last!.review.join(', ')} and check the three positions again.'
                        : 'Try C, D and E again to see what you remember. One successful round is a beginning.',
                  ),
                  if (last != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Text(
                        'Last reading check: ${last!.independent}/3 first answers without help.',
                      ),
                    ),
                  if (error != null) Text(error!),
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: busy || loading
                        ? null
                        : () => _open(widget.openReading),
                    child: Text(
                      loading
                          ? 'Loading…'
                          : last == null
                          ? 'Start reading lesson'
                          : 'Practise reading again',
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),
          Text(
            'Connect notes with sound',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 8),
          Card(
            child: ListTile(
              title: const Text('Listen and match'),
              subtitle: const Text('Hear a reference, then sing or play it.'),
              trailing: const Icon(Icons.chevron_right),
              onTap: busy ? null : () => _open(() => _sound(true)),
            ),
          ),
          Card(
            child: ListTile(
              title: const Text('Read and perform'),
              subtitle: const Text('Read the staff, then make the sound.'),
              trailing: const Icon(Icons.chevron_right),
              onTap: busy ? null : () => _open(() => _sound(false)),
            ),
          ),
          const SizedBox(height: 20),
          Text('Explore', style: Theme.of(context).textTheme.titleMedium),
          TextButton(
            onPressed: busy ? null : () => _open(widget.openPractice),
            child: const Text('Free Practice and settings'),
          ),
          TextButton(
            onPressed: busy ? null : () => _open(widget.openRush),
            child: const Text('Optional Rush challenge'),
          ),
        ],
      ),
    ),
  );
}
