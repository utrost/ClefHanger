import 'package:flutter/material.dart';
import 'android_audio.dart';
import 'reading_lesson.dart';
import 'sound_evidence.dart';
import 'session_guidance.dart';
import 'learning_session.dart';

/// Navigation and recommendation only; lesson state remains in each lesson.
class JourneyHome extends StatefulWidget {
  const JourneyHome({
    super.key,
    required this.storage,
    required this.openReading,
    required this.openPractice,
    required this.openRush,
    required this.openSound,
    this.openLearning,
  });
  final AudioBridge storage;
  final Future<void> Function()? openLearning;
  final Future<void> Function() openReading;
  final Future<void> Function() openPractice;
  final Future<void> Function() openRush;
  final Future<void> Function(SoundSkill skill) openSound;
  @override
  State<JourneyHome> createState() => _JourneyHomeState();
}

class _JourneyHomeState extends State<JourneyHome> {
  ReadingResult? last;
  bool loading = true;
  bool busy = false;
  String? error, learningReason;
  bool get recommendLearning =>
      widget.openLearning != null &&
      learningReason != null &&
      last?.independent == 3 &&
      last!.review.isEmpty;
  @override
  void initState() {
    super.initState();
    _refresh();
  }

  Future<void> _refresh() async {
    ReadingResult? reading;
    String? failure, reason;
    try {
      reading = ReadingResult.decode(
        await widget.storage.readProgress(ReadingLesson.storageKey),
      );
    } catch (_) {
      failure = 'Saved reading result unavailable. You can still practise.';
    }
    if (widget.openLearning != null) {
      try {
        final history = await LearningHistory(widget.storage).load();
        if (history.isNotEmpty) {
          final latest = history.last;
          reason =
              'Last ${latest.task.title.toLowerCase()} check (${latest.input}): ${latest.summary}. Choose a repeat or a return check with the same input.';
        } else {
          final matchedInputs = <String>[];
          for (final input in SoundInput.values) {
            final evidence = SoundEvidence.decode(
              await widget.storage.readProgress(
                SoundEvidence.key(SoundSkill.imitate, input),
              ),
              SoundSkill.imitate,
              input,
            );
            if (evidence?.matched == 6) {
              matchedInputs.add(input.label.toLowerCase());
            }
          }
          if (matchedInputs.isNotEmpty) {
            reason =
                'You matched six references with ${matchedInputs.join(' and ')}. Learn repeat, up and down next, then find a neighbour from a starting reference.';
          }
        }
      } catch (_) {
        failure = [
          if (failure != null) failure,
          'Learning history unavailable. You can still choose a lesson.',
        ].join(' ');
      }
    }
    if (mounted) {
      setState(() {
        last = reading;
        error = failure;
        learningReason = reason;
        loading = false;
      });
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
                    recommendLearning
                        ? 'Your next relationship lesson'
                        : SessionGuidance.reading(last).title,
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    recommendLearning
                        ? learningReason!
                        : SessionGuidance.reading(last).reason,
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
                        : () => _open(
                            recommendLearning
                                ? widget.openLearning!
                                : SessionGuidance.reading(last).soundSkill ==
                                      null
                                ? widget.openReading
                                : () => widget.openSound(
                                    SessionGuidance.reading(last).soundSkill!,
                                  ),
                          ),
                    child: Text(
                      loading
                          ? 'Loading…'
                          : recommendLearning
                          ? 'Choose a relationship lesson'
                          : SessionGuidance.reading(last).action,
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (SessionGuidance.reading(last).soundSkill != null)
            TextButton(
              onPressed: busy ? null : () => _open(widget.openReading),
              child: const Text('Practise reading again'),
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
              onTap: busy
                  ? null
                  : () => _open(() => widget.openSound(SoundSkill.imitate)),
            ),
          ),
          Card(
            child: ListTile(
              title: const Text('Read and perform'),
              subtitle: const Text('Read the staff, then make the sound.'),
              trailing: const Icon(Icons.chevron_right),
              onTap: busy
                  ? null
                  : () => _open(() => widget.openSound(SoundSkill.perform)),
            ),
          ),
          const SizedBox(height: 20),
          if (widget.openLearning != null)
            Card(
              child: ListTile(
                title: const Text('Learn relationships and patterns'),
                subtitle: const Text(
                  'Repeat, up or down; find a neighbour; return for a fresh check.',
                ),
                trailing: const Icon(Icons.chevron_right),
                onTap: busy ? null : () => _open(widget.openLearning!),
              ),
            ),
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
